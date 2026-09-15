// ---------------------------------------------------------------------------
// MEDIDOR DE PRESSÃO — o campo aperta o jogador, ou deixa ele confortável?
//
// Nasceu do feedback do Allan em 15/09/2026:
//   *"Sabe aquela sensação de não ser pressionado em nenhum momento? Então, é
//    essa que estou tendo. Achando muito fácil disputar o torneio. Até agora
//    não tive nenhuma situação de fazer eu pensar por muito tempo."*
//
// "Difícil" é palavra escorregadia. Aqui ela vira número: PRESSÃO é a frequência
// com que o campo obriga o jogador a decidir gastando fichas ou largando mão
// boa. São coisas mensuráveis, uma a uma:
//
//   - 3-bet contra a abertura dele (o spot que mais dói no pré-flop);
//   - c-bet no flop quando ele pagou a abertura;
//   - aposta no turn e no river (barrel — onde o pote já está grande);
//   - check-raise (a jogada que mais tira o chão);
//   - all-in enfrentado;
//   - e o que o Allan chamou de "pensar por muito tempo": SPOT APERTADO, a
//     decisão em que pagar e largar valem quase a mesma coisa (|EV| <= 1bb) ou
//     em que a equity encosta no preço (diferença <= 5 pontos).
//
// O herói é jogado pelo PRÓPRIO PADRÃO do app (computeHeroAdvice), não por uma
// política inventada: assim o que estamos medindo é o campo, não o jogador.
// ---------------------------------------------------------------------------

import { GameController } from "../app/gameController";
import type { Stage } from "./../tournament/structure";
import { rankOf, seededRng, type Card } from "../engine/cards";
import type { Action } from "../game/engine";

export interface PressaoResultado {
  buyIn: number;
  torneios: number;
  maos: number;
  /** Decisões do herói avaliadas. */
  decisoes: number;

  /** Aberturas do herói no pré-flop e quantas levaram 3-bet. */
  aberturas: number;
  tresBetSofridos: number;
  /** Flops vistos em pote disputado e quantos vieram com aposta contra ele. */
  flopsDisputados: number;
  cbetsSofridos: number;
  /** Apostas enfrentadas por rua. */
  apostasFlop: number;
  apostasTurn: number;
  apostasRiver: number;
  /** Jogadas que tiram o chão. */
  checkRaisesSofridos: number;
  /** Ruas em que o herói PASSOU — denominador certo do check-raise. */
  ruasEmQuePassou: number;
  allinsEnfrentados: number;

  /** Decisões apertadas de verdade (o "pensar por muito tempo"). */
  spotsApertados: number;
  /** Ruas pós-flop em que ele chegou e NINGUÉM pediu fichas (carta de graça). */
  ruasDeGraca: number;
  /** Total de ruas pós-flop em que ele teve vez. */
  ruasPosFlop: number;

  /**
   * QUANDO O BOT APOSTA, ELE TEM MÃO?
   *
   * É o outro lado da pressão. Um campo que só aposta com mão feita é
   * confortável: basta largar quando ele aposta. Um campo que aposta às vezes
   * sem nada obriga a pensar. Medimos olhando as cartas do agressor (que o
   * jogador nunca vê) no momento em que ele coloca fichas contra o herói.
   */
  apostasDeVilao: number;
  /** Dessas, quantas com par feito ou melhor (2 cartas do board pareadas ou par na mão). */
  apostasComMaoFeita: number;

  /** Posições finais dos torneios (1 = campeão). */
  posicoes: number[];
  /** Quantos terminaram na faixa premiada. */
  itm: number;
}

export interface PressaoTaxas {
  /** % das aberturas do herói que levaram 3-bet. */
  tresBetContraAbertura: number;
  /** % dos flops disputados em que ele levou aposta. */
  cbetContraEle: number;
  /** Apostas enfrentadas a cada 100 mãos, por rua. */
  apostasPor100: { flop: number; turn: number; river: number };
  /** Check-raises e all-ins a cada 100 mãos. */
  checkRaisePor100: number;
  /** % das vezes que ele passou e levou aumento — a métrica de verdade. */
  checkRaiseSofridoPct: number;
  allinPor100: number;
  /** % das decisões que foram apertadas de verdade. */
  spotsApertadosPct: number;
  /** % das ruas pós-flop em que ele viu carta de graça. */
  cartaDeGracaPct: number;
  /** % das apostas de vilão contra ele que vinham com par ou melhor. */
  apostaComMaoPct: number;
  /** % de torneios terminados na faixa premiada. */
  itmPct: number;
  /** Posição média. */
  posicaoMedia: number;
}

/**
 * "Mão feita" na acepção do jogador recreativo: par ou melhor. Basta uma carta
 * da mão parear o board, ou o par de bolso já vir pronto. Não é força absoluta
 * — é o corte simples entre "ele tem alguma coisa" e "ele está apostando ar".
 */
function temMaoFeita(hole: Card[], board: Card[]): boolean {
  if (hole.length < 2 || board.length < 3) return false;
  const noBoard = new Set(board.map(rankOf));
  if (noBoard.has(rankOf(hole[0])) || noBoard.has(rankOf(hole[1]))) return true;
  return rankOf(hole[0]) === rankOf(hole[1]); // par de bolso
}

/** Converte a recomendação do app numa ação jogável. */
function acaoDoPadrao(g: GameController): Action {
  const la = g.legal();
  const adv = g.computeHeroAdvice();
  const a = adv?.action ?? (la.canCheck ? "check" : "fold");
  if (a === "fold") return la.canCheck ? { type: "check" } : { type: "fold" };
  if (a === "check") return la.canCheck ? { type: "check" } : { type: "fold" };
  if (a === "call") return la.canCall ? { type: "call" } : la.canCheck ? { type: "check" } : { type: "fold" };
  // raise / 3bet / bet / jam
  if (!la.canRaise) return la.canCall ? { type: "call" } : la.canCheck ? { type: "check" } : { type: "fold" };
  const to = g.suggestedRaiseTo() ?? la.minRaiseTo;
  const alvo = Math.max(la.minRaiseTo, Math.min(la.maxRaiseTo, to));
  return alvo >= la.maxRaiseTo ? { type: "allin" } : { type: "raise", to: alvo };
}

/** Uma decisão é APERTADA quando largar e pagar valem quase o mesmo. */
export function ehSpotApertado(adv: {
  equity?: number;
  potOdds?: number;
  evBB?: number;
} | null): boolean {
  if (!adv) return false;
  // EV de pagar quase zero: qualquer lado é defensável, e é aí que se pensa.
  if (adv.evBB !== undefined && Math.abs(adv.evBB) <= 1) return true;
  // Equity encostada no preço: 5 pontos ou menos de folga.
  if (adv.equity !== undefined && adv.potOdds !== undefined) {
    return Math.abs(adv.equity - adv.potOdds) <= 0.05;
  }
  return false;
}

/**
 * Joga `torneios` torneios completos nesta faixa e devolve o que o campo fez.
 * `maxPassos` é a trava de segurança: torneio que não acaba não pode travar
 * a suíte.
 */
export function medirPressao(opts: {
  buyIn: number;
  torneios: number;
  entrants?: number;
  stage?: Stage;
  semente?: number;
  maxPassos?: number;
}): PressaoResultado {
  const { buyIn, torneios, entrants = 100, stage = "inicio", semente = 2026 } = opts;
  const maxPassos = opts.maxPassos ?? 90_000;

  const r: PressaoResultado = {
    buyIn, torneios, maos: 0, decisoes: 0,
    aberturas: 0, tresBetSofridos: 0,
    flopsDisputados: 0, cbetsSofridos: 0,
    apostasFlop: 0, apostasTurn: 0, apostasRiver: 0,
    checkRaisesSofridos: 0, ruasEmQuePassou: 0, allinsEnfrentados: 0,
    spotsApertados: 0, ruasDeGraca: 0, ruasPosFlop: 0,
    apostasDeVilao: 0, apostasComMaoFeita: 0, posicoes: [], itm: 0,
  };

  for (let t = 0; t < torneios; t++) {
    const g = new GameController({ rng: seededRng(semente + t * 7919) });
    g.configureTournament({ buyIn, entrants, stage });
    g.newHand();

    // Estado por mão, do ponto de vista do herói.
    let maoContada = false;
    let abriuNestaMao = false;
    let tresBetContado = false;
    let viuFlopDisputado = false;
    let cbetContado = false;
    let heroDeuCheckNestaRua = false;
    let ruasVistas = new Set<string>();
    let ruasComAposta = new Set<string>();
    let ruaAnterior = g.table.street;

    for (let passo = 0; passo < maxPassos; passo++) {
      if (g.tournamentOver) break;

      if (g.phase === "handOver") {
        g.newHand();
        maoContada = false;
        abriuNestaMao = false;
        tresBetContado = false;
        viuFlopDisputado = false;
        cbetContado = false;
        heroDeuCheckNestaRua = false;
        // Fecha a conta da mão que acabou: ruas em que ele agiu e ninguém
        // pediu ficha nenhuma.
        for (const rr of ruasVistas) if (!ruasComAposta.has(rr)) r.ruasDeGraca++;
        ruasVistas = new Set<string>();
        ruasComAposta = new Set<string>();
        ruaAnterior = g.table.street;
        continue;
      }

      if (g.table.street !== ruaAnterior) {
        heroDeuCheckNestaRua = false;
        ruaAnterior = g.table.street;
      }

      if (!g.isHeroTurn()) {
        g.botStep();
        continue;
      }

      // ---- é a vez do herói: aqui medimos o que o campo fez com ele -------
      if (!maoContada) { r.maos++; maoContada = true; }

      const la = g.legal();
      const adv = g.computeHeroAdvice();
      const rua = g.table.street;
      const enfrentandoAposta = la.callAmount > 0;

      // ⚠️ Antes do bloco de aposta: se contássemos o flop depois, o PRIMEIRO
      // c-bet da mão nunca entrava na conta (bug meu, achado na amostra).
      if (rua === "flop" && !viuFlopDisputado) {
        const vivos = g.table.players.filter((p) => p.status === "active" || p.status === "allin").length;
        if (vivos >= 2) { r.flopsDisputados++; viuFlopDisputado = true; }
      }

      // A MEDIDA MAIS DIRETA do que o Allan descreveu: passar por uma rua
      // inteira sem ninguém pedir fichas dele. Carta de graça é o oposto de
      // pressão.
      // ⚠️ Conta por RUA, não por ação: olhar só a primeira vez que ele age
      // superestimava, porque fora de posição ele age primeiro e a aposta do
      // vilão vem depois. A rua só é "de graça" se em NENHUMA das vezes em que
      // ele agiu havia aposta contra ele.
      if (rua !== "preflop") {
        if (!ruasVistas.has(rua)) { ruasVistas.add(rua); r.ruasPosFlop++; }
        if (enfrentandoAposta) ruasComAposta.add(rua);
      }

      if (enfrentandoAposta) {
        if (rua === "preflop") {
          // 3-bet: ele já tinha aumentado nesta mão e voltou aposta pra cima.
          if (abriuNestaMao && !tresBetContado) { r.tresBetSofridos++; tresBetContado = true; }
        } else {
          if (rua === "flop") r.apostasFlop++;
          else if (rua === "turn") r.apostasTurn++;
          else if (rua === "river") r.apostasRiver++;
          // Check-raise: ele passou nesta rua e levou aposta depois de já ter
          // colocado fichas — o vilão passou e aumentou por cima.
          if (heroDeuCheckNestaRua) r.checkRaisesSofridos++;
          if (viuFlopDisputado && rua === "flop" && !cbetContado) {
            r.cbetsSofridos++;
            cbetContado = true;
          }
        }
        const vilaoAllin = g.table.players.some((p) => !p.isHero && p.status === "allin");
        if (vilaoAllin) r.allinsEnfrentados++;

        // O agressor tinha mão? Olhamos as cartas dele (o jogador nunca vê).
        if (rua !== "preflop") {
          const agressor = g.table.players.find(
            (p) => !p.isHero && p.committed >= g.table.currentBet && p.holeCards.length >= 2,
          );
          if (agressor) {
            r.apostasDeVilao++;
            if (temMaoFeita(agressor.holeCards, g.table.board)) r.apostasComMaoFeita++;
          }
        }
      }

      if (ehSpotApertado(adv)) r.spotsApertados++;
      r.decisoes++;

      const acao = acaoDoPadrao(g);
      if (rua === "preflop" && (acao.type === "raise" || acao.type === "allin") && !abriuNestaMao) {
        abriuNestaMao = true;
        r.aberturas++;
      }
      if (acao.type === "check" && !heroDeuCheckNestaRua && rua !== "preflop") {
        heroDeuCheckNestaRua = true;
        r.ruasEmQuePassou++;
      }
      g.heroAct(acao);
    }

    for (const rr of ruasVistas) if (!ruasComAposta.has(rr)) r.ruasDeGraca++;

    const sum = g.tournamentSummary();
    if (sum) {
      r.posicoes.push(sum.finishPlace);
      if (sum.inMoney) r.itm++;
    }
  }

  return r;
}

export function taxas(r: PressaoResultado): PressaoTaxas {
  const p = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
  const por100 = (a: number) => (r.maos > 0 ? Math.round((a / r.maos) * 1000) / 10 : 0);
  return {
    tresBetContraAbertura: p(r.tresBetSofridos, r.aberturas || r.maos),
    cbetContraEle: p(r.cbetsSofridos, r.flopsDisputados),
    apostasPor100: { flop: por100(r.apostasFlop), turn: por100(r.apostasTurn), river: por100(r.apostasRiver) },
    checkRaisePor100: por100(r.checkRaisesSofridos),
    checkRaiseSofridoPct: p(r.checkRaisesSofridos, r.ruasEmQuePassou),
    allinPor100: por100(r.allinsEnfrentados),
    spotsApertadosPct: p(r.spotsApertados, r.decisoes),
    cartaDeGracaPct: p(r.ruasDeGraca, r.ruasPosFlop),
    apostaComMaoPct: p(r.apostasComMaoFeita, r.apostasDeVilao),
    itmPct: p(r.itm, r.torneios),
    posicaoMedia: r.posicoes.length
      ? Math.round((r.posicoes.reduce((s, x) => s + x, 0) / r.posicoes.length) * 10) / 10
      : 0,
  };
}

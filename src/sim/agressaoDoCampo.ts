// ---------------------------------------------------------------------------
// AGRESSÃO DO CAMPO — mede os BOTS direto, com amostra grande.
//
// A régua de pressão (pressaoDoCampo.ts) mede o que o JOGADOR sofre ao longo de
// torneios completos. É a que conta para a sensação, mas é cara: um torneio
// inteiro rende poucas dezenas de flops disputados, e com essa amostra a
// diferença entre faixas some no ruído — foi o que aconteceu ao medir a escada
// em 15/09/2026.
//
// Aqui a pergunta é outra e mais direta: **o campo desta faixa, quantas vezes
// check-raisa, c-beta e segue no turn?** Rodando mãos soltas (estilo cash, com
// os stacks recompostos) dá para juntar milhares de amostras em segundos e ver
// a escada com nitidez.
//
// As duas réguas se completam: esta calibra, aquela confirma a sensação.
// ---------------------------------------------------------------------------

import { seededRng, type Card } from "../engine/cards";
import {
  createTable,
  startHand,
  applyAction,
  moveButton,
  freshShuffledDeck,
} from "../game/engine";
import { botPreflopAction } from "../bots/preflopBot";
import { botPostflopAction } from "../bots/postflopBot";
import { buildFieldSeats } from "../bots/field";

export interface AgressaoResultado {
  buyIn?: number;
  maos: number;
  /** Vezes que um bot passou e depois enfrentou aposta na mesma rua. */
  spotsDeCheckRaise: number;
  /** Dessas, quantas ele aumentou. */
  checkRaises: number;
  /** Vezes que um bot teve a iniciativa no flop e a ação chegou limpa nele. */
  spotsDeCbet: number;
  cbets: number;
  /** Vezes que um bot apostou o flop e chegou ao turn com a ação limpa. */
  spotsDeBarrelTurn: number;
  barrelsTurn: number;
  /** Aumentos contra aposta (o "não dá pra apostar sossegado"). */
  raisesContraAposta: number;
  apostasEnfrentadas: number;
  /** Aberturas no pré-flop e quantas levaram 3-bet / 4-bet. */
  aberturas: number;
  tresBets: number;
  quatroBets: number;
  /** Mãos em que alguém apostou nas TRÊS ruas pós-flop (flop+turn+river). */
  maosComTresBarris: number;
  maosComFlopEturnEriver: number;
}

export interface AgressaoTaxas {
  checkRaisePct: number;
  cbetPct: number;
  barrelTurnPct: number;
  raiseContraApostaPct: number;
  /** % das aberturas que levaram 3-bet, e dos 3-bets que levaram 4-bet. */
  tresBetPct: number;
  quatroBetPct: number;
  /** % das mãos em que alguém apostou nas três ruas pós-flop. */
  tresBarrisPct: number;
}

/**
 * Roda `maos` mãos com os 8 perfis + a linha de base, na faixa `buyIn`, e
 * devolve as frequências agregadas do campo.
 */
export function medirAgressao(maos: number, buyIn?: number, semente = 777): AgressaoResultado {
  const bb = 50;
  const stack = 200 * bb;
  const rng = seededRng(semente);
  // ⚠️ A mesa é montada com a COMPOSIÇÃO REAL da faixa (buildFieldSeats), não
  // com um perfil de cada. Metade da dificuldade de uma faixa vem de QUEM senta
  // nela: o micro é cheio de recreativo, o elite é só regular. Medir sempre com
  // os mesmos 9 perfis escondia justamente isso.
  const seats = buildFieldSeats(buyIn, 9, rng).map((x) => ({
    name: x.name,
    stack,
    profileId: x.profileId,
  }));
  const t = createTable({ smallBlind: 25, bigBlind: bb }, seats, 0);

  const r: AgressaoResultado = {
    buyIn, maos: 0,
    spotsDeCheckRaise: 0, checkRaises: 0,
    spotsDeCbet: 0, cbets: 0,
    spotsDeBarrelTurn: 0, barrelsTurn: 0,
    raisesContraAposta: 0, apostasEnfrentadas: 0,
    aberturas: 0, tresBets: 0, quatroBets: 0,
    maosComTresBarris: 0, maosComFlopEturnEriver: 0,
  };

  for (let h = 0; h < maos; h++) {
    for (const p of t.players) p.stack = stack;
    const deck: Card[] = freshShuffledDeck(rng);
    startHand(t, deck);

    // Quem apostou o flop (para medir a segunda barrelada no turn).
    const apostouNoFlop = new Set<number>();
    // Quantos aumentos o pré-flop já teve nesta mão (0 = ninguém abriu).
    let nivelPre = 0;
    // Ruas em que alguém apostou, e quem barrelou as três.
    const ruasComAposta = new Set<string>();
    const barrisPorAssento = new Map<number, Set<string>>();
    let guard = 0;
    while (!t.handOver) {
      if (guard++ > 3000) break;
      const seat = t.toAct;
      const p = t.players[seat];
      const antesRua = t.street;
      const enfrentandoAposta = t.currentBet - p.committed > 0;
      const passouAntes = !!p.passouNestaRua;
      const acaoLimpa = !enfrentandoAposta && antesRua !== "preflop";

      // Spots ANTES da ação (depois o estado já mudou).
      const ehSpotCR = antesRua !== "preflop" && passouAntes && enfrentandoAposta;
      const ehSpotCbet = antesRua === "flop" && acaoLimpa && t.preflopAggressor === seat;
      const ehSpotBarrel = antesRua === "turn" && acaoLimpa && apostouNoFlop.has(seat);
      if (ehSpotCR) r.spotsDeCheckRaise++;
      if (ehSpotCbet) r.spotsDeCbet++;
      if (ehSpotBarrel) r.spotsDeBarrelTurn++;
      if (antesRua !== "preflop" && enfrentandoAposta) r.apostasEnfrentadas++;

      const action =
        antesRua === "preflop"
          ? botPreflopAction(t, seat, { buyIn })
          : botPostflopAction(t, seat, rng, 200, undefined, buyIn);

      const agrediu = action.type === "raise" || action.type === "allin";

      // Escada de aumentos no pré-flop: 1 = open, 2 = 3-bet, 3 = 4-bet.
      if (antesRua === "preflop" && agrediu) {
        nivelPre++;
        if (nivelPre === 1) r.aberturas++;
        else if (nivelPre === 2) r.tresBets++;
        else if (nivelPre === 3) r.quatroBets++;
      }
      // Apostas por rua e "três barris" (apostou flop, turn E river).
      if (antesRua !== "preflop" && agrediu) {
        ruasComAposta.add(antesRua);
        const m = barrisPorAssento.get(seat) ?? new Set<string>();
        m.add(antesRua);
        barrisPorAssento.set(seat, m);
      }
      if (ehSpotCR && agrediu) r.checkRaises++;
      if (ehSpotCbet && agrediu) r.cbets++;
      if (ehSpotBarrel && agrediu) r.barrelsTurn++;
      if (antesRua !== "preflop" && enfrentandoAposta && agrediu) r.raisesContraAposta++;
      if (antesRua === "flop" && acaoLimpa && agrediu) apostouNoFlop.add(seat);

      applyAction(t, action);
    }
    if (["flop", "turn", "river"].every((x) => ruasComAposta.has(x))) r.maosComFlopEturnEriver++;
    for (const [, ruas] of barrisPorAssento) {
      if (ruas.size >= 3) { r.maosComTresBarris++; break; }
    }
    moveButton(t);
    r.maos++;
  }
  return r;
}

export function taxasDeAgressao(r: AgressaoResultado): AgressaoTaxas {
  const p = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
  return {
    checkRaisePct: p(r.checkRaises, r.spotsDeCheckRaise),
    cbetPct: p(r.cbets, r.spotsDeCbet),
    barrelTurnPct: p(r.barrelsTurn, r.spotsDeBarrelTurn),
    raiseContraApostaPct: p(r.raisesContraAposta, r.apostasEnfrentadas),
    tresBetPct: p(r.tresBets, r.aberturas),
    quatroBetPct: p(r.quatroBets, r.tresBets),
    tresBarrisPct: p(r.maosComTresBarris, r.maos),
  };
}

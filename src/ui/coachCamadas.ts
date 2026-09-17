// ---------------------------------------------------------------------------
// AS CAMADAS DE EXPLICAÇÃO DO COACH — um lugar só, duas telas.
//
// Estas frases nasceram no PÓS-MÃO. Em 12/09/2026 o Allan mostrou o buraco: na
// MESA, na hora de decidir, a dica dizia só "💡 Raise" e abria um painel com
// números soltos (posição, stack, pote). Nenhum PORQUÊ. Ou seja: a explicação
// que ele queria existia — e só chegava depois que a mão já tinha acabado.
//
// Então as camadas saíram do arquivo do pós-mão e vieram para cá, trabalhando
// sobre uma FONTE NORMALIZADA. Quem tem os dados monta a fonte e recebe as
// mesmas frases: o pós-mão a partir do FeedbackItem, a mesa a partir da decisão
// ao vivo. Uma frase só existe num lugar, então não tem como as duas telas
// divergirem.
//
// Toda frase continua passando pela porta do contrato (coachContract.ts): sem o
// dado, a frase não nasce.
// ---------------------------------------------------------------------------

import type { Family, IcmDelta } from "../feedback/analyzer";
import { actionLabel } from "../feedback/analyzer";
import { temDadoPara } from "../feedback/coachContract";
import type { MapaDaMesa } from "../bots/mapaDaMesa";
import { SHORT_CRITICO_BB } from "../bots/mapaDaMesa";

export type CoachModo = "simple" | "technical";

/**
 * QUANDO a frase é lida. Muda só o TEMPO VERBAL, e muda por um motivo real: na
 * mesa a decisão ainda não foi tomada ("o preço está bom"), no pós-mão ela já
 * foi ("o preço estava bom"). Sem isto, uma das duas telas fica escrita errado.
 */
export type CoachMomento = "aoVivo" | "posMao";

/**
 * QUANTO o coach abre. Nasceu do pedido do Allan em 17/09/2026: *"no torneio
 * deixa uma coisa mais básica, explicando um pouco menor. No review eu queria
 * ver a explicação mais detalhada da mão, como os comentaristas fazem."*
 *
 *   · "curta"    — na mesa, decidindo: o essencial em uma ou duas frases.
 *   · "completa" — no review, sem pressa: tudo que o motor provou.
 *
 * A profundidade NÃO muda o conteúdo: as frases são as mesmas, saem dos mesmos
 * dados e passam pelo mesmo contrato. O que muda é QUANTAS chegam à tela — e a
 * ordem é a de quem comenta uma mão: primeiro a mesa, depois a leitura, depois
 * a conta. Nenhuma frase nova é inventada para o review.
 */
export type CoachProfundidade = "curta" | "completa";

/**
 * A ORDEM EM QUE O COACH FALA — do mais decisivo para o mais fino.
 *
 * É a ordem que um comentarista usa: primeiro o que está em jogo na mesa
 * (stacks), depois quem é o vilão (range), depois a conta, e por último os
 * detalhes que só interessam a quem quer se aprofundar. Na profundidade curta
 * o coach mostra só as primeiras; no review mostra todas.
 */
export const ORDEM_DAS_CAMADAS: (keyof CamadasView)[] = [
  "pesoDaBolha",      // o torneio virou a decisão: nada é mais importante
  "mapaDaMesa",       // quem cobre quem
  "leitura",          // quão largo é o range dele
  "conta",            // sua chance contra a chance exigida
  "precoDoPote",      // o que você paga para disputar o quê
  "pressaoDaMesa",    // os shorts que estão na mesa
  "topoRange",        // quanto do range dele é trinca ou melhor
  "cartasSalvadoras", // os outs
  "oQueMudaria",      // o ponto de virada
];

/** Quantas camadas cabem na mesa, no meio da decisão. */
export const CAMADAS_NA_MESA = 2;

/** Os dados de que as camadas precisam, com nomes únicos para as duas telas. */
export interface FonteCamadas {
  /** Sua chance de ganhar (0..1). */
  equity?: number;
  /** A chance que o PREÇO exige (0..1). */
  requiredEquity?: number;
  /** Largura do range do vilão (0..1). */
  villainRangePct?: number;
  /** Fração do range dele que forma trinca ou melhor no board (0..1). */
  topoRangePct?: number;
  /** O ICM medido (motor rodado com e sem prêmios). */
  icmDelta?: IcmDelta;
  /** Tamanho de aposta que viraria a decisão (bb). */
  breakEvenCallBB?: number;
  /** Família da ação recomendada — o ponto de virada só vale sobre fold. */
  adviceFam?: Family;
  /** Cartas que colocavam o herói na frente. */
  outs?: { outs: number; chance: number };
  /** Pote atual (bb) — para o preço do pote. */
  potBB?: number;
  /** Quanto falta pagar (bb) — para o preço do pote. */
  toCallBB?: number;
  /** Quantos oponentes ainda disputam o pote (sem o herói). */
  oponentes?: number;
  /** O mapa de stacks da mesa — quem cobre quem, quem está curto. */
  mapa?: MapaDaMesa;
}

export interface CamadasView {
  /** A leitura: quão largo é o range do vilão. */
  leitura?: string;
  /** O topo do range dele: quanto dele forma trinca ou melhor neste board. */
  topoRange?: string;
  /** A conta: sua chance contra a chance que o preço exige. */
  conta?: string;
  /** O peso da bolha: o ICM medido, quando mudou a decisão. */
  pesoDaBolha?: string;
  /** O que mudaria: o tamanho de aposta em que a decisão vira. */
  oQueMudaria?: string;
  /** Cartas que te salvavam. */
  cartasSalvadoras?: string;
  /**
   * O PREÇO DO POTE: quanto você paga para disputar quanto, e a fatia que isso
   * representa. Aritmética pura — aparece inclusive no pré-flop, onde o motor
   * não estima equity e por isso "A conta" não nasce.
   */
  precoDoPote?: string;
  /** Quem cobre quem: a relação de stacks do herói com a mesa. */
  mapaDaMesa?: string;
  /** Os stacks curtos que estão na mesa, mesmo fora desta mão. */
  pressaoDaMesa?: string;
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * Rótulo da largura do range. Faixas convencionais de torneio, escritas aqui
 * para ficarem à vista em vez de espalhadas: abaixo de 20% é apertado, até 35%
 * é médio, acima disso é largo. O NÚMERO vai junto sempre — o rótulo é só
 * tradução, nunca substitui o dado.
 */
function larguraLabel(pct: number): string {
  if (pct < 0.2) return "range apertado";
  if (pct <= 0.35) return "range médio";
  return "range largo";
}

/** "22 de cada 100 vezes" — a mesma porcentagem, sem exigir saber o que é %. */
function emCada100(value: number): string {
  return `${Math.round(value * 100)} de cada 100 vezes`;
}

function buildLeitura(f: FonteCamadas, mode: CoachModo): string | undefined {
  if (!temDadoPara("leituraRange", f as unknown as Record<string, unknown>)) return undefined;
  const vr = f.villainRangePct;
  if (vr === undefined || vr <= 0) return undefined;
  const pct = percent(vr);
  if (mode === "technical") return `Range do vilão ~${pct} (${larguraLabel(vr)}).`;
  return `O vilão joga cerca de ${pct} das mãos nesse ponto — ${larguraLabel(vr)}.`;
}

function buildTopoRange(f: FonteCamadas, mode: CoachModo): string | undefined {
  if (!temDadoPara("topoRange", f as unknown as Record<string, unknown>)) return undefined;
  const frac = f.topoRangePct;
  if (frac === undefined) return undefined;
  const pct = Math.round(frac * 100);
  if (mode === "technical") return `Topo do range dele: ${pct}% forma trinca ou melhor neste board.`;
  if (pct === 0) return "Nenhuma mão do range dele forma trinca ou melhor nesse board.";
  return `Do range dele, ${pct} em cada 100 mãos formam trinca ou melhor nesse board.`;
}

function buildConta(f: FonteCamadas, mode: CoachModo, momento: CoachMomento): string | undefined {
  if (!temDadoPara("equityPreco", f as unknown as Record<string, unknown>)) return undefined;
  const eq = f.equity;
  const req = f.requiredEquity; // equity EXIGIDA pelo preço
  if (eq === undefined) return undefined;

  if (mode === "technical") {
    if (req === undefined) return `Equity ${percent(eq)}.`;
    const falta = Math.round((req - eq) * 100);
    const cauda = falta > 0 ? ` — faltam ${falta} pontos` : ` — sobram ${Math.abs(falta)} pontos`;
    return `Equity ${percent(eq)} vs preço ${percent(req)}${cauda}.`;
  }

  if (req === undefined) return `Com essa mão você ganha ${emCada100(eq)}.`;
  const falta = Math.round((req - eq) * 100);
  const pagando = momento === "aoVivo" ? "está pagando" : "estava pagando";
  if (falta > 0) {
    return `Você ganha ${emCada100(eq)}. Pelo preço que ${pagando}, precisaria ganhar ${Math.round(req * 100)} — faltam ${falta}.`;
  }
  const precisa = momento === "aoVivo" ? "precisa" : "precisava";
  const esta = momento === "aoVivo" ? "está" : "estava";
  return `Você ganha ${emCada100(eq)} e só ${precisa} de ${Math.round(req * 100)} — o preço ${esta} bom.`;
}

function buildPesoDaBolha(f: FonteCamadas, mode: CoachModo): string | undefined {
  if (!temDadoPara("icmDelta", f as unknown as Record<string, unknown>)) return undefined;
  const d = f.icmDelta;
  if (!d) return undefined;
  const com = actionLabel(d.comIcm);
  const sem = actionLabel(d.semIcm);
  if (mode === "technical") return `Com prêmios na conta: ${com.toUpperCase()}. Sem: ${sem.toUpperCase()}.`;
  return `Os prêmios do torneio mudaram essa decisão: valendo só fichas o padrão seria ${sem.toUpperCase()}; com o prêmio em jogo, é ${com.toUpperCase()}.`;
}

function buildOQueMudaria(f: FonteCamadas, mode: CoachModo): string | undefined {
  if (!temDadoPara("breakEven", f as unknown as Record<string, unknown>)) return undefined;
  const virada = f.breakEvenCallBB;
  if (virada === undefined || virada <= 0) return undefined;
  // Só faz sentido quando o motor mandou FOLDAR: aí a frase responde "e se ele
  // tivesse apostado menos?". Num call aprovado, dizer o ponto de virada seria
  // ruído (a decisão já estava certa).
  if (f.adviceFam !== "fold") return undefined;
  if (mode === "technical") return `Viraria call com até ${virada}bb para pagar.`;
  return `Se ele tivesse apostado até ${virada}bb, aí valeria pagar.`;
}

function buildCartasSalvadoras(f: FonteCamadas, mode: CoachModo, momento: CoachMomento): string | undefined {
  if (!temDadoPara("outs", f as unknown as Record<string, unknown>)) return undefined;
  const o = f.outs;
  if (!o || o.outs <= 0) return undefined;
  const chance = Math.round(o.chance * 100);
  const cartas = o.outs === 1 ? "1 carta" : `${o.outs} cartas`;
  if (mode === "technical") return `${o.outs} outs · ${chance}% na próxima carta.`;
  const colocam = momento === "aoVivo" ? "te colocam" : "te colocavam";
  return `${cartas} ${colocam} na frente — ${chance}% de chance de vir na próxima.`;
}

/**
 * O PREÇO DO POTE — o pedaço que valeu a pena de um prompt de fora (13/09/2026).
 *
 * Responde a pergunta que o jogador faz olhando o pote: "estou pagando 1bb para
 * disputar 11,5bb, isso é bom?". A fatia exigida é toCall ÷ (pote + toCall) —
 * conta de uma linha, sem modelo nenhum por trás.
 *
 * ⚠️ E POR ISSO MESMO ELA NÃO DECIDE A MÃO. O prompt que trouxe a ideia
 * concluía que a 11,5 para 1 dá para pagar com qualquer duas cartas. Medimos:
 * 72o tem 8,6% de chance contra 5 oponentes e o preço pede 8% — 0,6 ponto de
 * margem em chance CRUA, que você nem realiza jogando fora de posição. Ou seja:
 * o preço é um DOS lados da conta.
 *
 * A frase carrega o antídoto junto: em pote multiway ela diz contra quantos a
 * chance precisa valer. É o erro exato que derruba a conclusão "paga qualquer
 * mão" — mais gente barateia o preço E tira a sua chance ao mesmo tempo.
 */
function buildPrecoDoPote(f: FonteCamadas, mode: CoachModo): string | undefined {
  if (!temDadoPara("precoDoPote", f as unknown as Record<string, unknown>)) return undefined;
  const pote = f.potBB!;
  const pagar = f.toCallBB!;
  if (pagar <= 0 || pote <= 0) return undefined; // sem nada a pagar não há preço
  const bb = (x: number) => `${Math.round(x * 10) / 10}bb`;
  const pede = Math.round((pagar / (pote + pagar)) * 100);
  const opp = f.oponentes;
  const contra =
    opp && opp >= 2
      ? ` — e contra ${opp} oponentes de uma vez, não contra um`
      : "";
  if (mode === "technical") {
    return `${bb(pagar)} para disputar ${bb(pote)} · pot odds pedem ${pede}%${contra}.`;
  }
  return `Você paga ${bb(pagar)} para disputar ${bb(pote)}: o preço pede ${pede}% de chance${contra}.`;
}

export function construirCamadas(
  f: FonteCamadas,
  mode: CoachModo,
  momento: CoachMomento = "posMao",
): CamadasView {
  return {
    leitura: buildLeitura(f, mode),
    topoRange: buildTopoRange(f, mode),
    conta: buildConta(f, mode, momento),
    pesoDaBolha: buildPesoDaBolha(f, mode),
    oQueMudaria: buildOQueMudaria(f, mode),
    cartasSalvadoras: buildCartasSalvadoras(f, mode, momento),
    precoDoPote: buildPrecoDoPote(f, mode),
    mapaDaMesa: buildMapaDaMesa(f, mode),
    pressaoDaMesa: buildPressaoDaMesa(f, mode),
  };
}

// ---------------------------------------------------------------------------
// AS FRASES DO MAPA DA MESA.
//
// ⚠️ O limite aqui é fino e proposital. O motor SABE quem cobre quem e sabe que
// existe um short de 5bb. O que ele NÃO sabe é se aquele short mudou esta
// decisão — isso só o `icmDelta` pode afirmar, porque ele roda o motor duas
// vezes. Então estas frases mostram a MESA, nunca a CAUSA. A diferença entre
// "existe um short de 5bb" (fato) e "esse short fez você foldar" (invenção) é
// exatamente a trava que o contrato protege.
// ---------------------------------------------------------------------------

function buildMapaDaMesa(f: FonteCamadas, mode: CoachModo): string | undefined {
  if (!temDadoPara("mapaDaMesa", f as unknown as Record<string, unknown>)) return undefined;
  const m = f.mapa;
  if (!m) return undefined;
  const bb = Math.round(m.heroBB);
  if (m.cobre === 0 && m.cobertoPor === 0) return undefined;
  if (mode === "technical") {
    return `Mesa: ${bb}bb · cobre ${m.cobre}, coberto por ${m.cobertoPor} de ${m.vivos - 1}.`;
  }
  if (m.cobertoPor === 0) {
    return `Com ${bb}bb você é o maior da mesa: cobre os ${m.cobre} adversários.`;
  }
  if (m.cobre === 0) {
    return `Com ${bb}bb você é o menor: os ${m.cobertoPor} adversários cobrem você.`;
  }
  const plural = m.cobertoPor === 1 ? "existe 1 jogador que cobre" : `existem ${m.cobertoPor} que cobrem`;
  return `Você cobre ${m.cobre} ${m.cobre === 1 ? "jogador" : "jogadores"}, mas ${plural} você.`;
}

function buildPressaoDaMesa(f: FonteCamadas, mode: CoachModo): string | undefined {
  if (!temDadoPara("pressaoDaMesa", f as unknown as Record<string, unknown>)) return undefined;
  const m = f.mapa;
  if (!m || m.shorts === 0 || m.menorBB === undefined) return undefined;
  const menor = Math.round(m.menorBB);
  if (mode === "technical") {
    return `${m.shorts} stack(s) ≤ ${SHORT_CRITICO_BB}bb na mesa; menor: ${menor}bb.`;
  }
  if (m.shorts === 1) {
    return `Tem um stack de ${menor}bb nesta mesa lutando para sobreviver.`;
  }
  return `Tem ${m.shorts} stacks curtos nesta mesa — o menor com ${menor}bb.`;
}

/**
 * Devolve as camadas na ordem do comentarista, já cortadas pela profundidade.
 *
 * Na mesa entram no máximo `CAMADAS_NA_MESA` — o jogador está decidindo, não
 * lendo. No review entra tudo que o motor provou, porque ali o tempo da decisão
 * já passou e o objetivo é entender.
 */
export function camadasEmOrdem(
  view: CamadasView,
  profundidade: CoachProfundidade,
): string[] {
  const todas = ORDEM_DAS_CAMADAS
    .map((k) => view[k])
    .filter((x): x is string => typeof x === "string" && x.length > 0);
  return profundidade === "completa" ? todas : todas.slice(0, CAMADAS_NA_MESA);
}

// ---------------------------------------------------------------------------
// O "POR QUÊ" — o motivo REAL do motor, inteiro.
//
// ⚠️ NÃO passa por plainReason. Aquela função existia para "limpar jargão" no
// modo simples e apagava toda porcentagem da frase — o que produzia coisas como
// "Paga: ≥." e "Folda: preço do pote + ICM (prêmio de risco) → exige (2
// oponentes)". Era essa a sensação de superficialidade que o Allan relatou: a
// frase chegava na tela sem os números que a sustentavam.
//
// Aqui a gente tira só o que é redundante com a tela — o código da mão no
// começo ("KJs: "), já que as cartas estão à vista — e mantém o resto intacto.
// ---------------------------------------------------------------------------
export function porQue(reason: string | undefined): string | undefined {
  if (!reason) return undefined;
  const core = reason.replace(/^[AKQJT2-9]{1,2}[so]?:\s*/i, "").trim();
  if (core.length < 8) return undefined; // motivo genérico demais: não mostra
  return core.charAt(0).toUpperCase() + core.slice(1);
}

// ---------------------------------------------------------------------------
// PILAR 1 (parte 2) — Enfrentar uma RE-AGRESSÃO que NÃO é all-in, por EQUITY.
//
// Cenário: o herói abriu (ou 3-betou) e levou um 3-bet/4-bet que ainda deixa
// stack para jogar — não é pagar-ou-morrer. A decisão é 4-bet(5-bet) / pagar em
// posição / foldar. O motor simples usava listas fixas (AA/KK/QQ/AK sempre
// 4-beta; A5s/A4s blefam; JJ/TT/99… pagam IP). Aqui a decisão nasce da MESMA
// matemática do irmão do Allan: cada mão tem um VALOR (equity) e a jogada segue
// a conta.
//
// Duas medidas de equity, porque um 4-bet tem duas "faces":
//   • eqGetItIn  — equity contra o range PREMIUM que coloca TODAS as fichas
//     (o range de 5-bet/all-in ≈ topo ~4%). É o que decide o 4-bet por VALOR:
//     só re-agride por valor quem AGUENTA a mão ir toda pro meio.
//   • eqFull     — equity contra o range CHEIO de quem re-agrediu (mais largo).
//     É o que decide PAGAR em posição (preço do pote × realização).
//
// Módulo PURO e isolado (sem estado do jogo). A ligação com a mesa é feita em
// preflop.ts (potBB, callBB, posição), com fallback heurístico quando faltam
// dados — mantém tudo retrocompatível.
// ---------------------------------------------------------------------------

import type { Card } from "../engine/cards";
import { equityHandVsRange } from "../engine/equity";
import { buildTopRange } from "./build";
import { rangeCombos } from "./types";
import { requiredEquityToCall, type IcmSpot } from "./icm";

/** Largura do range CHEIO de quem re-agride sem all-in, por nível enfrentado. */
export function reraiserRangePct(betLevelFaced: number): number {
  const bl = Math.max(2, Math.floor(betLevelFaced));
  if (bl >= 3) return 0.06; // enfrenta 4-bet: range premium-linear (~6%)
  return 0.09; //               enfrenta 3-bet: range de 3-bet (~9%)
}

/** Range PREMIUM que coloca as fichas todas (5-bet/all-in): sempre o topo. */
const GET_IT_IN_PCT = 0.04; // ≈ AA/KK/QQ/AK
/**
 * Equity mínima vs o range de get-it-in para re-agredir por VALOR, por nível:
 *   • enfrenta 3-bet (spot de 4-bet): 0.42 → reproduz {TT+, AK}, range de valor
 *     padrão levemente conservador. (Por equity crua, AK e TT são quase
 *     idênticos vs o range premium ~43%; a separação fina entre eles é
 *     estratégica, não numérica — então ambos re-agridem.)
 *   • enfrenta 4-bet (spot de 5-bet): 0.50 → exige DOMÍNIO {QQ+}; 5-betear TT/AK
 *     por valor é spew (só paga quem está na frente).
 */
function valueGetItInEq(betLevelFaced: number): number {
  return Math.floor(betLevelFaced) >= 3 ? 0.5 : 0.42;
}
/** Piso de equity para PAGAR em posição (o preço do pote pode ser menor, mas
 *  contra re-agressão a realização é pior — não se paga com equity crua baixa). */
const FLAT_FLOOR = 0.4;

export interface VsReraiseInput {
  /** Cartas do herói (2 para Hold'em). */
  hero: Card[];
  /** Nível enfrentado: 2 = enfrenta 3-bet (spot de 4-bet), 3 = enfrenta 4-bet. */
  betLevelFaced: number;
  /** Herói joga o pós-flop EM POSIÇÃO sobre quem re-agrediu? (flat só IP). */
  inPosition: boolean;
  /** Pote (bb) no meio antes do call do herói. */
  potBB: number;
  /** Fichas (bb) que o herói paga para chamar a re-agressão. */
  callBB: number;
  /** Contexto de ICM: perto do dinheiro, o preço para pagar sobe. */
  icmSpot?: IcmSpot;
  rng?: () => number;
  iterations?: number;
}

export interface VsReraiseResult {
  /** "reraise" = 4-bet/5-bet por valor · "call" = paga IP · "fold". */
  action: "reraise" | "call" | "fold";
  /** Equity vs o range PREMIUM de get-it-in (0..1). Decide o valor. */
  eqGetItIn: number;
  /** Equity vs o range CHEIO de quem re-agrediu (0..1). Decide o flat. */
  eqFull: number;
  /** Equity exigida para pagar em posição (preço + realização + ICM). */
  flatRequired: number;
  /** Texto com a CONTA (transparente). */
  reason: string;
}

/**
 * Decide, por EQUITY real, o que fazer contra uma re-agressão não-all-in:
 * 4-bet/5-bet por valor, pagar em posição ou foldar. NÃO trata blefes de
 * bloqueador (isso fica no chamador, como jogada mista) nem stacks curtos
 * (esses caem no jam/fold ou no motor de all-in).
 */
export function vsReraiseDecision(inp: VsReraiseInput): VsReraiseResult {
  const iters = inp.iterations ?? 3000;
  const rng = inp.rng ?? Math.random;

  const strongRange = rangeCombos(buildTopRange(GET_IT_IN_PCT));
  const fullRange = rangeCombos(buildTopRange(reraiserRangePct(inp.betLevelFaced)));

  const eqGetItIn = equityHandVsRange(inp.hero, strongRange, [], iters, rng).equity;
  const eqFull = equityHandVsRange(inp.hero, fullRange, [], iters, rng).equity;

  // Preço para pagar, com folga de realização/domínio (piso FLAT_FLOOR), elevado
  // por ICM perto do dinheiro.
  const potOdds = inp.callBB / (inp.potBB + inp.callBB);
  let flatRequired = Math.max(potOdds * 1.25, FLAT_FLOOR);
  if (inp.icmSpot) {
    const icmReq = requiredEquityToCall(inp.icmSpot);
    if (icmReq > flatRequired) flatRequired = icmReq;
  }

  const p = (x: number) => `${Math.round(x * 100)}%`;
  const valueEq = valueGetItInEq(inp.betLevelFaced);

  // 1) VALOR: aguenta a mão ir toda pro meio contra o range premium → re-agride.
  if (eqGetItIn >= valueEq) {
    return {
      action: "reraise",
      eqGetItIn,
      eqFull,
      flatRequired,
      reason: `re-raise por valor: equity ${p(eqGetItIn)} vs o range que vai de all-in (aguenta a mão ir toda pro meio).`,
    };
  }

  // 2) PAGAR (só EM POSIÇÃO): preço bom + equity suficiente vs o range cheio.
  if (inp.inPosition && eqFull >= flatRequired) {
    return {
      action: "call",
      eqGetItIn,
      eqFull,
      flatRequired,
      reason: `paga em posição: equity ${p(eqFull)} ≥ preço ${p(flatRequired)}.`,
    };
  }

  // 3) FOLDA: nem domina o range premium, nem paga o preço em posição.
  return {
    action: "fold",
    eqGetItIn,
    eqFull,
    flatRequired,
    reason: inp.inPosition
      ? `folda: equity ${p(eqFull)} < preço ${p(flatRequired)} e não domina o range de all-in.`
      : `folda: fora de posição e sem valor de all-in (equity ${p(eqGetItIn)} vs range premium).`,
  };
}

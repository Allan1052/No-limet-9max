// ---------------------------------------------------------------------------
// PILAR 1 (parte 2) — Enfrentar uma RE-AGRESSÃO que NÃO é all-in, por EQUITY.
//
// Cenário: o herói abriu (ou 3-betou) e levou um 3-bet/4-bet que ainda deixa
// stack para jogar — não é pagar-ou-morrer. A decisão é 4-bet(5-bet) / pagar /
// foldar, agora também distinguindo o flat OOP profundo do stack curto.
// ---------------------------------------------------------------------------

import type { Card } from "../engine/cards";
import { equityHandVsRange } from "../engine/equity";
import { buildTopRange } from "./build";
import { rangeCombos } from "./types";
import { requiredEquityToCall, type IcmSpot } from "./icm";

/** Largura do range CHEIO de quem re-agride sem all-in, por nível enfrentado. */
export function reraiserRangePct(betLevelFaced: number): number {
  const bl = Math.max(2, Math.floor(betLevelFaced));
  if (bl >= 3) return 0.06;
  return 0.09;
}

const GET_IT_IN_PCT = 0.04;

function valueGetItInEq(betLevelFaced: number): number {
  return Math.floor(betLevelFaced) >= 3 ? 0.5 : 0.42;
}

const FLAT_FLOOR = 0.4;
const OOP_DEEP_MIN_BB = 45;
const OOP_REALIZATION_PENALTY = 0.03;

export interface VsReraiseInput {
  hero: Card[];
  betLevelFaced: number;
  inPosition: boolean;
  potBB: number;
  callBB: number;
  /** Stack efetivo em BB. Permite distinguir flat OOP profundo de stack curto. */
  effectiveBB?: number;
  icmSpot?: IcmSpot;
  rng?: () => number;
  iterations?: number;
}

export interface VsReraiseResult {
  action: "reraise" | "call" | "fold";
  eqGetItIn: number;
  eqFull: number;
  flatRequired: number;
  reason: string;
}

export function vsReraiseDecision(inp: VsReraiseInput): VsReraiseResult {
  const iters = inp.iterations ?? 3000;
  const rng = inp.rng ?? Math.random;

  const strongRange = rangeCombos(buildTopRange(GET_IT_IN_PCT));
  const fullRange = rangeCombos(buildTopRange(reraiserRangePct(inp.betLevelFaced)));

  const eqGetItIn = equityHandVsRange(inp.hero, strongRange, [], iters, rng).equity;
  const eqFull = equityHandVsRange(inp.hero, fullRange, [], iters, rng).equity;

  const potOdds = inp.callBB / (inp.potBB + inp.callBB);
  let flatRequired = Math.max(potOdds * 1.25, FLAT_FLOOR);
  if (inp.icmSpot) {
    const icmReq = requiredEquityToCall(inp.icmSpot);
    if (icmReq > flatRequired) flatRequired = icmReq;
  }

  const p = (x: number) => `${Math.round(x * 100)}%`;
  const valueEq = valueGetItInEq(inp.betLevelFaced);

  if (eqGetItIn >= valueEq) {
    return {
      action: "reraise",
      eqGetItIn,
      eqFull,
      flatRequired,
      reason: `re-raise por valor: equity ${p(eqGetItIn)} vs o range que vai de all-in (aguenta a mão ir toda pro meio).`,
    };
  }

  if (inp.inPosition && eqFull >= flatRequired) {
    return {
      action: "call",
      eqGetItIn,
      eqFull,
      flatRequired,
      reason: `paga em posição: equity ${p(eqFull)} ≥ preço ${p(flatRequired)}.`,
    };
  }

  // V2: fora de posição não é mais sempre 4-bet-ou-fold. Com stack realmente
  // profundo ainda existe espaço para realizar equity pós-flop com a parte forte
  // da defesa. Exigimos uma pequena margem extra pela desvantagem de posição e
  // só liberamos contra 3-bet, nunca em stack curto nem numa guerra de 4-bets+.
  const deepOopFlat =
    !inp.inPosition &&
    (inp.effectiveBB ?? 0) >= OOP_DEEP_MIN_BB &&
    Math.floor(inp.betLevelFaced) === 2;
  const oopRequired = Math.min(0.8, flatRequired + OOP_REALIZATION_PENALTY);
  if (deepOopFlat && eqFull >= oopRequired) {
    return {
      action: "call",
      eqGetItIn,
      eqFull,
      flatRequired: oopRequired,
      reason: `paga fora de posição com stack profundo: equity ${p(eqFull)} ≥ preço ajustado ${p(oopRequired)}; há profundidade para realizar equity pós-flop.`,
    };
  }

  return {
    action: "fold",
    eqGetItIn,
    eqFull,
    flatRequired: deepOopFlat ? oopRequired : flatRequired,
    reason: inp.inPosition
      ? `folda: equity ${p(eqFull)} < preço ${p(flatRequired)} e não domina o range de all-in.`
      : `folda: fora de posição e sem valor suficiente para continuar (equity ${p(eqFull)} vs range cheio).`,
  };
}

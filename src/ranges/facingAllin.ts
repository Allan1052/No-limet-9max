// ---------------------------------------------------------------------------
// PILAR 1 — Decisão de "enfrentar all-in" por EQUITY REAL (não percentil).
//
// Em vez de "minha mão está no top X%?", aqui a decisão nasce da matemática que
// o irmão do Allan descreveu: cada combinação de cartas tem um VALOR (equity).
// Calculamos a equity real do herói (Monte Carlo) contra o RANGE estimado de
// quem deu o all-in — e comparamos com o preço, com DUAS correções que os
// motores simples erram:
//   1) SIDE POT: quem dá all-in curto só ganha de cada jogador até o próprio
//      valor apostado; o resto vira pote lateral. As pot odds reais são piores
//      do que "call / (pote total + call)".
//   2) Nº de oponentes que vão ao showdown (não só quem está literalmente
//      all-in): num confronto múltiplo a mão tem que bater TODOS.
//
// Este módulo é PURO e isolado (sem estado do jogo). A ligação com a mesa
// (calcular o pote disputável e o nº de oponentes) é o próximo passo.
// ---------------------------------------------------------------------------

import type { Card } from "../engine/cards";
import { equityHandVsRange, equityHandVsRangeMulti } from "../engine/equity";
import { buildTopRange } from "./build";
import { rangeCombos, type Position } from "./types";
import { requiredEquityToCall, type IcmSpot } from "./icm";

/**
 * Largura de OPEN-SHOVE (primeiro a agir vai de all-in) por POSIÇÃO. Um all-in
 * do BTN/SB é ROUBO largo; de UTG é apertado. Ignorar a posição (como antes)
 * fazia o motor tratar todo shove como apertado (~15% a 15bb) e mandar FOLDAR
 * mãos que pagam fácil contra um roubo — ex.: A7s no BB vs shove de BTN (bug/
 * calibração pega pelo Allan no quiz do Instagram). Valores em fração de 1.326
 * combos, para ~15bb; o stack curto alarga (stackWiden abaixo).
 */
const OPEN_SHOVE_BASE: Record<Position, number> = {
  UTG: 0.14,
  UTG1: 0.16,
  MP: 0.19,
  LJ: 0.23,
  HJ: 0.27,
  CO: 0.34,
  BTN: 0.46,
  SB: 0.50,
  BB: 0.32,
};

/**
 * Largura estimada do range de quem DÁ o all-in, a partir da sequência de
 * apostas (betLevelFaced), do stack e da POSIÇÃO de quem shova. Quanto mais
 * re-raises antes do all-in, mais premium é o range. Um open-shove de posição
 * tardia é largo; um 5-bet+ é AA/KK/QQ/AK.
 *   1 = abertura/open-shove · 2 = 3-bet · 3 = 4-bet · 4+ = 5-bet+.
 */
export function shoverRangePct(betLevelFaced: number, effectiveBB: number, raiserPosition?: Position): number {
  const bl = Math.max(0, Math.floor(betLevelFaced));
  if (bl >= 4) return 0.035; // 5-bet+ all-in: só o topo (AA/KK/QQ/AK)
  if (bl === 3) return 0.06; // 4-bet all-in
  if (bl === 2) return 0.11; // 3-bet all-in
  // Abertura / open-shove: base por posição + alargamento por stack curto.
  const base = raiserPosition ? OPEN_SHOVE_BASE[raiserPosition] : 0.30; // médio se desconhecido
  const stackWiden = Math.max(0, (16 - effectiveBB) * 0.02); // ≤16bb alarga
  return Math.max(0.12, Math.min(0.65, base + stackWiden));
}

export interface FacingAllinInput {
  /** Cartas do herói (2 para Hold'em). */
  hero: Card[];
  /** Nível de aposta enfrentado (1=abertura … 4+=5-bet+). Estima o range do vilão. */
  betLevelFaced: number;
  /** Quantos oponentes vão ao showdown (têm que ser TODOS batidos). >=1. */
  numContesting: number;
  /** Pote que o herói pode REALMENTE ganhar (já com side pot), antes do seu call. */
  contestablePotBB: number;
  /** Fichas (bb) que o herói paga para chamar o all-in. */
  callBB: number;
  /** Stack efetivo em bb — só para estimar o range de um open-shove. */
  effectiveBB?: number;
  /** Posição de quem deu o all-in — abre/fecha a largura do range de open-shove. */
  raiserPosition?: Position;
  /** Contexto de ICM: perto do dinheiro, a equity exigida sobe. */
  icmSpot?: IcmSpot;
  rng?: () => number;
  iterations?: number;
}

export interface FacingAllinResult {
  action: "call" | "fold";
  /** Equity real do herói (0..1) contra o range estimado, no nº de oponentes. */
  heroEquity: number;
  /** Equity exigida pelo preço (pot odds com side pot, elevada por ICM). */
  requiredEquity: number;
  /** Largura do range estimado do vilão (0..1), para exibição/auditoria. */
  villainRangePct: number;
  /** Texto com a CONTA (transparente): "equity 15% < preço 25% → fold". */
  reason: string;
}

/** Decide pagar/foldar um all-in comparando equity real × preço (com side pot + ICM). */
export function facingAllinDecision(inp: FacingAllinInput): FacingAllinResult {
  const iters = inp.iterations ?? 5000;
  const rng = inp.rng ?? Math.random;
  const pct = shoverRangePct(inp.betLevelFaced, inp.effectiveBB ?? 100, inp.raiserPosition);
  const villain = rangeCombos(buildTopRange(pct));
  const nOpp = Math.max(1, Math.floor(inp.numContesting || 1));

  const heroEquity =
    nOpp >= 2
      ? equityHandVsRangeMulti(inp.hero, villain, nOpp, [], iters, rng).equity
      : equityHandVsRange(inp.hero, villain, [], iters, rng).equity;

  // Preço com SIDE POT: o pote que o herói disputa já vem capado pela lógica de
  // side pot (contestablePotBB). Aqui é só a razão call / (pote + call).
  let requiredEquity = inp.callBB / (inp.contestablePotBB + inp.callBB);
  if (inp.icmSpot) {
    const icmReq = requiredEquityToCall(inp.icmSpot);
    if (icmReq > requiredEquity) requiredEquity = icmReq;
  }

  const call = heroEquity >= requiredEquity;
  const p = (x: number) => `${Math.round(x * 100)}%`;
  return {
    action: call ? "call" : "fold",
    heroEquity,
    requiredEquity,
    villainRangePct: pct,
    reason: `${call ? "Paga" : "Folda"}: equity ${p(heroEquity)} ${call ? "≥" : "<"} preço ${p(requiredEquity)}${
      nOpp >= 2 ? ` (${nOpp} oponentes)` : ""
    }.`,
  };
}

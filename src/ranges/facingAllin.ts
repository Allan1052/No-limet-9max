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
import { requiredEquityForDecision, icmStatesFromSpot, type IcmSpot } from "./icm";

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
export function shoverRangePct(
  betLevelFaced: number,
  effectiveBB: number,
  raiserPosition?: Position,
  shoverStackBB?: number,
): number {
  const bl = Math.max(0, Math.floor(betLevelFaced));
  if (bl >= 4) return 0.035; // 5-bet+ all-in: só o topo (AA/KK/QQ/AK)
  if (bl === 3) return 0.06; // 4-bet all-in
  if (bl === 2) return 0.11; // 3-bet all-in
  // Abertura / open-shove: base por posição + alargamento por stack curto.
  // A LARGURA depende do stack de QUEM SHOVA (não do efetivo): um vilão de 40bb
  // que dá all-in tem range mais apertado que um de 12bb. Se o stack do shover
  // não foi informado, cai no efetivo (comportamento antigo).
  const widenStack = shoverStackBB ?? effectiveBB;
  const base = raiserPosition ? OPEN_SHOVE_BASE[raiserPosition] : 0.30; // médio se desconhecido
  const stackWiden = Math.max(0, (16 - widenStack) * 0.02); // ≤16bb alarga
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
  /** Stack efetivo em bb — preço e teto do que o herói arrisca. */
  effectiveBB?: number;
  /**
   * Stack REAL de quem shova (bb), quando maior que o efetivo. Estima a LARGURA
   * do range de open-shove pela profundidade de QUEM DÁ o all-in, não pelo
   * efetivo. Ausente ⇒ usa o efetivo.
   */
  shoverStackBB?: number;
  /**
   * Fichas (bb) que o herói JÁ investiu neste lance antes de decidir (custo
   * afundado se ele foldar). Usado só no ICM incremental: quanto mais o herói já
   * comprometeu, menos equity extra o ICM exige pra continuar. Ausente/0 ⇒
   * comportamento idêntico ao legado.
   */
  heroCommittedBB?: number;
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
  /** Equity exigida no TOTAL (o maior entre preço do pote e o exigido pelo ICM). */
  requiredEquity: number;
  /** Preço do pote PURO (pot odds com side pot), SEM ICM. Pra exibir separado. */
  potOdds: number;
  /** Prêmio de ICM: quanto a premiação eleva a exigência além do preço (0 se não pesa). */
  icmPremium: number;
  /** Largura do range estimado do vilão (0..1), para exibição/auditoria. */
  villainRangePct: number;
  /** Texto com a CONTA (transparente): "equity 15% < preço 25% → fold". */
  reason: string;
}

/** Decide pagar/foldar um all-in comparando equity real × preço (com side pot + ICM). */
export function facingAllinDecision(inp: FacingAllinInput): FacingAllinResult {
  const iters = inp.iterations ?? 5000;
  const rng = inp.rng ?? Math.random;
  const pct = shoverRangePct(inp.betLevelFaced, inp.effectiveBB ?? 100, inp.raiserPosition, inp.shoverStackBB);
  const villain = rangeCombos(buildTopRange(pct));
  const nOpp = Math.max(1, Math.floor(inp.numContesting || 1));

  const heroEquity =
    nOpp >= 2
      ? equityHandVsRangeMulti(inp.hero, villain, nOpp, [], iters, rng).equity
      : equityHandVsRange(inp.hero, villain, [], iters, rng).equity;

  // PREÇO DO POTE (pot odds) com SIDE POT: o pote que o herói disputa já vem
  // capado pela lógica de side pot (contestablePotBB). É só call / (pote + call).
  // Este é o preço PURO — nunca embute ICM.
  const potOdds = inp.callBB / (inp.contestablePotBB + inp.callBB);
  // PRÊMIO DE ICM (risk premium): quanto a premiação EXIGE além do preço do pote.
  // Fica separado do preço pra não misturar as duas coisas na explicação.
  let icmRequired = potOdds;
  if (inp.icmSpot) {
    // ICM INCREMENTAL: avalia foldar-agora × pagar-agora do ponto atual, com os
    // stacks reais herói×vilão e o que o herói já investiu (custo afundado).
    // Pré-flop: os stacks do spot já vêm SEM o committed (fichas atrás).
    icmRequired = requiredEquityForDecision(
      icmStatesFromSpot(inp.icmSpot, inp.heroCommittedBB ?? 0, false),
    );
  }
  const requiredEquity = Math.max(potOdds, icmRequired);
  const icmPremium = Math.max(0, requiredEquity - potOdds); // 0 quando ICM não pesa

  const call = heroEquity >= requiredEquity;
  const p = (x: number) => `${Math.round(x * 100)}%`;
  // Explicação HONESTA: separa preço do pote do prêmio de ICM. Só cita ICM quando
  // ele realmente elevou a barra (senão "preço" é exatamente as pot odds).
  const priceText =
    icmPremium >= 0.01
      ? `preço do pote ${p(potOdds)} + ICM (prêmio de risco) → exige ${p(requiredEquity)}`
      : `preço ${p(requiredEquity)}`;
  return {
    action: call ? "call" : "fold",
    heroEquity,
    requiredEquity,
    potOdds,
    icmPremium,
    villainRangePct: pct,
    reason: `${call ? "Paga" : "Folda"}: equity ${p(heroEquity)} ${call ? "≥" : "<"} ${priceText}${
      nOpp >= 2 ? ` (${nOpp} oponentes)` : ""
    }.`,
  };
}

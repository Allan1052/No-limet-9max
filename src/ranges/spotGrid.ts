// ---------------------------------------------------------------------------
// Grade de decisão de um SPOT pré-flop (169 tipos de mão).
//
// Em vez de reimplementar a lógica de range, rodamos o PRÓPRIO motor
// (preflopDecision) para cada um dos 169 tipos de mão, usando uma mão
// representante. Assim a grade que o estudo mostra é EXATAMENTE o que o app
// recomenda no jogo — nunca diverge.
//
// Serve para os dois casos:
//   - pote não aberto  → categorias abrir / limpar / fold (RFI)
//   - enfrentando raise → categorias 3-bet / call / fold (defesa)
// ---------------------------------------------------------------------------

import { preflopDecision } from "./preflop";
import { allHandTypes, handTypeCombos, type Position } from "./types";
import type { BotProfile } from "../bots/profiles";
import type { IcmSpot } from "./icm";

/** Categoria de cor de uma célula da grade. */
export type SpotCategory = "open" | "3bet" | "4bet" | "call" | "limp" | "fold";

export interface SpotCell {
  hand: string; // "AA", "AKs", "AKo"
  category: SpotCategory;
  freq: number; // 0..1 — confiança/frequência da categoria (para a intensidade da cor)
}

export interface SpotGridContext {
  heroPosition: Position;
  effectiveBB: number;
  profile: BotProfile;
  /** Posição de quem abriu (se enfrentando raise). Ausente = pote não aberto (RFI). */
  raiserPosition?: Position;
  openSizeBB?: number;
  icmSpot?: IcmSpot;
  /** O herói abriu e enfrenta um 3-bet (grade de 4-bet / pagar / foldar). */
  threeBet?: boolean;
}

type SpotMode = "rfi" | "vs-open" | "vs-3bet";

/** Traduz a ação do motor para a categoria de cor, conforme o tipo de spot. */
function categorize(action: string, mode: SpotMode): SpotCategory {
  if (action === "fold") return "fold";
  if (mode === "vs-3bet") {
    if (action === "3bet" || action === "jam" || action === "raise") return "4bet";
    return "call";
  }
  if (mode === "vs-open") {
    if (action === "3bet" || action === "jam" || action === "raise") return "3bet";
    return "call"; // call
  }
  // Pote não aberto (RFI).
  if (action === "raise" || action === "jam") return "open";
  return "limp"; // call = limp especulativo
}

/** Frequência da categoria escolhida dentro do mix (para intensidade da cor). */
function categoryFreq(
  mix: { action: string; freq: number }[] | undefined,
  category: SpotCategory,
  mode: SpotMode,
): number {
  if (!mix || mix.length === 0) return 1;
  let sum = 0;
  for (const m of mix) if (categorize(m.action, mode) === category) sum += m.freq;
  return sum > 0 ? Math.min(1, sum) : 1;
}

/**
 * Gera a grade completa (169 células) para um spot, rodando o motor em cada
 * tipo de mão. Barato: preflopDecision é lógica de range, sem Monte Carlo.
 */
export function spotRangeGrid(ctx: SpotGridContext): Record<string, SpotCell> {
  const mode: SpotMode = ctx.threeBet ? "vs-3bet" : ctx.raiserPosition != null ? "vs-open" : "rfi";
  const out: Record<string, SpotCell> = {};
  for (const hand of allHandTypes()) {
    const cards = handTypeCombos(hand)[0]; // mão representante do tipo
    const dec = preflopDecision({
      heroPosition: ctx.heroPosition,
      hand: cards,
      effectiveBB: ctx.effectiveBB,
      profile: ctx.profile,
      raiserPosition: ctx.raiserPosition,
      openSizeBB: ctx.openSizeBB,
      icmSpot: ctx.icmSpot,
      threeBet: ctx.threeBet,
      variant: "holdem", // Default para Hold'em na grade de spots
    });
    const category = categorize(dec.action, mode);
    out[hand] = { hand, category, freq: categoryFreq(dec.mix, category, mode) };
  }
  return out;
}

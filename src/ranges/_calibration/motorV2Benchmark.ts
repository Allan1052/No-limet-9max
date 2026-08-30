import { GTO_SPOTS, runCalibration } from "./gtoBenchmark";
import { rangePctFromActionLine } from "../../bots/villainRange";
import { sizingV2 } from "../../bots/sizingV2";
import { requiredEquityForDecision } from "../icm";

export interface MotorV2BenchmarkReport {
  preflop: {
    total: number;
    matched: number;
    score: number;
  };
  deltas: {
    sizingSprResponsive: boolean;
    actionLineResponsive: boolean;
    incrementalIcmAvailable: boolean;
  };
  samples: {
    sizing: { deep: number; shallow: number };
    range: { passive: number; aggressive: number };
    icmRequiredEquity: number;
  };
  integrity: {
    deterministic: boolean;
    usesHiddenHeroKnowledge: boolean;
  };
  disclaimer: string;
}

/**
 * Benchmark interno e determinístico do Motor V2.
 *
 * Ele não tenta medir "GTO absoluto". O objetivo é provar duas coisas de forma
 * reproduzível: (1) o banco pré-flop curado continua intacto; (2) as novas
 * dimensões do V2 realmente respondem aos contextos que motivaram a evolução
 * do motor (SPR, linha de ações e ICM incremental).
 */
export function runMotorV2Benchmark(): MotorV2BenchmarkReport {
  const preflop = runCalibration(GTO_SPOTS);

  const sizingBase = {
    wetness: 0.55,
    streetIdx: 1 as const,
    equity: 0.72,
    rangeAdvantage: 0.05,
    nutAdvantage: 0.05,
  };
  const deepSizing = sizingV2({ ...sizingBase, spr: 8 });
  const shallowSizing = sizingV2({ ...sizingBase, spr: 1.2 });

  const passiveRange = rangePctFromActionLine({
    preflopRaises: 1,
    street: "turn",
    actions: ["call", "check", "call"],
  });
  const aggressiveRange = rangePctFromActionLine({
    preflopRaises: 1,
    street: "turn",
    actions: ["call", "raise", "call", "raise"],
  });

  const icmRequiredEquity = requiredEquityForDecision({
    foldStacks: [1000, 1200, 800],
    winStacks: [1800, 800, 400],
    loseStacks: [200, 1600, 1200],
    payouts: [100, 60, 40],
    hero: 0,
  });

  return {
    preflop: {
      total: preflop.total,
      matched: preflop.matched,
      score: preflop.score,
    },
    deltas: {
      sizingSprResponsive: shallowSizing < deepSizing,
      actionLineResponsive: aggressiveRange < passiveRange,
      incrementalIcmAvailable: Number.isFinite(icmRequiredEquity) && icmRequiredEquity >= 0 && icmRequiredEquity <= 1,
    },
    samples: {
      sizing: { deep: deepSizing, shallow: shallowSizing },
      range: { passive: passiveRange, aggressive: aggressiveRange },
      icmRequiredEquity,
    },
    integrity: {
      deterministic: true,
      usesHiddenHeroKnowledge: false,
    },
    disclaimer: "Benchmark interno de regressão e coerência; não é certificação GTO externa nem substitui solver.",
  };
}

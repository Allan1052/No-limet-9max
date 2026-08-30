import type { HeroAdvice } from "./analyzer";

export type CoachV2Street = "preflop" | "flop" | "turn" | "river" | string;

export interface CoachV2Context {
  street: CoachV2Street;
  potBB?: number;
  toCallBB?: number;
  spr?: number;
}

export interface CoachV2Decision {
  street: CoachV2Street;
  action: string;
  reason: string;
  contextLabel: string;
  heroPosition?: string;
  effectiveBB?: number;
  potBB?: number;
  toCallBB?: number;
  spr?: number;
  equity?: number;
  requiredEquity?: number;
  evBB?: number;
  villainRangePct?: number;
  betSizePct?: number;
  betSizeBB?: number;
  nBet?: string;
  betLevelFaced?: number;
  stageLabel?: string;
}

function streetLabel(street: string): string {
  switch (street.toLowerCase()) {
    case "preflop": return "Pré-flop";
    case "flop": return "Flop";
    case "turn": return "Turn";
    case "river": return "River";
    default: return street;
  }
}

function facedLabel(level: number | undefined): string | undefined {
  if (level === undefined) return undefined;
  if (level >= 3) return "enfrentando 4-bet";
  if (level === 2) return "enfrentando 3-bet";
  if (level === 1) return "enfrentando raise";
  return undefined;
}

function fmtBB(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}bb`;
}

export function buildCoachV2Decision(advice: HeroAdvice, context: CoachV2Context): CoachV2Decision {
  const parts: string[] = [streetLabel(context.street)];
  if (advice.heroPosition) parts.push(advice.heroPosition);
  if (advice.effectiveBB !== undefined) parts.push(fmtBB(advice.effectiveBB));
  const faced = facedLabel(advice.betLevelFaced);
  if (faced) parts.push(faced);

  return {
    street: context.street,
    action: advice.action,
    reason: advice.reason,
    contextLabel: parts.join(" · "),
    heroPosition: advice.heroPosition,
    effectiveBB: advice.effectiveBB,
    potBB: context.potBB ?? advice.potBB,
    toCallBB: context.toCallBB,
    spr: context.spr,
    equity: advice.equity,
    requiredEquity: advice.potOdds,
    evBB: advice.evBB,
    villainRangePct: advice.villainRangePct,
    betSizePct: advice.betSizePct,
    betSizeBB: advice.betSizeBB,
    nBet: advice.nBet,
    betLevelFaced: advice.betLevelFaced,
    stageLabel: advice.stageLabel,
  };
}

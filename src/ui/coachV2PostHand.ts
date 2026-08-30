import type { FeedbackItem } from "../feedback/analyzer";

export type CoachV2PostHandMode = "simple" | "technical";

export interface CoachV2PostHandDecisionView {
  heroLine: string;
  coachLine: string;
  reason: string;
  metrics: string[];
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function signedBB(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded >= 0 ? "+" : ""}${rounded}bb`;
}

export function buildCoachV2PostHandDecision(
  item: FeedbackItem,
  mode: CoachV2PostHandMode,
): CoachV2PostHandDecisionView {
  const metrics: string[] = [];

  if (mode === "technical") {
    if (item.equity !== undefined) metrics.push(`Equity ${percent(item.equity)}`);
    if (item.potOdds !== undefined) metrics.push(`Preço ${percent(item.potOdds)}`);
    if (item.evBB !== undefined) metrics.push(`EV ${signedBB(item.evBB)}`);
    if (item.betSizePct !== undefined && item.betSizeBB !== undefined) {
      metrics.push(`Sizing ~${percent(item.betSizePct)} · ${item.betSizeBB}bb`);
    }
  }

  return {
    heroLine: `Você fez: ${item.heroAction}`,
    coachLine: `Coach V2: ${item.advice}`,
    reason: item.text,
    metrics,
  };
}

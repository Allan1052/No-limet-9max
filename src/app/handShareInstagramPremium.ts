import type { HandShareData } from "./handShareCard";

export const instagramPremiumLayout = {
  width: 1080,
  height: 1350,
  aspectRatio: "4:5",
  heroCardsEmphasis: "primary",
  decisionComparison: "hero-vs-coach",
  metricsStyle: "chips",
  brandSignature: "Call ou Fold · Coach V2",
} as const;

export interface InstagramPremiumDecisionView {
  heroAction: string;
  coachAction: string;
  metrics: string[];
  signature: string;
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function signedBB(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded >= 0 ? "+" : ""}${rounded}bb`;
}

export function buildInstagramPremiumDecisionView(data: HandShareData): InstagramPremiumDecisionView {
  const metrics: string[] = [];
  if (data.equity !== undefined) metrics.push(`Equity ${pct(data.equity)}`);
  if (data.potOdds !== undefined) metrics.push(`Preço ${pct(data.potOdds)}`);
  if (data.evBB !== undefined) metrics.push(`EV ${signedBB(data.evBB)}`);

  return {
    heroAction: `VOCÊ: ${data.heroAction}`,
    coachAction: `COACH V2: ${data.coachAction}`,
    metrics,
    signature: instagramPremiumLayout.brandSignature,
  };
}

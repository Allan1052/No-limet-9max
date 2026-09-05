export type TournamentFormatV3 = "VANILLA" | "PKO" | "MYSTERY_BOUNTY";
export type TournamentStageV3 = "EARLY" | "MIDDLE" | "BUBBLE" | "IN_THE_MONEY" | "FINAL_TABLE";

export interface CoverageRelation {
  covers: string;
  covered: string;
}

export interface TournamentContextV3 {
  format: TournamentFormatV3;
  stage: TournamentStageV3;
  fieldRemainingPct?: number;
  positions: string[];
  stacksBB: Record<string, number>;
  effectiveStackBB: number;
  coverage: CoverageRelation[];
  payouts?: number[];
  bounties?: Record<string, number>;
}

function stableCoverage(x: CoverageRelation[]): string {
  return x.map((r) => `${r.covers}>${r.covered}`).sort().join("|");
}

function stableStacks(x: Record<string, number>): string {
  return Object.entries(x)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([position, stack]) => `${position}:${stack}`)
    .join("|");
}

export function sameCertifiedContext(a: TournamentContextV3, b: TournamentContextV3): boolean {
  return a.format === b.format
    && a.stage === b.stage
    && a.fieldRemainingPct === b.fieldRemainingPct
    && a.effectiveStackBB === b.effectiveStackBB
    && JSON.stringify(a.positions) === JSON.stringify(b.positions)
    && stableStacks(a.stacksBB) === stableStacks(b.stacksBB)
    && stableCoverage(a.coverage) === stableCoverage(b.coverage);
}

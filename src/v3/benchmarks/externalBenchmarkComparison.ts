import { BLIND_WAR_BENCHMARKS } from "./blindWar";
import { BUBBLE_STEAL_BENCHMARKS } from "./bubbleSteal";
import { ICM_RESTEAL_STRUCTURAL_BENCHMARKS } from "./icmResteal";
import { ICM_SQUEEZE_ENVIRONMENT_BENCHMARKS } from "./icmSqueeze";
import type { ExternalBenchmarkFamily } from "./externalBenchmarkRegistry";

export type V2ExternalComparisonStatus = "NOT_EXACTLY_COMPARABLE";
export type V3ExternalComparisonStatus =
  | "EXACT_STRUCTURAL_FIXTURE"
  | "HAND_CERTIFIED_PARTIAL";

export interface ExternalBenchmarkComparisonRow {
  id: string;
  family: ExternalBenchmarkFamily;
  solver: "GTO_WIZARD";
  solverEvidence: "CERTIFIED";
  v2: {
    status: V2ExternalComparisonStatus;
    delta?: number;
    reason: string;
  };
  v3: {
    status: V3ExternalComparisonStatus;
    exactFixtureMatch: true;
    handLevelCertified: boolean;
  };
}

const v2NotComparable = () => ({
  status: "NOT_EXACTLY_COMPARABLE" as const,
  reason:
    "The legacy V2 harness cannot reproduce the full certified solver context exactly; no numeric delta is reported.",
});

const row = (
  id: string,
  family: ExternalBenchmarkFamily,
  handLevelCertified = false,
): ExternalBenchmarkComparisonRow => ({
  id,
  family,
  solver: "GTO_WIZARD",
  solverEvidence: "CERTIFIED",
  v2: v2NotComparable(),
  v3: {
    status: handLevelCertified ? "HAND_CERTIFIED_PARTIAL" : "EXACT_STRUCTURAL_FIXTURE",
    exactFixtureMatch: true,
    handLevelCertified,
  },
});

/**
 * Fixture-level comparison inventory for the current external validation set.
 *
 * "Exact structural fixture" means the solver-exposed context/aggregate is
 * preserved exactly in V3 benchmark data. It does not imply a complete 169-hand
 * strategy. Numeric V2 deltas stay absent until V2 can reproduce the identical
 * solver context instead of an approximation.
 */
export const EXTERNAL_BENCHMARK_COMPARISON: ExternalBenchmarkComparisonRow[] = [
  ...BLIND_WAR_BENCHMARKS.map((fixture) =>
    row(fixture.id, "BLIND_WAR", fixture.id === "BW5" && Boolean(fixture.handActionFreq)),
  ),
  ...BUBBLE_STEAL_BENCHMARKS.map((fixture) => row(fixture.id, "BUBBLE_STEAL")),
  ...ICM_RESTEAL_STRUCTURAL_BENCHMARKS.map((fixture) => row(fixture.id, "ICM_RESTEAL")),
  ...ICM_SQUEEZE_ENVIRONMENT_BENCHMARKS.map((fixture) => row(fixture.id, "ICM_SQUEEZE")),
];

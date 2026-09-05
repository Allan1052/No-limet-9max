import { BLIND_WAR_BENCHMARKS } from "./blindWar";
import { BUBBLE_STEAL_BENCHMARKS } from "./bubbleSteal";
import { ICM_PROGRESSION_BENCHMARKS } from "./icmProgression";
import { ICM_RESTEAL_STRUCTURAL_BENCHMARKS } from "./icmResteal";
import { ICM_SQUEEZE_ENVIRONMENT_BENCHMARKS } from "./icmSqueeze";

export type ExternalBenchmarkFamily =
  | "BLIND_WAR"
  | "BUBBLE_STEAL"
  | "ICM_PROGRESSION"
  | "ICM_RESTEAL"
  | "ICM_SQUEEZE";

export interface ExternalBenchmarkFamilyRegistryEntry {
  family: ExternalBenchmarkFamily;
  fixtureCount: number;
  solver: "GTO_WIZARD";
  evidenceLevel: "CERTIFIED";
  v3PromotionStatus: "STRUCTURAL_ONLY" | "HAND_CERTIFIED_PARTIAL";
  v2ExactComparable: false;
}

/**
 * Consolidated inventory of solver-certified external benchmark families.
 *
 * This registry intentionally distinguishes structural certification from
 * hand-level promotion. It also keeps V2 exact-comparability false until an
 * exact-context V2 harness exists for the same external nodes.
 */
export const EXTERNAL_BENCHMARK_REGISTRY: ExternalBenchmarkFamilyRegistryEntry[] = [
  {
    family: "BLIND_WAR",
    fixtureCount: BLIND_WAR_BENCHMARKS.length,
    solver: "GTO_WIZARD",
    evidenceLevel: "CERTIFIED",
    v3PromotionStatus: "HAND_CERTIFIED_PARTIAL",
    v2ExactComparable: false,
  },
  {
    family: "BUBBLE_STEAL",
    fixtureCount: BUBBLE_STEAL_BENCHMARKS.length,
    solver: "GTO_WIZARD",
    evidenceLevel: "CERTIFIED",
    v3PromotionStatus: "STRUCTURAL_ONLY",
    v2ExactComparable: false,
  },
  {
    family: "ICM_PROGRESSION",
    fixtureCount: ICM_PROGRESSION_BENCHMARKS.length,
    solver: "GTO_WIZARD",
    evidenceLevel: "CERTIFIED",
    v3PromotionStatus: "STRUCTURAL_ONLY",
    v2ExactComparable: false,
  },
  {
    family: "ICM_RESTEAL",
    fixtureCount: ICM_RESTEAL_STRUCTURAL_BENCHMARKS.length,
    solver: "GTO_WIZARD",
    evidenceLevel: "CERTIFIED",
    v3PromotionStatus: "STRUCTURAL_ONLY",
    v2ExactComparable: false,
  },
  {
    family: "ICM_SQUEEZE",
    fixtureCount: ICM_SQUEEZE_ENVIRONMENT_BENCHMARKS.length,
    solver: "GTO_WIZARD",
    evidenceLevel: "CERTIFIED",
    v3PromotionStatus: "STRUCTURAL_ONLY",
    v2ExactComparable: false,
  },
];

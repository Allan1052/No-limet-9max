import type { EvidenceSource } from "../evidence";

export interface IcmProgressionBenchmark {
  id: string;
  heroPosition: "BB";
  villainPosition: "LJ";
  effectiveStackBB: number;
  stageModel: "CHIP_EV_EARLY" | "ICM_HALFWAY";
  fieldRemainingPct?: number;
  foldFreq: number;
  completeHandMatrix: false;
  handActionFreq?: undefined;
  evidence: EvidenceSource;
  notes: string[];
}

const SOURCE_NOTE =
  "GTO Wizard — When does ICM become significant in MTTs? (2023-01-05)";

export const ICM_PROGRESSION_BENCHMARKS: IcmProgressionBenchmark[] = [
  {
    id: "IP1_BB20_VS_LJ_EARLY",
    heroPosition: "BB",
    villainPosition: "LJ",
    effectiveStackBB: 20,
    stageModel: "CHIP_EV_EARLY",
    foldFreq: 0.196,
    completeHandMatrix: false,
    evidence: {
      level: "CERTIFIED",
      solver: "GTO_WIZARD",
      note: SOURCE_NOTE,
    },
    notes: [
      "Published 20bb symmetric BB defence versus LJ folds 19.6% in the chipEV/early reference.",
      "This fixture certifies the aggregate fold frequency only; it does not infer a complete hand-action matrix.",
    ],
  },
  {
    id: "IP2_BB20_VS_LJ_HALFWAY",
    heroPosition: "BB",
    villainPosition: "LJ",
    effectiveStackBB: 20,
    stageModel: "ICM_HALFWAY",
    fieldRemainingPct: 50,
    foldFreq: 0.355,
    completeHandMatrix: false,
    evidence: {
      level: "CERTIFIED",
      solver: "GTO_WIZARD",
      note: SOURCE_NOTE,
    },
    notes: [
      "Published halfway-tournament 20bb symmetric BB defence versus LJ folds 35.5%.",
      "The 15.9 percentage-point increase versus the early reference captures progressive ICM tightening without inventing hand-level frequencies.",
    ],
  },
];

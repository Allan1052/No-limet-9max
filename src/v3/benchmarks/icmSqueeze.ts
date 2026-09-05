import type { EvidenceSource } from "../evidence";

export interface IcmSqueezeEnvironmentBenchmark {
  id: string;
  heroPosition: "BB";
  openerPosition: "CO";
  callerPosition: "BTN";
  effectiveStackBB: number;
  stageModel: "CHIP_EV" | "ICM_NEAR_BUBBLE";
  totalSqueezeFreq: number;
  shoveFreq?: number;
  nonAllInRaiseSizeBB?: number;
  completeHandMatrix: false;
  handActionFreq?: undefined;
  evidence: EvidenceSource;
  notes: string[];
}

const SOURCE_NOTE =
  "GTO Wizard — How to Construct a Squeezing Range (official article; 40bb CO open, BTN call, BB squeeze comparison across chip EV and near-bubble ICM)";

export const ICM_SQUEEZE_ENVIRONMENT_BENCHMARKS: IcmSqueezeEnvironmentBenchmark[] = [
  {
    id: "IS1_CEV_40BB_CO_BTN",
    heroPosition: "BB",
    openerPosition: "CO",
    callerPosition: "BTN",
    effectiveStackBB: 40,
    stageModel: "CHIP_EV",
    totalSqueezeFreq: 0.121,
    completeHandMatrix: false,
    evidence: {
      level: "CERTIFIED",
      solver: "GTO_WIZARD",
      note: SOURCE_NOTE,
    },
    notes: [
      "Official aggregate: BB squeezes 12.1% at 40bb in the chip-EV comparison.",
      "No chip-EV shove split is recorded because the source text used for certification does not support an exact shove frequency here.",
      "No hand-level action matrix is inferred from aggregate prose.",
    ],
  },
  {
    id: "IS2_BUBBLE_40BB_CO_BTN",
    heroPosition: "BB",
    openerPosition: "CO",
    callerPosition: "BTN",
    effectiveStackBB: 40,
    stageModel: "ICM_NEAR_BUBBLE",
    totalSqueezeFreq: 0.107,
    shoveFreq: 0.026,
    nonAllInRaiseSizeBB: 8.5,
    completeHandMatrix: false,
    evidence: {
      level: "CERTIFIED",
      solver: "GTO_WIZARD",
      note: SOURCE_NOTE,
    },
    notes: [
      "Official near-bubble aggregate: BB squeezes 10.7% total at 40bb.",
      "The all-in squeeze branch is 2.6% and the non-all-in raise size is 8.5bb.",
      "This fixture certifies only the exposed environment-level aggregates, not a complete hand matrix.",
    ],
  },
];

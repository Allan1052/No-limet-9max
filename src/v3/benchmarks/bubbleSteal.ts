import type { EvidenceSource } from "../evidence";

export interface BubbleStealBenchmark {
  id: string;
  stage: "BUBBLE";
  fieldSize: number;
  averageStackBB: number;
  heroPosition: "BTN";
  heroStackBB: number;
  sbStackBB: number;
  bbStackBB: number;
  coverage: {
    SB: "COVERS_HERO";
    BB: "COVERS_HERO";
  };
  openRaiseFreq: number;
  openJamFreq: number;
  totalContinueFreq: number;
  earlierStageOpenFreqApprox: number;
  bubbleFactors: {
    BTN: number;
    BB_vs_BTN: number;
    SB_vs_BTN: number;
  };
  completeHandMatrix: false;
  handActionFreq?: undefined;
  evidence: EvidenceSource;
  notes: string[];
}

const SOURCE_NOTE =
  "GTO Wizard — Short Stack Stealing on the Bubble (Andrew Brokos, 2024-11-05)";

export const BUBBLE_STEAL_BENCHMARKS: BubbleStealBenchmark[] = [
  {
    id: "BS1_BTN18_BUBBLE_1000",
    stage: "BUBBLE",
    fieldSize: 1000,
    averageStackBB: 35,
    heroPosition: "BTN",
    heroStackBB: 18,
    sbStackBB: 41,
    bbStackBB: 26,
    coverage: {
      SB: "COVERS_HERO",
      BB: "COVERS_HERO",
    },
    openRaiseFreq: 0.17,
    openJamFreq: 0.02,
    totalContinueFreq: 0.19,
    earlierStageOpenFreqApprox: 0.5,
    bubbleFactors: {
      BTN: 1.98,
      BB_vs_BTN: 1.3,
      SB_vs_BTN: 1.1,
    },
    completeHandMatrix: false,
    evidence: {
      level: "CERTIFIED",
      solver: "GTO_WIZARD",
      note: SOURCE_NOTE,
    },
    notes: [
      "Official near-bubble example: BTN 18bb, SB 41bb, BB 26bb in a 1000-player MTT with 35bb average stack.",
      "BTN opens 17% and jams 2%, for 19% total voluntary entry, versus approximately 50% opening frequency earlier in the tournament.",
      "Published bubble factors are BTN 1.98, BB versus BTN 1.3, and SB versus BTN 1.1.",
      "Both blinds cover the BTN; this fixture certifies environment-level frequencies and coverage, not a complete hand-action matrix.",
    ],
  },
];

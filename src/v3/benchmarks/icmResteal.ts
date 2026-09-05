import type { EvidenceSource } from "../evidence";

export interface IcmRestealStructuralBenchmark {
  id: string;
  heroPosition: "BB" | "SB";
  villainPosition: "BTN";
  effectiveStackBB: number;
  openSizeBB: number;
  stageModel: "CHIP_EV" | "ICM";
  fieldRemainingPct?: number;
  shoveFreqApprox: number;
  completeActionFreq: false;
  evidence: EvidenceSource;
  notes: string[];
}

const SOURCE_NOTE =
  "GTO Wizard — How ICM Impacts Restealing From The Blinds (Andrew Brokos, 2023-04-17)";

export const ICM_RESTEAL_STRUCTURAL_BENCHMARKS: IcmRestealStructuralBenchmark[] = [
  {
    id: "IR1_CEV_40BB",
    heroPosition: "BB",
    villainPosition: "BTN",
    effectiveStackBB: 40,
    openSizeBB: 2.3,
    stageModel: "CHIP_EV",
    shoveFreqApprox: 0.06,
    completeActionFreq: false,
    evidence: {
      level: "CERTIFIED",
      solver: "GTO_WIZARD",
      note: SOURCE_NOTE,
    },
    notes: [
      "Official prose states BB shoves approximately 6% versus BTN 2.3bb at 40bb in chip EV.",
      "Candidate shove hands include small pairs, AQo and AJo; no hand-level frequency is certified here.",
      "The source does not expose a complete action-frequency vector in text, so this fixture is structural only.",
    ],
  },
  {
    id: "IR2_ICM25_40BB",
    heroPosition: "BB",
    villainPosition: "BTN",
    effectiveStackBB: 40,
    openSizeBB: 2.3,
    stageModel: "ICM",
    fieldRemainingPct: 25,
    shoveFreqApprox: 0,
    completeActionFreq: false,
    evidence: {
      level: "CERTIFIED",
      solver: "GTO_WIZARD",
      note: SOURCE_NOTE,
    },
    notes: [
      "Same 40bb BB-vs-BTN scenario under ICM with 25% of the field remaining.",
      "Official prose explicitly states that all of the chip-EV shoves are gone.",
      "Most former shove hands move toward calls; as ICM rises, shove -> smaller 3bet -> call/fold is a structural action-family shift.",
      "No complete action-frequency vector or hand-level mix is inferred from prose.",
    ],
  },
];

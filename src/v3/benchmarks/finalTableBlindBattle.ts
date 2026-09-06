import type { EvidenceSource } from "../evidence";

export interface FinalTableBlindBattleBenchmark {
  id: string;
  stage: "FINAL_TABLE";
  sbStackBB: number;
  bbStackBB: number;
  sbAction: "LIMP";
  bbRiskPremiumPct?: number;
  sbRiskPremiumPct?: number;
  raise7Freq: number;
  raise3_5Freq: number;
  shoveFreqApprox?: number;
  combinedRaiseFreqApprox?: number;
  completeHandMatrix: false;
  handActionFreq?: undefined;
  evidence: EvidenceSource;
  notes: string[];
}

const SOURCE_NOTE = "GTO Wizard — ICM and Blind Battles: The Big Blind (2023-05-02)";

const evidence = (): EvidenceSource => ({
  level: "CERTIFIED",
  solver: "GTO_WIZARD",
  note: SOURCE_NOTE,
});

export const FINAL_TABLE_BLIND_BATTLE_BENCHMARKS: FinalTableBlindBattleBenchmark[] = [
  {
    id: "FTBB1_SYMMETRIC_35",
    stage: "FINAL_TABLE",
    sbStackBB: 35,
    bbStackBB: 35,
    sbAction: "LIMP",
    raise7Freq: 0.05,
    raise3_5Freq: 0.24,
    completeHandMatrix: false,
    evidence: evidence(),
    notes: [
      "Symmetric 35bb final-table reference after SB limps.",
      "Published BB response uses the 7bb raise about 5% and the 3.5bb raise about 24%.",
    ],
  },
  {
    id: "FTBB2_BB_COVERS_40_VS_35",
    stage: "FINAL_TABLE",
    sbStackBB: 35,
    bbStackBB: 40,
    sbAction: "LIMP",
    bbRiskPremiumPct: 11.3,
    sbRiskPremiumPct: 13.1,
    raise7Freq: 0.07,
    raise3_5Freq: 0.28,
    completeHandMatrix: false,
    evidence: evidence(),
    notes: [
      "BB covers SB 40bb to 35bb; published BB risk premium is 11.3% versus 12.2% in the symmetric reference, while SB risk premium is 13.1%.",
      "After the limp, BB uses 7bb about 7% and 3.5bb about 28%.",
    ],
  },
  {
    id: "FTBB3_SB_COVERS_100_VS_35",
    stage: "FINAL_TABLE",
    sbStackBB: 100,
    bbStackBB: 35,
    sbAction: "LIMP",
    bbRiskPremiumPct: 15.2,
    raise7Freq: 0,
    raise3_5Freq: 0.29,
    shoveFreqApprox: 0.04,
    combinedRaiseFreqApprox: 0.34,
    completeHandMatrix: false,
    evidence: evidence(),
    notes: [
      "SB covers BB 100bb to 35bb; the published BB risk premium rises to 15.2%.",
      "BB no longer uses the 7bb raise, shoves about 4%, raises to 3.5bb about 29%, and raises roughly 34% in total.",
      "No complete hand matrix is inferred from the published aggregate frequencies.",
    ],
  },
];

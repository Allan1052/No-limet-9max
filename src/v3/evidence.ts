export type EvidenceLevel = "CERTIFIED" | "PARTIAL" | "CALIBRATED" | "FALLBACK_V2";

export interface EvidenceSource {
  level: EvidenceLevel;
  solver?: "GTO_WIZARD" | "HRC";
  videoId?: string;
  timestamp?: string;
  note?: string;
}

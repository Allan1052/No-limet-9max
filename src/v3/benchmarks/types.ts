import type { EvidenceSource } from "../evidence";
import type { TournamentContextV3 } from "../tournamentContext";

export type BlindWarAction = "fold" | "limp" | "raise" | "shove" | "check" | "call";
export type HandActionFreq = Record<string, number>;

export interface ExternalBenchmarkFixture {
  id: string;
  node: string;
  evidence: EvidenceSource;
  context: TournamentContextV3;
  priorActions: string[];
  actionFreq: Record<string, number>;
  actionSizeBB?: Partial<Record<BlindWarAction, number>>;
  tolerance: number;
  handActionFreq?: Record<string, HandActionFreq>;
  notes?: string[];
}

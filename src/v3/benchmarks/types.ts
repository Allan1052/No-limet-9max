import type { EvidenceSource } from "../evidence";
import type { TournamentContextV3 } from "../tournamentContext";

export type BlindWarAction = "fold" | "limp" | "raise" | "shove" | "check" | "call";
export type HandActionFreq = Record<string, number>;
export type HandSizingFreq = Record<number, number>;

export interface CertifiedSizingOption {
  sizeBB: number;
  freq?: number;
}

export type ActionSizingDistribution = Partial<
  Record<BlindWarAction, CertifiedSizingOption[]>
>;

export interface ExternalBenchmarkFixture {
  id: string;
  node: string;
  evidence: EvidenceSource;
  context: TournamentContextV3;
  priorActions: string[];
  // Frequências GLOBAIS do node (a barra do solver). OPCIONAL: às vezes a barra
  // global não é numericamente legível na fonte, mas as células MÃO-A-MÃO são —
  // e são elas que dirigem o live. Um fixture precisa ter actionFreq OU
  // handActionFreq (o validador cobra isso). Nunca inventar a barra global.
  actionFreq?: Record<string, number>;
  actionSizing?: ActionSizingDistribution;
  tolerance: number;
  handActionFreq?: Record<string, HandActionFreq>;
  handSizingFreq?: Record<string, Partial<Record<BlindWarAction, HandSizingFreq>>>;
  notes?: string[];
}

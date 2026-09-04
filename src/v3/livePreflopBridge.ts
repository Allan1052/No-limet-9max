import { BLIND_WAR_BENCHMARKS } from "./benchmarks/blindWar";
import type { ExternalBenchmarkFixture, HandActionFreq } from "./benchmarks/types";
import type { EvidenceSource } from "./evidence";
import { sameCertifiedContext, type TournamentContextV3 } from "./tournamentContext";

export type V3SemanticPreflopAction =
  | "fold"
  | "limp"
  | "raise"
  | "call"
  | "3bet"
  | "jam"
  | "shove"
  | "check";

export interface LivePreflopV3Query {
  node: string;
  context: TournamentContextV3;
  priorActions: string[];
  handType: string;
}

export interface LivePreflopV3Result {
  source: "V3_CERTIFIED_HAND" | "FALLBACK_V2";
  benchmarkId?: string;
  semanticMix?: Partial<Record<V3SemanticPreflopAction, number>>;
  actionSizeBB?: Partial<Record<V3SemanticPreflopAction, number>>;
  evidence: EvidenceSource;
}

function sameActions(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((action, index) => action === b[index]);
}

function validateHandMix(mix: HandActionFreq): void {
  const entries = Object.entries(mix);
  const valid = entries.length > 0
    && entries.every(([, freq]) => Number.isFinite(freq) && freq >= 0 && freq <= 1);
  const total = entries.reduce((sum, [, freq]) => sum + freq, 0);

  if (!valid || Math.abs(total - 1) > 1e-6) {
    throw new Error(`Invalid certified hand-level mix: frequencies must be finite in [0,1] and sum to 1 (got ${total}).`);
  }
}

export function livePreflopFromFixtures(
  fixtures: ExternalBenchmarkFixture[],
  query: LivePreflopV3Query,
): LivePreflopV3Result {
  const fixture = fixtures.find((candidate) =>
    candidate.node === query.node
    && sameActions(candidate.priorActions, query.priorActions)
    && sameCertifiedContext(candidate.context, query.context)
  );

  const handMix = fixture?.handActionFreq?.[query.handType];
  if (!fixture || fixture.evidence.level !== "CERTIFIED" || !handMix) {
    return {
      source: "FALLBACK_V2",
      evidence: {
        level: "FALLBACK_V2",
        note: "No exact certified hand-level V3 strategy for this hand and context.",
      },
    };
  }

  validateHandMix(handMix);

  return {
    source: "V3_CERTIFIED_HAND",
    benchmarkId: fixture.id,
    semanticMix: { ...handMix },
    actionSizeBB: fixture.actionSizeBB ? { ...fixture.actionSizeBB } : undefined,
    evidence: fixture.evidence,
  };
}

export function livePreflopV3(query: LivePreflopV3Query): LivePreflopV3Result {
  return livePreflopFromFixtures(BLIND_WAR_BENCHMARKS, query);
}

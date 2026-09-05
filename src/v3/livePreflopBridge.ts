import { BLIND_WAR_BENCHMARKS } from "./benchmarks/blindWar";
import type {
  ActionSizingDistribution,
  ExternalBenchmarkFixture,
  HandActionFreq,
  HandSizingFreq,
} from "./benchmarks/types";
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
  actionSizing?: ActionSizingDistribution;
  handSizingMix?: Partial<Record<V3SemanticPreflopAction, HandSizingFreq>>;
  evidence: EvidenceSource;
}

function sameActions(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((action, index) => action === b[index]);
}

function validateUnitMix(entries: Array<[string, number]>, label: string): void {
  const valid = entries.length > 0
    && entries.every(([, freq]) => Number.isFinite(freq) && freq >= 0 && freq <= 1);
  const total = entries.reduce((sum, [, freq]) => sum + freq, 0);

  if (!valid || Math.abs(total - 1) > 1e-6) {
    throw new Error(`Invalid certified ${label}: frequencies must be finite in [0,1] and sum to 1 (got ${total}).`);
  }
}

function validateHandMix(mix: HandActionFreq): void {
  validateUnitMix(Object.entries(mix), "hand-level mix");
}

function validateActionSizing(actionSizing?: ActionSizingDistribution): void {
  if (!actionSizing) return;

  for (const [action, options] of Object.entries(actionSizing)) {
    if (!options || options.length === 0) {
      throw new Error(`Invalid certified sizing for ${action}: at least one sizing option is required.`);
    }
    if (!options.every(({ sizeBB, freq }) =>
      Number.isFinite(sizeBB)
      && sizeBB > 0
      && (action !== "raise" || sizeBB > 1)
      && (freq === undefined || (Number.isFinite(freq) && freq >= 0 && freq <= 1))
    )) {
      throw new Error(`Invalid certified sizing for ${action}: sizes/frequencies must be finite and valid.`);
    }

    const declared = options.filter((option) => option.freq !== undefined);
    if (declared.length === options.length) {
      const total = declared.reduce((sum, option) => sum + (option.freq ?? 0), 0);
      if (Math.abs(total - 1) > 1e-6) {
        throw new Error(`Invalid certified sizing for ${action}: declared sizing frequencies must sum to 1 (got ${total}).`);
      }
    }
  }
}

function validateHandSizing(
  fixture: ExternalBenchmarkFixture,
  handType: string,
  handMix: HandActionFreq,
): Partial<Record<V3SemanticPreflopAction, HandSizingFreq>> | undefined {
  const handSizing = fixture.handSizingFreq?.[handType] as
    | Partial<Record<V3SemanticPreflopAction, HandSizingFreq>>
    | undefined;
  if (!handSizing) return undefined;

  for (const [action, mix] of Object.entries(handSizing)) {
    if (!mix) continue;
    const actionFreq = handMix[action] ?? 0;
    if (!Number.isFinite(actionFreq) || actionFreq <= 0) {
      throw new Error(`Invalid certified sizing for ${handType}/${action}: hand sizing exists for an action this hand does not take.`);
    }

    validateUnitMix(Object.entries(mix), `hand-level sizing mix for ${action}`);

    const certifiedSizes = new Set(
      (fixture.actionSizing?.[action as keyof ActionSizingDistribution] ?? []).map((option) => option.sizeBB),
    );
    for (const sizeText of Object.keys(mix)) {
      const sizeBB = Number(sizeText);
      if (!Number.isFinite(sizeBB) || !certifiedSizes.has(sizeBB)) {
        throw new Error(`Invalid certified sizing for ${handType}/${action}: ${sizeText}bb is not in the globally certified sizing set.`);
      }
    }
  }

  return handSizing;
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
  validateActionSizing(fixture.actionSizing);
  const handSizingMix = validateHandSizing(fixture, query.handType, handMix);

  return {
    source: "V3_CERTIFIED_HAND",
    benchmarkId: fixture.id,
    semanticMix: { ...handMix },
    actionSizing: fixture.actionSizing,
    handSizingMix,
    evidence: fixture.evidence,
  };
}

export function livePreflopV3(query: LivePreflopV3Query): LivePreflopV3Result {
  return livePreflopFromFixtures(BLIND_WAR_BENCHMARKS, query);
}

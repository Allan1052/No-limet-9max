import { BLIND_WAR_BENCHMARKS } from "./benchmarks/blindWar";
import type { ExternalBenchmarkFixture } from "./benchmarks/types";
import type { EvidenceSource } from "./evidence";
import { sameCertifiedContext, type TournamentContextV3 } from "./tournamentContext";

export interface BlindWarStrategyInput {
  node: string;
  context: TournamentContextV3;
  priorActions: string[];
}

export interface BlindWarStrategyResult {
  benchmarkId?: string;
  evidence: EvidenceSource;
  actionFreq: Record<string, number>;
  tolerance?: number;
}

function sameActions(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((action, index) => action === b[index]);
}

function exactBenchmarkMatch(
  input: BlindWarStrategyInput,
  fixture: ExternalBenchmarkFixture,
): boolean {
  return fixture.node === input.node
    && sameActions(fixture.priorActions, input.priorActions)
    && sameCertifiedContext(fixture.context, input.context);
}

export function blindWarStrategyV3(input: BlindWarStrategyInput): BlindWarStrategyResult {
  const fixture = BLIND_WAR_BENCHMARKS.find((candidate) => exactBenchmarkMatch(input, candidate));

  if (!fixture) {
    return {
      evidence: {
        level: "FALLBACK_V2",
        note: "No exact certified Blind War benchmark for this context.",
      },
      actionFreq: {},
    };
  }

  return {
    benchmarkId: fixture.id,
    evidence: fixture.evidence,
    actionFreq: { ...fixture.actionFreq },
    tolerance: fixture.tolerance,
  };
}

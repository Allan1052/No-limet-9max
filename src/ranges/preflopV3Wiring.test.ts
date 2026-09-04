import { describe, expect, it } from "vitest";
import { cardsFromString } from "../engine/cards";
import { BASELINE_PROFILE } from "../bots/profiles";
import { BLIND_WAR_BENCHMARKS } from "../v3/benchmarks/blindWar";
import type { LivePreflopV3Result } from "../v3/livePreflopBridge";
import { preflopDecision } from "./preflop";
import {
  mapCertifiedV3PreflopDecision,
  preflopDecisionV3Aware,
} from "./preflopV3Adapter";

function sbBase() {
  return {
    heroPosition: "SB" as const,
    hand: cardsFromString("AsKd"),
    effectiveBB: 20,
    profile: BASELINE_PROFILE,
    variant: "holdem" as const,
  };
}

describe("Motor V3 — wiring pré-flop controlado", () => {
  it("global-only BW1 does not override the existing V2 hand decision", () => {
    const ctx = sbBase();
    const legacy = preflopDecision(ctx);
    const bw1 = BLIND_WAR_BENCHMARKS[0];
    const withV3 = preflopDecisionV3Aware({
      ...ctx,
      v3Node: bw1.node,
      v3TournamentContext: bw1.context,
      v3PriorActions: bw1.priorActions,
    });

    expect(withV3.action).toBe(legacy.action);
    expect(withV3.sizeBB).toBe(legacy.sizeBB);
    expect(withV3.v3BenchmarkId).toBeUndefined();
  });

  it("certified limp maps to legal call-to-1BB plus explicit limp semantics", () => {
    const certified: LivePreflopV3Result = {
      source: "V3_CERTIFIED_HAND",
      benchmarkId: "TEST_LIMP",
      evidence: {
        level: "CERTIFIED",
        solver: "GTO_WIZARD",
        videoId: "test",
        timestamp: "00:00",
      },
      semanticMix: { limp: 1 },
    };

    const mapped = mapCertifiedV3PreflopDecision("72o", certified, 20);
    expect(mapped?.action).toBe("call");
    expect(mapped?.sizeBB).toBe(1);
    expect(mapped?.semanticAction).toBe("limp");
    expect(mapped?.v3BenchmarkId).toBe("TEST_LIMP");
    expect(mapped?.v3EvidenceLevel).toBe("CERTIFIED");
  });

  it("mixed certified strategy stays shadow-only in this delivery", () => {
    const mixed: LivePreflopV3Result = {
      source: "V3_CERTIFIED_HAND",
      benchmarkId: "TEST_MIXED",
      evidence: { level: "CERTIFIED", solver: "GTO_WIZARD" },
      semanticMix: { limp: 0.6, raise: 0.4 },
    };
    expect(mapCertifiedV3PreflopDecision("A5s", mixed, 20)).toBeNull();
  });

  it("fallback result never maps into a V3 live decision", () => {
    const fallback: LivePreflopV3Result = {
      source: "FALLBACK_V2",
      evidence: { level: "FALLBACK_V2" },
    };
    expect(mapCertifiedV3PreflopDecision("AKo", fallback, 20)).toBeNull();
  });
});

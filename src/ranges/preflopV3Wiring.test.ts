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

function bw5Context(hand: string) {
  const bw5 = BLIND_WAR_BENCHMARKS[4];
  return {
    heroPosition: "SB" as const,
    hand: cardsFromString(hand),
    effectiveBB: 40,
    profile: BASELINE_PROFILE,
    variant: "holdem" as const,
    v3Node: bw5.node,
    v3TournamentContext: bw5.context,
    v3PriorActions: bw5.priorActions,
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

  it("certified BW5 limp and fold cross live with exact semantics", () => {
    const limp = preflopDecisionV3Aware(bw5Context("As4s"));
    expect(limp.action).toBe("call");
    expect(limp.sizeBB).toBe(1);
    expect(limp.semanticAction).toBe("limp");
    expect(limp.v3BenchmarkId).toBe("BW5");

    const fold = preflopDecisionV3Aware(bw5Context("7s2d"));
    expect(fold.action).toBe("fold");
    expect(fold.sizeBB).toBe(0);
    expect(fold.v3BenchmarkId).toBe("BW5");
  });

  it("certified BW5 T3s raises to the solver-proven 3bb size", () => {
    const raise = preflopDecisionV3Aware(bw5Context("Ts3s"));
    expect(raise.action).toBe("raise");
    expect(raise.sizeBB).toBe(3);
    expect(raise.v3BenchmarkId).toBe("BW5");
    expect(raise.v3EvidenceLevel).toBe("CERTIFIED");
  });

  it("multi-sizing without hand-level sizing stays shadow-only", () => {
    const result: LivePreflopV3Result = {
      source: "V3_CERTIFIED_HAND",
      benchmarkId: "TEST_MULTI",
      evidence: { level: "CERTIFIED", solver: "GTO_WIZARD" },
      semanticMix: { raise: 1 },
      actionSizing: { raise: [{ sizeBB: 3.5 }, { sizeBB: 7 }] },
    };
    expect(mapCertifiedV3PreflopDecision("A5s", result, 40)).toBeNull();
  });

  it("multi-sizing with a pure certified hand sizing maps live", () => {
    const result: LivePreflopV3Result = {
      source: "V3_CERTIFIED_HAND",
      benchmarkId: "TEST_MULTI_PURE",
      evidence: { level: "CERTIFIED", solver: "GTO_WIZARD" },
      semanticMix: { raise: 1 },
      actionSizing: { raise: [{ sizeBB: 3.5 }, { sizeBB: 7 }] },
      handSizingMix: { raise: { 3.5: 0, 7: 1 } },
    };
    const mapped = mapCertifiedV3PreflopDecision("A5s", result, 40);
    expect(mapped?.action).toBe("raise");
    expect(mapped?.sizeBB).toBe(7);
  });

  it("multi-sizing mixed by hand remains shadow-only", () => {
    const result: LivePreflopV3Result = {
      source: "V3_CERTIFIED_HAND",
      benchmarkId: "TEST_MULTI_MIXED",
      evidence: { level: "CERTIFIED", solver: "GTO_WIZARD" },
      semanticMix: { raise: 1 },
      actionSizing: { raise: [{ sizeBB: 3.5 }, { sizeBB: 7 }] },
      handSizingMix: { raise: { 3.5: 0.4, 7: 0.6 } },
    };
    expect(mapCertifiedV3PreflopDecision("A5s", result, 40)).toBeNull();
  });

  it("certified limp maps to legal call-to-1BB plus explicit limp semantics", () => {
    const certified: LivePreflopV3Result = {
      source: "V3_CERTIFIED_HAND",
      benchmarkId: "TEST_LIMP",
      evidence: { level: "CERTIFIED", solver: "GTO_WIZARD", videoId: "test", timestamp: "00:00" },
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

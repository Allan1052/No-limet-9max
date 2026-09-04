import { describe, expect, it } from "vitest";
import { BLIND_WAR_BENCHMARKS } from "./benchmarks/blindWar";
import type { ExternalBenchmarkFixture } from "./benchmarks/types";
import { blindWarStrategyV3 } from "./blindWar";
import { livePreflopFromFixtures, livePreflopV3 } from "./livePreflopBridge";

describe("Motor V3 external promotion gate", () => {
  for (const benchmark of BLIND_WAR_BENCHMARKS) {
    it(`${benchmark.id} reproduces certified global frequencies`, () => {
      const actual = blindWarStrategyV3({
        node: benchmark.node,
        context: benchmark.context,
        priorActions: benchmark.priorActions,
      });

      expect(actual.evidence.level).toBe("CERTIFIED");
      expect(actual.benchmarkId).toBe(benchmark.id);

      for (const [action, expectedFreq] of Object.entries(benchmark.actionFreq)) {
        expect(actual.actionFreq[action]).toBeCloseTo(expectedFreq, 3);
      }
    });
  }

  it("BW1-BW4 remain shadow-only while BW5 exposes only certified pure cells", () => {
    for (const fixture of BLIND_WAR_BENCHMARKS.slice(0, 4)) {
      expect(fixture.handActionFreq).toBeUndefined();
    }

    expect(Object.keys(BLIND_WAR_BENCHMARKS[4].handActionFreq ?? {}).sort()).toEqual([
      "42o",
      "52o",
      "62o",
      "72o",
      "A2s",
      "A3s",
      "A4s",
      "K3s",
      "K4s",
      "Q4s",
      "T3s",
    ]);
  });

  it("BW5 certified pure cells can cross the live hand gate", () => {
    const bw5 = BLIND_WAR_BENCHMARKS[4];
    const expected = {
      T3s: { raise: 1 },
      A4s: { limp: 1 },
      A3s: { limp: 1 },
      A2s: { limp: 1 },
      K4s: { limp: 1 },
      K3s: { limp: 1 },
      Q4s: { limp: 1 },
      "72o": { fold: 1 },
      "62o": { fold: 1 },
      "52o": { fold: 1 },
      "42o": { fold: 1 },
    } as const;

    for (const [handType, semanticMix] of Object.entries(expected)) {
      const live = livePreflopV3({
        node: bw5.node,
        context: bw5.context,
        priorActions: bw5.priorActions,
        handType,
      });
      expect(live.source).toBe("V3_CERTIFIED_HAND");
      expect(live.benchmarkId).toBe("BW5");
      expect(live.semanticMix).toEqual(semanticMix);
    }
  });

  it("uncertified BW5 hands still fall back to V2", () => {
    const bw5 = BLIND_WAR_BENCHMARKS[4];
    const live = livePreflopV3({
      node: bw5.node,
      context: bw5.context,
      priorActions: bw5.priorActions,
      handType: "AKo",
    });

    expect(live.source).toBe("FALLBACK_V2");
  });

  it("never promotes an unmatched nearby stack as certified", () => {
    const actual = blindWarStrategyV3({
      node: "SB_RFI",
      context: {
        format: "PKO",
        fieldRemainingPct: 50,
        positions: ["SB", "BB"],
        stacksBB: { SB: 38, BB: 25 },
        effectiveStackBB: 25,
        coverage: [{ covers: "SB", covered: "BB" }],
      },
      priorActions: [],
    });

    expect(actual.evidence.level).toBe("FALLBACK_V2");
    expect(actual.benchmarkId).toBeUndefined();
    expect(actual.actionFreq).toEqual({});
  });

  it("25bb nearby context never inherits 20bb live certified behavior", () => {
    const bw1 = BLIND_WAR_BENCHMARKS[0];
    const live = livePreflopV3({
      node: bw1.node,
      context: {
        ...bw1.context,
        stacksBB: { SB: 38, BB: 25 },
        effectiveStackBB: 25,
      },
      priorActions: bw1.priorActions,
      handType: "AKo",
    });

    expect(live.source).toBe("FALLBACK_V2");
  });

  it("PARTIAL hand data cannot drive live decisions", () => {
    const bw1 = BLIND_WAR_BENCHMARKS[0];
    const partial: ExternalBenchmarkFixture = {
      ...bw1,
      id: "TEST_PARTIAL_HAND",
      evidence: { ...bw1.evidence, level: "PARTIAL" },
      handActionFreq: { AKo: { limp: 1 } },
    };

    const live = livePreflopFromFixtures([partial], {
      node: partial.node,
      context: partial.context,
      priorActions: partial.priorActions,
      handType: "AKo",
    });

    expect(live.source).toBe("FALLBACK_V2");
  });
});

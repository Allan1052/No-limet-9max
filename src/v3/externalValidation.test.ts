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

  it("BW1-BW5 global fixtures remain shadow-only", () => {
    for (const fixture of BLIND_WAR_BENCHMARKS) {
      expect(fixture.handActionFreq).toBeUndefined();
    }
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

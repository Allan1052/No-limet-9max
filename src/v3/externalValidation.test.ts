import { describe, expect, it } from "vitest";
import { BLIND_WAR_BENCHMARKS } from "./benchmarks/blindWar";
import { blindWarStrategyV3 } from "./blindWar";

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
});

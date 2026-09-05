import { describe, expect, it } from "vitest";
import { blindWarStrategyV3 } from "./blindWar";

const pko20 = {
  format: "PKO" as const,
  stage: "IN_THE_MONEY" as const,
  fieldRemainingPct: 50,
  positions: ["SB", "BB"],
  stacksBB: { SB: 33, BB: 20 },
  effectiveStackBB: 20,
  coverage: [{ covers: "SB", covered: "BB" }],
};

const vanilla20 = {
  ...pko20,
  format: "VANILLA" as const,
};

describe("blindWarStrategyV3", () => {
  it("returns BW1 exact certified strategy", () => {
    const result = blindWarStrategyV3({ node: "SB_RFI", context: pko20, priorActions: [] });

    expect(result.evidence.level).toBe("CERTIFIED");
    expect(result.benchmarkId).toBe("BW1");
    expect(result.actionFreq.limp).toBeCloseTo(0.439, 3);
    expect(result.actionFreq.shove).toBeCloseTo(0.180, 3);
  });

  it("does not pretend 25bb is certified from the 20bb benchmark", () => {
    const result = blindWarStrategyV3({
      node: "SB_RFI",
      context: {
        format: "PKO",
        stage: "IN_THE_MONEY",
        fieldRemainingPct: 50,
        positions: ["SB", "BB"],
        stacksBB: { SB: 38, BB: 25 },
        effectiveStackBB: 25,
        coverage: [{ covers: "SB", covered: "BB" }],
      },
      priorActions: [],
    });

    expect(result.evidence.level).toBe("FALLBACK_V2");
    expect(result.actionFreq).toEqual({});
  });

  it("keeps PKO and Vanilla strategies distinct at the same 20bb effective", () => {
    const pko = blindWarStrategyV3({ node: "SB_RFI", context: pko20, priorActions: [] });
    const vanilla = blindWarStrategyV3({ node: "SB_RFI", context: vanilla20, priorActions: [] });

    expect(pko.evidence.level).toBe("CERTIFIED");
    expect(vanilla.evidence.level).toBe("CERTIFIED");
    expect(pko.actionFreq).not.toEqual(vanilla.actionFreq);
    expect(pko.actionFreq.shove).toBeGreaterThan(vanilla.actionFreq.shove);
  });

  it("captures coverage inversion in the certified BB-vs-limp node", () => {
    const coveredBb = blindWarStrategyV3({
      node: "BB_VS_SB_LIMP",
      context: pko20,
      priorActions: ["SB_LIMP"],
    });
    const coveringBb = blindWarStrategyV3({
      node: "BB_VS_SB_LIMP",
      context: {
        format: "PKO",
        stage: "IN_THE_MONEY",
        fieldRemainingPct: 50,
        positions: ["SB", "BB"],
        stacksBB: { SB: 27, BB: 53 },
        effectiveStackBB: 27,
        coverage: [{ covers: "BB", covered: "SB" }],
      },
      priorActions: ["SB_LIMP"],
    });

    expect(coveredBb.actionFreq.raise).toBeCloseTo(0.332, 3);
    expect(coveringBb.actionFreq.raise).toBeCloseTo(0.424, 3);
    expect(coveringBb.actionFreq.raise).toBeGreaterThan(coveredBb.actionFreq.raise);
  });

  it("preserves the high-ICM 40bb limp-heavy strategy", () => {
    const highIcm = blindWarStrategyV3({
      node: "SB_RFI",
      context: {
        format: "VANILLA",
        stage: "IN_THE_MONEY",
        fieldRemainingPct: 25,
        positions: ["SB", "BB"],
        stacksBB: { SB: 40, BB: 40 },
        effectiveStackBB: 40,
        coverage: [],
      },
      priorActions: [],
    });

    expect(highIcm.evidence.level).toBe("CERTIFIED");
    expect(highIcm.actionFreq.limp).toBeGreaterThan(0.70);
    expect(highIcm.actionFreq.raise).toBeLessThan(0.15);
    expect(highIcm.actionFreq.shove).toBe(0);
  });
});

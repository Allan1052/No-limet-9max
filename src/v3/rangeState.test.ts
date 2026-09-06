import { describe, expect, it } from "vitest";
import { applyActionWeights, createRangeState, rangePercent } from "./rangeState";

describe("PlayerRangeState", () => {
  it("keeps hand frequencies bounded 0..1", () => {
    expect(() => createRangeState("SB", { AA: 1, AKo: 1.2 }, { level: "CALIBRATED" }))
      .toThrow(/frequency/i);
  });

  it("filters the prior range instead of creating a new top-X range", () => {
    const prior = createRangeState("SB", { AA: 1, AKo: 1, "72o": 0.5 }, { level: "CALIBRATED" });
    const next = applyActionWeights(prior, "limp", { AA: 0.1, AKo: 0.5, "72o": 1 });

    expect(next.handFreq.AA).toBeCloseTo(0.1);
    expect(next.handFreq.AKo).toBeCloseTo(0.5);
    expect(next.handFreq["72o"]).toBeCloseTo(0.5);
    expect(next.history[next.history.length - 1]?.action).toBe("limp");
  });

  it("reports weighted combo percentage over 1326 combos", () => {
    const state = createRangeState("SB", { AA: 1 }, { level: "CERTIFIED" });
    expect(rangePercent(state)).toBeCloseTo(6 / 1326, 6);
  });
});

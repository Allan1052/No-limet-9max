import { describe, expect, it } from "vitest";
import { BLIND_WAR_BENCHMARKS } from "./blindWar";

describe("Blind War external fixtures", () => {
  it("contains BW1-BW5 and marks all as certified", () => {
    expect(BLIND_WAR_BENCHMARKS.map((x) => x.id)).toEqual(["BW1", "BW2", "BW3", "BW4", "BW5"]);
    expect(BLIND_WAR_BENCHMARKS.every((x) => x.evidence.level === "CERTIFIED")).toBe(true);
  });

  it("each node frequency sums to approximately 100%", () => {
    for (const fixture of BLIND_WAR_BENCHMARKS) {
      const total = Object.values(fixture.actionFreq).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(1, 2);
    }
  });
});

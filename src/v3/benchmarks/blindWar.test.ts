import { describe, expect, it } from "vitest";
import { BLIND_WAR_BENCHMARKS } from "./blindWar";
import type { ExternalBenchmarkFixture } from "./types";

describe("Blind War external fixtures", () => {
  it("contains BW1-BW5 and marks all as certified", () => {
    expect(BLIND_WAR_BENCHMARKS.map((x) => x.id)).toEqual(["BW1", "BW2", "BW3", "BW4", "BW5"]);
    expect(BLIND_WAR_BENCHMARKS.every((x) => x.evidence.level === "CERTIFIED")).toBe(true);
  });

  it("declares an explicit evidence-supported tournament stage for every certified fixture", () => {
    expect(BLIND_WAR_BENCHMARKS.every((fixture) => fixture.context.stage === "IN_THE_MONEY")).toBe(true);
  });

  it("each node frequency sums to approximately 100%", () => {
    for (const fixture of BLIND_WAR_BENCHMARKS) {
      const total = Object.values(fixture.actionFreq).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(1, 2);
    }
  });

  it("keeps BW1-BW4 global-only and certifies only visually pure BW5 cells", () => {
    for (const fixture of BLIND_WAR_BENCHMARKS.slice(0, 4)) {
      expect(fixture.handActionFreq).toBeUndefined();
    }

    const bw5 = BLIND_WAR_BENCHMARKS[4];
    expect(bw5.handActionFreq).toEqual({
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
    });
  });

  it("accepts an explicitly certified hand-level strategy in the fixture contract", () => {
    const handCertified: ExternalBenchmarkFixture = {
      ...BLIND_WAR_BENCHMARKS[0],
      id: "TEST_HAND_CERTIFIED",
      handActionFreq: {
        AKo: { raise: 1 },
        "72o": { fold: 1 },
      },
    };

    expect(handCertified.handActionFreq?.AKo.raise).toBe(1);
    expect(handCertified.handActionFreq?.["72o"].fold).toBe(1);
  });

  it("stores certified sizing as a distribution without changing BW5 semantics", () => {
    const bw5 = BLIND_WAR_BENCHMARKS[4];
    expect(bw5.actionSizing).toEqual({
      raise: [{ sizeBB: 3, freq: 1 }],
    });
    expect("actionSizeBB" in bw5).toBe(false);
  });

  it("fixture contract can represent two sizings for one action", () => {
    const multi: ExternalBenchmarkFixture = {
      ...BLIND_WAR_BENCHMARKS[0],
      id: "TEST_MULTI_SIZING",
      actionSizing: {
        raise: [
          { sizeBB: 3.5, freq: 0.65 },
          { sizeBB: 7, freq: 0.35 },
        ],
      },
      handSizingFreq: {
        A5s: { raise: { 3.5: 0.4, 7: 0.6 } },
      },
    };

    expect(multi.actionSizing?.raise).toHaveLength(2);
    expect(multi.handSizingFreq?.A5s.raise?.[7]).toBe(0.6);
  });
});

import { describe, expect, it } from "vitest";
import { BLIND_WAR_BENCHMARKS } from "./benchmarks/blindWar";
import type { ExternalBenchmarkFixture } from "./benchmarks/types";
import { livePreflopFromFixtures } from "./livePreflopBridge";

const handFixture: ExternalBenchmarkFixture = {
  ...BLIND_WAR_BENCHMARKS[0],
  id: "TEST_BW_HAND",
  handActionFreq: { AKo: { raise: 1 } },
};

function run(fixture: ExternalBenchmarkFixture, handType = "AKo") {
  return livePreflopFromFixtures([fixture], {
    node: fixture.node,
    context: fixture.context,
    priorActions: fixture.priorActions,
    handType,
  });
}

describe("livePreflopV3 evidence gate", () => {
  it("allows an exact certified hand-level strategy to drive live action", () => {
    const result = run(handFixture);
    expect(result.source).toBe("V3_CERTIFIED_HAND");
    expect(result.benchmarkId).toBe("TEST_BW_HAND");
    expect(result.semanticMix).toEqual({ raise: 1 });
  });

  it("preserves multiple certified sizings and hand-level sizing mix", () => {
    const fixture: ExternalBenchmarkFixture = {
      ...handFixture,
      id: "TEST_MULTI_SIZE",
      actionSizing: { raise: [{ sizeBB: 3.5 }, { sizeBB: 7 }] },
      handSizingFreq: { AKo: { raise: { 3.5: 0.4, 7: 0.6 } } },
    };
    const result = run(fixture);
    expect(result.actionSizing?.raise).toEqual([{ sizeBB: 3.5 }, { sizeBB: 7 }]);
    expect(result.handSizingMix?.raise).toEqual({ 3.5: 0.4, 7: 0.6 });
  });

  it("accepts a complete global sizing distribution only when frequencies sum to one", () => {
    const valid: ExternalBenchmarkFixture = {
      ...handFixture,
      id: "TEST_GLOBAL_FREQ_OK",
      actionSizing: { raise: [{ sizeBB: 3.5, freq: 0.7 }, { sizeBB: 7, freq: 0.3 }] },
    };
    expect(run(valid).actionSizing?.raise).toEqual(valid.actionSizing?.raise);

    const invalid: ExternalBenchmarkFixture = {
      ...valid,
      id: "TEST_GLOBAL_FREQ_BAD",
      actionSizing: { raise: [{ sizeBB: 3.5, freq: 0.7 }, { sizeBB: 7, freq: 0.2 }] },
    };
    expect(() => run(invalid)).toThrow(/frequencies must sum to 1|frequencies must sum to one|sum to 1/i);
  });

  it("preserves incomplete global sizing frequencies without inventing normalization", () => {
    const fixture: ExternalBenchmarkFixture = {
      ...handFixture,
      id: "TEST_GLOBAL_FREQ_PARTIAL",
      actionSizing: { raise: [{ sizeBB: 3.5, freq: 0.7 }, { sizeBB: 7 }] },
    };
    expect(run(fixture).actionSizing?.raise).toEqual([{ sizeBB: 3.5, freq: 0.7 }, { sizeBB: 7 }]);
  });

  it("rejects non-all-in preflop raise sizing at or below one blind", () => {
    const fixture: ExternalBenchmarkFixture = {
      ...handFixture,
      id: "TEST_BAD_RAISE_SIZE",
      actionSizing: { raise: [{ sizeBB: 1 }] },
    };
    expect(() => run(fixture)).toThrow(/sizing/i);
  });

  it("rejects hand sizing for an action the certified hand does not take", () => {
    const fixture: ExternalBenchmarkFixture = {
      ...handFixture,
      id: "TEST_SIZING_WITHOUT_ACTION",
      actionSizing: { raise: [{ sizeBB: 3.5 }] },
      handActionFreq: { AKo: { limp: 1 } },
      handSizingFreq: { AKo: { raise: { 3.5: 1 } } },
    };
    expect(() => run(fixture)).toThrow(/sizing/i);
  });

  it("rejects hand sizing outside the globally certified sizing set", () => {
    const fixture: ExternalBenchmarkFixture = {
      ...handFixture,
      id: "TEST_BAD_SIZE",
      actionSizing: { raise: [{ sizeBB: 3.5 }, { sizeBB: 7 }] },
      handSizingFreq: { AKo: { raise: { 8: 1 } } },
    };
    expect(() => run(fixture)).toThrow(/sizing/i);
  });

  it("global-only certified benchmark cannot drive a specific hand", () => {
    const fixture = BLIND_WAR_BENCHMARKS[0];
    const result = run(fixture);
    expect(result.source).toBe("FALLBACK_V2");
    expect(result.semanticMix).toBeUndefined();
  });

  it("wrong stack cannot use certified hand data", () => {
    const result = livePreflopFromFixtures([handFixture], {
      node: handFixture.node,
      context: { ...handFixture.context, effectiveStackBB: 25, stacksBB: { SB: 38, BB: 25 } },
      priorActions: [],
      handType: "AKo",
    });
    expect(result.source).toBe("FALLBACK_V2");
  });

  it("partial evidence cannot drive a live hand even with hand frequencies", () => {
    const partial: ExternalBenchmarkFixture = {
      ...handFixture,
      id: "TEST_PARTIAL",
      evidence: { ...handFixture.evidence, level: "PARTIAL" },
    };
    expect(run(partial).source).toBe("FALLBACK_V2");
  });

  it("rejects invalid certified hand mixes", () => {
    const invalid: ExternalBenchmarkFixture = {
      ...handFixture,
      id: "TEST_INVALID_MIX",
      handActionFreq: { AKo: { raise: 0.8, limp: 0.8 } },
    };
    expect(() => run(invalid)).toThrow(/hand-level mix/i);
  });
});

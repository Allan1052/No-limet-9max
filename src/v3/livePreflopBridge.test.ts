import { describe, expect, it } from "vitest";
import { BLIND_WAR_BENCHMARKS } from "./benchmarks/blindWar";
import type { ExternalBenchmarkFixture } from "./benchmarks/types";
import { livePreflopFromFixtures } from "./livePreflopBridge";

const handFixture: ExternalBenchmarkFixture = {
  ...BLIND_WAR_BENCHMARKS[0],
  id: "TEST_BW_HAND",
  handActionFreq: { AKo: { raise: 1 } },
};

describe("livePreflopV3 evidence gate", () => {
  it("allows an exact certified hand-level strategy to drive live action", () => {
    const result = livePreflopFromFixtures([handFixture], {
      node: handFixture.node,
      context: handFixture.context,
      priorActions: handFixture.priorActions,
      handType: "AKo",
    });
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
    const result = livePreflopFromFixtures([fixture], {
      node: fixture.node,
      context: fixture.context,
      priorActions: fixture.priorActions,
      handType: "AKo",
    });
    expect(result.actionSizing?.raise).toEqual([{ sizeBB: 3.5 }, { sizeBB: 7 }]);
    expect(result.handSizingMix?.raise).toEqual({ 3.5: 0.4, 7: 0.6 });
  });

  it("rejects hand sizing outside the globally certified sizing set", () => {
    const fixture: ExternalBenchmarkFixture = {
      ...handFixture,
      id: "TEST_BAD_SIZE",
      actionSizing: { raise: [{ sizeBB: 3.5 }, { sizeBB: 7 }] },
      handSizingFreq: { AKo: { raise: { 8: 1 } } },
    };
    expect(() => livePreflopFromFixtures([fixture], {
      node: fixture.node,
      context: fixture.context,
      priorActions: fixture.priorActions,
      handType: "AKo",
    })).toThrow(/sizing/i);
  });

  it("global-only certified benchmark cannot drive a specific hand", () => {
    const fixture = BLIND_WAR_BENCHMARKS[0];
    const result = livePreflopFromFixtures([fixture], {
      node: fixture.node,
      context: fixture.context,
      priorActions: fixture.priorActions,
      handType: "AKo",
    });
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
    const result = livePreflopFromFixtures([partial], {
      node: partial.node,
      context: partial.context,
      priorActions: partial.priorActions,
      handType: "AKo",
    });
    expect(result.source).toBe("FALLBACK_V2");
  });

  it("rejects invalid certified hand mixes", () => {
    const invalid: ExternalBenchmarkFixture = {
      ...handFixture,
      id: "TEST_INVALID_MIX",
      handActionFreq: { AKo: { raise: 0.8, limp: 0.8 } },
    };
    expect(() => livePreflopFromFixtures([invalid], {
      node: invalid.node,
      context: invalid.context,
      priorActions: invalid.priorActions,
      handType: "AKo",
    })).toThrow(/hand-level mix/i);
  });
});

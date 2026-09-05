import { describe, expect, it } from "vitest";
import { EXTERNAL_BENCHMARK_REGISTRY } from "./externalBenchmarkRegistry";

describe("Motor V3 — consolidated external benchmark registry", () => {
  it("consolidates every currently certified structural benchmark family", () => {
    expect(EXTERNAL_BENCHMARK_REGISTRY.map((x) => x.family).sort()).toEqual([
      "BLIND_WAR",
      "BUBBLE_STEAL",
      "ICM_RESTEAL",
      "ICM_SQUEEZE",
    ]);

    expect(EXTERNAL_BENCHMARK_REGISTRY.reduce((sum, x) => sum + x.fixtureCount, 0)).toBe(10);
  });

  it("keeps solver evidence and live-promotion status explicit", () => {
    for (const family of EXTERNAL_BENCHMARK_REGISTRY) {
      expect(family.solver).toBe("GTO_WIZARD");
      expect(family.evidenceLevel).toBe("CERTIFIED");
      expect(["STRUCTURAL_ONLY", "HAND_CERTIFIED_PARTIAL"]).toContain(family.v3PromotionStatus);
    }

    expect(EXTERNAL_BENCHMARK_REGISTRY.find((x) => x.family === "BLIND_WAR")?.v3PromotionStatus)
      .toBe("HAND_CERTIFIED_PARTIAL");
  });

  it("does not pretend V2 has exact external comparability where the harness does not exist", () => {
    for (const family of EXTERNAL_BENCHMARK_REGISTRY) {
      expect(family.v2ExactComparable).toBe(false);
    }
  });
});

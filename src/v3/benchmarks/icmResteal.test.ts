import { describe, expect, it } from "vitest";
import { ICM_RESTEAL_STRUCTURAL_BENCHMARKS } from "./icmResteal";

describe("Motor V3 — structural ICM resteal benchmarks", () => {
  it("locks the 40bb BB vs BTN 2.3bb action-family shift from cEV to 25%-field ICM", () => {
    const cev = ICM_RESTEAL_STRUCTURAL_BENCHMARKS.find((x) => x.id === "IR1_CEV_40BB");
    const icm25 = ICM_RESTEAL_STRUCTURAL_BENCHMARKS.find((x) => x.id === "IR2_ICM25_40BB");

    expect(cev).toBeDefined();
    expect(icm25).toBeDefined();
    expect(cev?.heroPosition).toBe("BB");
    expect(cev?.villainPosition).toBe("BTN");
    expect(cev?.effectiveStackBB).toBe(40);
    expect(cev?.openSizeBB).toBe(2.3);
    expect(cev?.shoveFreqApprox).toBeCloseTo(0.06, 2);
    expect(cev?.stageModel).toBe("CHIP_EV");

    expect(icm25?.heroPosition).toBe("BB");
    expect(icm25?.villainPosition).toBe("BTN");
    expect(icm25?.effectiveStackBB).toBe(40);
    expect(icm25?.openSizeBB).toBe(2.3);
    expect(icm25?.fieldRemainingPct).toBe(25);
    expect(icm25?.shoveFreqApprox).toBe(0);
    expect(icm25?.stageModel).toBe("ICM");
    expect(icm25?.evidence.level).toBe("CERTIFIED");
  });

  it("does not pretend the article gives a complete action-frequency vector", () => {
    for (const benchmark of ICM_RESTEAL_STRUCTURAL_BENCHMARKS) {
      expect(benchmark.completeActionFreq).toBe(false);
    }
  });
});

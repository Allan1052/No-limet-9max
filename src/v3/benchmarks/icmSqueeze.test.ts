import { describe, expect, it } from "vitest";
import { ICM_SQUEEZE_ENVIRONMENT_BENCHMARKS } from "./icmSqueeze";

describe("ICM squeeze environment benchmarks", () => {
  it("locks the official 40bb chip-EV squeeze frequency", () => {
    const cev = ICM_SQUEEZE_ENVIRONMENT_BENCHMARKS.find(
      (node) => node.id === "IS1_CEV_40BB_CO_BTN",
    );

    expect(cev).toBeDefined();
    expect(cev?.effectiveStackBB).toBe(40);
    expect(cev?.openerPosition).toBe("CO");
    expect(cev?.callerPosition).toBe("BTN");
    expect(cev?.heroPosition).toBe("BB");
    expect(cev?.stageModel).toBe("CHIP_EV");
    expect(cev?.totalSqueezeFreq).toBeCloseTo(0.121, 6);
    expect(cev?.evidence.level).toBe("CERTIFIED");
  });

  it("locks the official near-bubble ICM squeeze frequency, shove share and smaller size", () => {
    const bubble = ICM_SQUEEZE_ENVIRONMENT_BENCHMARKS.find(
      (node) => node.id === "IS2_BUBBLE_40BB_CO_BTN",
    );

    expect(bubble).toBeDefined();
    expect(bubble?.effectiveStackBB).toBe(40);
    expect(bubble?.stageModel).toBe("ICM_NEAR_BUBBLE");
    expect(bubble?.totalSqueezeFreq).toBeCloseTo(0.107, 6);
    expect(bubble?.shoveFreq).toBeCloseTo(0.026, 6);
    expect(bubble?.nonAllInRaiseSizeBB).toBeCloseTo(8.5, 6);
    expect(bubble?.evidence.level).toBe("CERTIFIED");
  });

  it("does not pretend these prose-backed aggregates are a complete hand matrix", () => {
    for (const node of ICM_SQUEEZE_ENVIRONMENT_BENCHMARKS) {
      expect(node.completeHandMatrix).toBe(false);
      expect(node.handActionFreq).toBeUndefined();
    }
  });

  it("captures the structural ICM transition without inventing chip-EV shove precision", () => {
    const cev = ICM_SQUEEZE_ENVIRONMENT_BENCHMARKS[0];
    const bubble = ICM_SQUEEZE_ENVIRONMENT_BENCHMARKS[1];

    expect(bubble.totalSqueezeFreq).toBeLessThan(cev.totalSqueezeFreq);
    expect(cev.shoveFreq).toBeUndefined();
    expect(bubble.shoveFreq).toBeCloseTo(0.026, 6);
  });
});

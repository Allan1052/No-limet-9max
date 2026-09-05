import { describe, expect, it } from "vitest";
import { BUBBLE_STEAL_BENCHMARKS } from "./bubbleSteal";

describe("Motor V3 — short-stack bubble steal benchmarks", () => {
  it("locks the official near-bubble BTN 18bb aggregate strategy and coverage context", () => {
    const node = BUBBLE_STEAL_BENCHMARKS.find((x) => x.id === "BS1_BTN18_BUBBLE_1000");

    expect(node).toBeDefined();
    expect(node?.stage).toBe("BUBBLE");
    expect(node?.fieldSize).toBe(1000);
    expect(node?.averageStackBB).toBe(35);
    expect(node?.heroPosition).toBe("BTN");
    expect(node?.heroStackBB).toBe(18);
    expect(node?.sbStackBB).toBe(41);
    expect(node?.bbStackBB).toBe(26);
    expect(node?.coverage).toEqual({ SB: "COVERS_HERO", BB: "COVERS_HERO" });
    expect(node?.openRaiseFreq).toBeCloseTo(0.17, 6);
    expect(node?.openJamFreq).toBeCloseTo(0.02, 6);
    expect(node?.totalContinueFreq).toBeCloseTo(0.19, 6);
    expect(node?.earlierStageOpenFreqApprox).toBeCloseTo(0.5, 6);
  });

  it("locks the published bubble-factor asymmetry", () => {
    const node = BUBBLE_STEAL_BENCHMARKS[0];

    expect(node.bubbleFactors.BTN).toBeCloseTo(1.98, 6);
    expect(node.bubbleFactors.BB_vs_BTN).toBeCloseTo(1.3, 6);
    expect(node.bubbleFactors.SB_vs_BTN).toBeCloseTo(1.1, 6);
  });

  it("does not infer a hand-level matrix from article prose", () => {
    for (const node of BUBBLE_STEAL_BENCHMARKS) {
      expect(node.completeHandMatrix).toBe(false);
      expect(node.handActionFreq).toBeUndefined();
      expect(node.evidence.level).toBe("CERTIFIED");
    }
  });
});

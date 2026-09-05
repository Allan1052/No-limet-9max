import { describe, expect, it } from "vitest";
import { ICM_PROGRESSION_BENCHMARKS } from "./icmProgression";

describe("Motor V3 — progressive ICM benchmarks", () => {
  it("locks the published 20bb BB-vs-LJ defence tightening by halfway point", () => {
    const early = ICM_PROGRESSION_BENCHMARKS.find((x) => x.id === "IP1_BB20_VS_LJ_EARLY");
    const halfway = ICM_PROGRESSION_BENCHMARKS.find((x) => x.id === "IP2_BB20_VS_LJ_HALFWAY");

    expect(early).toBeDefined();
    expect(halfway).toBeDefined();
    expect(early?.heroPosition).toBe("BB");
    expect(early?.villainPosition).toBe("LJ");
    expect(early?.effectiveStackBB).toBe(20);
    expect(early?.foldFreq).toBeCloseTo(0.196, 6);
    expect(halfway?.effectiveStackBB).toBe(20);
    expect(halfway?.fieldRemainingPct).toBe(50);
    expect(halfway?.foldFreq).toBeCloseTo(0.355, 6);
  });

  it("does not over-label the earlier published endpoint as chipEV without explicit source proof", () => {
    const early = ICM_PROGRESSION_BENCHMARKS.find((x) => x.id === "IP1_BB20_VS_LJ_EARLY");

    expect(early?.stageModel).toBe("EARLIER_REFERENCE");
    expect(early?.notes.join(" ").toLowerCase()).not.toContain("chipev");
  });

  it("records the certified direction and exact published delta without inventing a hand matrix", () => {
    const [early, halfway] = ICM_PROGRESSION_BENCHMARKS;

    expect(halfway.foldFreq - early.foldFreq).toBeCloseTo(0.159, 6);
    expect(halfway.foldFreq).toBeGreaterThan(early.foldFreq);
    for (const node of ICM_PROGRESSION_BENCHMARKS) {
      expect(node.completeHandMatrix).toBe(false);
      expect(node.handActionFreq).toBeUndefined();
      expect(node.evidence.level).toBe("CERTIFIED");
      expect(node.evidence.solver).toBe("GTO_WIZARD");
    }
  });
});

import { describe, expect, it } from "vitest";
import { FINAL_TABLE_BLIND_BATTLE_BENCHMARKS } from "./finalTableBlindBattle";

describe("Motor V3 — certified final-table BB-vs-SB structural benchmarks", () => {
  it("locks the published coverage-sensitive limp-response frequencies", () => {
    expect(FINAL_TABLE_BLIND_BATTLE_BENCHMARKS).toHaveLength(3);

    const symmetric = FINAL_TABLE_BLIND_BATTLE_BENCHMARKS.find((x) => x.id === "FTBB1_SYMMETRIC_35");
    expect(symmetric?.stage).toBe("FINAL_TABLE");
    expect(symmetric?.sbStackBB).toBe(35);
    expect(symmetric?.bbStackBB).toBe(35);
    expect(symmetric?.sbAction).toBe("LIMP");
    expect(symmetric?.raise7Freq).toBeCloseTo(0.05, 6);
    expect(symmetric?.raise3_5Freq).toBeCloseTo(0.24, 6);

    const bbCovers = FINAL_TABLE_BLIND_BATTLE_BENCHMARKS.find((x) => x.id === "FTBB2_BB_COVERS_40_VS_35");
    expect(bbCovers?.sbStackBB).toBe(35);
    expect(bbCovers?.bbStackBB).toBe(40);
    expect(bbCovers?.bbRiskPremiumPct).toBeCloseTo(11.3, 6);
    expect(bbCovers?.sbRiskPremiumPct).toBeCloseTo(13.1, 6);
    expect(bbCovers?.raise7Freq).toBeCloseTo(0.07, 6);
    expect(bbCovers?.raise3_5Freq).toBeCloseTo(0.28, 6);

    const sbCovers = FINAL_TABLE_BLIND_BATTLE_BENCHMARKS.find((x) => x.id === "FTBB3_SB_COVERS_100_VS_35");
    expect(sbCovers?.sbStackBB).toBe(100);
    expect(sbCovers?.bbStackBB).toBe(35);
    expect(sbCovers?.bbRiskPremiumPct).toBeCloseTo(15.2, 6);
    expect(sbCovers?.raise7Freq).toBe(0);
    expect(sbCovers?.shoveFreqApprox).toBeCloseTo(0.04, 6);
    expect(sbCovers?.raise3_5Freq).toBeCloseTo(0.29, 6);
    expect(sbCovers?.combinedRaiseFreqApprox).toBeCloseTo(0.34, 6);
  });

  it("keeps the source structural and certified without fabricating hand matrices", () => {
    for (const node of FINAL_TABLE_BLIND_BATTLE_BENCHMARKS) {
      expect(node.evidence.level).toBe("CERTIFIED");
      expect(node.evidence.solver).toBe("GTO_WIZARD");
      expect(node.completeHandMatrix).toBe(false);
      expect(node.handActionFreq).toBeUndefined();
    }
  });
});

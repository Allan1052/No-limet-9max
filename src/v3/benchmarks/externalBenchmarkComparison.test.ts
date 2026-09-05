import { describe, expect, it } from "vitest";
import { EXTERNAL_BENCHMARK_COMPARISON } from "./externalBenchmarkComparison";

describe("Motor V3 — V2 × V3 × solver external comparison", () => {
  it("classifies all certified fixtures without inventing V2 exact comparability", () => {
    expect(EXTERNAL_BENCHMARK_COMPARISON).toHaveLength(12);

    for (const row of EXTERNAL_BENCHMARK_COMPARISON) {
      expect(row.solverEvidence).toBe("CERTIFIED");
      expect(row.v2.status).toBe("NOT_EXACTLY_COMPARABLE");
      expect(row.v2.delta).toBeUndefined();
      expect(["EXACT_STRUCTURAL_FIXTURE", "HAND_CERTIFIED_PARTIAL"]).toContain(row.v3.status);
    }
  });

  it("keeps hand-level promotion limited to the fixture that actually has certified hand cells", () => {
    const promoted = EXTERNAL_BENCHMARK_COMPARISON.filter(
      (row) => row.v3.status === "HAND_CERTIFIED_PARTIAL",
    );

    expect(promoted.map((row) => row.id)).toEqual(["BW5"]);
  });

  it("preserves the exact solver-side benchmark identifiers across all five families", () => {
    expect(EXTERNAL_BENCHMARK_COMPARISON.map((row) => row.id).sort()).toEqual([
      "BS1_BTN18_BUBBLE_1000",
      "BW1",
      "BW2",
      "BW3",
      "BW4",
      "BW5",
      "IP1_BB20_VS_LJ_EARLY",
      "IP2_BB20_VS_LJ_HALFWAY",
      "IR1_CEV_40BB",
      "IR2_ICM25_40BB",
      "IS1_CEV_40BB_CO_BTN",
      "IS2_BUBBLE_40BB_CO_BTN",
    ]);
  });
});

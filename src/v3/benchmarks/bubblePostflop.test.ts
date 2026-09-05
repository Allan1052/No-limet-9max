import { describe, expect, it } from "vitest";
import { BUBBLE_POSTFLOP_BENCHMARKS } from "./bubblePostflop";

describe("Motor V3 — certified bubble postflop structural benchmarks", () => {
  it("locks the four published BTN-vs-BB flop contexts without inventing hand matrices", () => {
    expect(BUBBLE_POSTFLOP_BENCHMARKS).toHaveLength(4);
    expect(BUBBLE_POSTFLOP_BENCHMARKS.map((x) => x.id)).toEqual([
      "BPF1_BTN18_BB26_A62",
      "BPF2_BTN18_BB26_AQ2",
      "BPF3_BTN18_BB26_853",
      "BPF4_BTN18_BB26_854",
    ]);

    for (const node of BUBBLE_POSTFLOP_BENCHMARKS) {
      expect(node.stage).toBe("BUBBLE");
      expect(node.fieldSize).toBe(1000);
      expect(node.heroPosition).toBe("BTN");
      expect(node.heroStackBB).toBe(18);
      expect(node.villainPosition).toBe("BB");
      expect(node.villainStackBB).toBe(26);
      expect(node.completeHandMatrix).toBe(false);
      expect(node.handActionFreq).toBeUndefined();
      expect(node.evidence.level).toBe("CERTIFIED");
      expect(node.evidence.solver).toBe("GTO_WIZARD");
    }
  });

  it("certifies the published A62 and AQ2 range/EV asymmetries without fabricating c-bet frequencies", () => {
    const a62 = BUBBLE_POSTFLOP_BENCHMARKS.find((x) => x.id === "BPF1_BTN18_BB26_A62");
    const aq2 = BUBBLE_POSTFLOP_BENCHMARKS.find((x) => x.id === "BPF2_BTN18_BB26_AQ2");

    expect(a62?.board).toBe("As6d2d");
    expect(a62?.btnEquity).toBeCloseTo(0.685, 6);
    expect(a62?.bbEquity).toBeCloseTo(0.315, 6);
    expect(a62?.btnCbetPattern).toBe("BASICALLY_MIN_BETS_ENTIRE_RANGE");
    expect(a62?.btnCbetFreq).toBeUndefined();

    expect(aq2?.board).toBe("AsQh2d");
    expect(aq2?.btnEquityGreaterThan).toBeCloseTo(0.74, 6);
    expect(aq2?.btnEvShare).toBeCloseTo(0.85, 6);
    expect(aq2?.btnCbetPattern).toBe("CONSIDERABLY_LESS_OFTEN_THAN_A62");
    expect(aq2?.btnCbetFreq).toBeUndefined();
  });

  it("locks the 853 forced-check contrast and equilibrium donk structure with approximation semantics", () => {
    const low = BUBBLE_POSTFLOP_BENCHMARKS.find((x) => x.id === "BPF3_BTN18_BB26_853");

    expect(low?.board).toBe("8d5h3h");
    expect(low?.btnEquityGreaterThan).toBeCloseTo(0.55, 6);
    expect(low?.btnForcedCheckCbetApprox).toBeCloseTo(0.12, 6);
    expect(low?.btnEarlierForcedCheckCbet).toBeCloseTo(0.63, 6);
    expect(low?.bbDonkFreqApprox).toBeCloseTo(0.5, 6);
    expect(low?.bbDonkSizePot).toBeCloseTo(0.2, 6);
  });

  it("certifies the 854 equity-EV inversion and equilibrium/exploit lead dependency", () => {
    const connected = BUBBLE_POSTFLOP_BENCHMARKS.find((x) => x.id === "BPF4_BTN18_BB26_854");

    expect(connected?.board).toBe("8d5h4h");
    expect(connected?.btnHasSlightEquityAdvantage).toBe(true);
    expect(connected?.bbEvShareApprox).toBeCloseTo(0.58, 6);
    expect(connected?.bbEquilibriumLeadFreq).toBe(1);
    expect(connected?.btnExploitCheckbackFreqVsNeverDonk).toBe(1);
  });
});

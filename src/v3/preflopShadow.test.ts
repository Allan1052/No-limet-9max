import { describe, expect, it } from "vitest";
import { BLIND_WAR_BENCHMARKS } from "./benchmarks/blindWar";
import { preflopShadowV3 } from "./preflopShadow";

describe("preflopShadowV3", () => {
  it("observes BW1 globally but refuses to drive AKo without hand-level evidence", () => {
    const bw1 = BLIND_WAR_BENCHMARKS[0];
    const shadow = preflopShadowV3({
      node: bw1.node,
      context: bw1.context,
      priorActions: bw1.priorActions,
    }, "AKo");

    expect(shadow.evidenceLevel).toBe("CERTIFIED");
    expect(shadow.globalActionFreq.limp).toBeCloseTo(0.439, 3);
    expect(shadow.mayDriveLiveHand).toBe(false);
  });

  it("allows a visually certified pure BW5 hand to cross the live gate", () => {
    const bw5 = BLIND_WAR_BENCHMARKS[4];
    const shadow = preflopShadowV3({
      node: bw5.node,
      context: bw5.context,
      priorActions: bw5.priorActions,
    }, "72o");

    expect(shadow.evidenceLevel).toBe("CERTIFIED");
    expect(shadow.globalActionFreq.limp).toBeCloseTo(0.763, 3);
    expect(shadow.mayDriveLiveHand).toBe(true);
  });

  it("keeps an uncertified BW5 hand in shadow/fallback", () => {
    const bw5 = BLIND_WAR_BENCHMARKS[4];
    const shadow = preflopShadowV3({
      node: bw5.node,
      context: bw5.context,
      priorActions: bw5.priorActions,
    }, "AKo");

    expect(shadow.evidenceLevel).toBe("CERTIFIED");
    expect(shadow.globalActionFreq.limp).toBeCloseTo(0.763, 3);
    expect(shadow.mayDriveLiveHand).toBe(false);
  });
});

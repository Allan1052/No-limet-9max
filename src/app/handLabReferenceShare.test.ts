import { describe, expect, it } from "vitest";
import { analyzeHand, parseHand, type HandLabSpec } from "../train/stage";
import { buildHandLabReferenceSharePlan } from "./handLabReferenceShare";

function spec(stage: HandLabSpec["stage"]): HandLabSpec {
  const hand = parseHand("As7s");
  if (!hand) throw new Error("A7s inválido");
  return {
    heroPosition: "BB",
    villainPosition: "BTN",
    situation: "vsallin",
    stage,
    stackBB: 15,
    hand,
    anteBB: 1,
  };
}

describe("HandLab → card de referência", () => {
  it("mesa final usa uma fase comparativa que muda a decisão e gera 2 slides", () => {
    const current = analyzeHand(spec("mesa_final"));
    const plan = buildHandLabReferenceSharePlan(current, "feed");

    expect(current.recommended).toBe("fold");
    expect(plan.comparison?.recommended).toBe("call");
    expect(plan.slides).toEqual([
      { slide: 1, filename: "call-ou-fold-feed-1.png" },
      { slide: 2, filename: "call-ou-fold-feed-2.png" },
    ]);
    expect(plan.format).toBe("feed");
  });

  it("início encontra mesa final como contraste e mantém Story 9:16", () => {
    const current = analyzeHand(spec("inicio"));
    const plan = buildHandLabReferenceSharePlan(current, "story");

    expect(current.recommended).toBe("call");
    expect(plan.comparison?.recommended).toBe("fold");
    expect(plan.comparison?.spec.stage).toBe("mesa_final");
    expect(plan.slides).toEqual([
      { slide: 1, filename: "call-ou-fold-story-1.png" },
      { slide: 2, filename: "call-ou-fold-story-2.png" },
    ]);
    expect(plan.format).toBe("story");
  });
});

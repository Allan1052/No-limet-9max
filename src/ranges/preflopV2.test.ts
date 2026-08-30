import { describe, expect, it } from "vitest";
import { cardsFromString, seededRng } from "../engine/cards";
import { stackDepthAdjust } from "./stackDepth";
import { vsReraiseDecision } from "./vsReraise";

describe("Motor V2 — pré-flop por stack e re-agressão", () => {
  it("mantém transição explícita para push/fold nos stacks realmente curtos", () => {
    expect(stackDepthAdjust(15).pushFold).toBe(false);
    expect(stackDepthAdjust(12).pushFold).toBe(true);
    expect(stackDepthAdjust(8).pushFold).toBe(true);
    expect(stackDepthAdjust(6).pushFold).toBe(true);
  });

  it("RED: AQs OOP e profundo pode flat contra 3-bet em vez de 4-bet/fold automático", () => {
    const decision = vsReraiseDecision({
      hero: cardsFromString("AsQs"),
      betLevelFaced: 2,
      inPosition: false,
      potBB: 11.8,
      callBB: 5.7,
      effectiveBB: 60,
      iterations: 6000,
      rng: seededRng(7),
    });
    expect(decision.action).toBe("call");
  });

  it("stack curto não recebe o mesmo flat OOP de stack profundo", () => {
    const decision = vsReraiseDecision({
      hero: cardsFromString("AsQs"),
      betLevelFaced: 2,
      inPosition: false,
      potBB: 11.8,
      callBB: 5.7,
      effectiveBB: 20,
      iterations: 6000,
      rng: seededRng(7),
    });
    expect(decision.action).not.toBe("call");
  });
});

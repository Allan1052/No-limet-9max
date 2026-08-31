import { describe, expect, it } from "vitest";
import { cardsFromString, seededRng } from "../engine/cards";
import { postflopDecision, type PostflopContext } from "./decision";
import { BASELINE_PROFILE } from "./profiles";

function riverSpot(over: Partial<PostflopContext>): PostflopContext {
  return {
    hand: cardsFromString("ThKh"),
    board: cardsFromString("5hQcAh8dJc"),
    potSize: 7080,
    toCall: 2400,
    heroStack: 10680,
    inPosition: false,
    numOpponents: 1,
    profile: BASELINE_PROFILE,
    wasPreflopAggressor: false,
    villainRangePct: 0.25,
    rng: seededRng(31),
    equityIterations: 5000,
    ...over,
  };
}

describe("agressão com nuts no river", () => {
  it("sequência máxima no river aumenta por valor quando ainda há raise legal", () => {
    const d = postflopDecision(riverSpot({}));
    expect(d.equity).toBeGreaterThan(0.78);
    expect(d.action).toBe("raise");
  });
});

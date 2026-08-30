import { describe, expect, it } from "vitest";
import { cardsFromString, seededRng } from "../engine/cards";
import { postflopDecision, type PostflopContext } from "./decision";
import { BASELINE_PROFILE } from "./profiles";

function spot(heroStack: number): PostflopContext {
  return {
    hand: cardsFromString("AsAd"),
    board: cardsFromString("Ah7d2c4s"),
    potSize: 100,
    toCall: 0,
    heroStack,
    inPosition: true,
    numOpponents: 1,
    profile: BASELINE_PROFILE,
    wasPreflopAggressor: true,
    rng: seededRng(1),
    equityIterations: 3000,
  };
}

describe("Motor V2 — sizing integrado ao pós-flop real", () => {
  it("SPR raso usa sizing menor que SPR profundo no mesmo spot de valor", () => {
    const deep = postflopDecision(spot(800));
    const shallow = postflopDecision(spot(120));

    expect(deep.action).toBe("bet");
    expect(shallow.action).toBe("bet");
    expect(shallow.sizeToPot).toBeLessThan(deep.sizeToPot!);
  });
});

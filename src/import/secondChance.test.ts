import { describe, expect, it } from "vitest";
import { compareSecondChance, isHeroDecision } from "./secondChance";

const hero = "Allan";

describe("Segunda Chance", () => {
  it("intercepta apenas decisões voluntárias do Hero", () => {
    expect(isHeroDecision({ street: "preflop", player: hero, type: "call", amount: 200, allIn: false }, hero)).toBe(true);
    expect(isHeroDecision({ street: "preflop", player: hero, type: "bb", amount: 100, allIn: false }, hero)).toBe(false);
    expect(isHeroDecision({ street: "preflop", player: "Vilão", type: "raise", amount: 250, allIn: false }, hero)).toBe(false);
  });

  it("compara Original × Agora × Referência sem inventar referência", () => {
    expect(compareSecondChance("call", "fold", "Fold")).toEqual({ original: "call", now: "fold", reference: "fold", changed: true, matchesReference: true });
    expect(compareSecondChance("raise", "call")).toEqual({ original: "aggro", now: "call", reference: null, changed: true, matchesReference: null });
  });
});

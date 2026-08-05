import { describe, it, expect } from "vitest";
import { buildOmahaRange } from "./decision";
import { omahaPreflopScore } from "../ranges/omahaPreflop";
import { cardFromString } from "../engine/cards";

function avgScore(combos: number[][]): number {
  return combos.reduce((s, c) => s + omahaPreflopScore(c), 0) / combos.length;
}

// gerador determinístico para o teste ser estável.
function seeded(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

describe("buildOmahaRange — range do vilão filtrado por força", () => {
  it("range apertado tem mãos MAIS FORTES que range largo", () => {
    const tight = buildOmahaRange(0.1, seeded(1));
    const wide = buildOmahaRange(0.8, seeded(1));
    expect(avgScore(tight)).toBeGreaterThan(avgScore(wide));
  });

  it("exclui os blockers (cartas do herói e do board)", () => {
    const hero = ["As", "Ks", "Qs", "Js"].map(cardFromString);
    const board = ["2c", "7d", "9h"].map(cardFromString);
    const blocked = new Set([...hero, ...board]);
    const range = buildOmahaRange(0.5, seeded(3), hero, board);
    for (const combo of range) {
      for (const card of combo) expect(blocked.has(card)).toBe(false);
      // combos sempre têm 4 cartas distintas
      expect(new Set(combo).size).toBe(4);
    }
  });
});

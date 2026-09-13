import { describe, expect, it } from "vitest";
import { createPostflopDrillSession } from "./drillPostflop";

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("Drill Pós-Flop — unicidade determinística da sessão", () => {
  it("monster_dry sempre entrega as 9 mãos únicas prometidas", () => {
    for (let seed = 1; seed <= 24; seed++) {
      const session = createPostflopDrillSession("monster_dry", 9, mulberry32(seed));
      const keys = session.hands.map((h) => h.hand.slice().sort((a, b) => a - b).join(","));
      expect(new Set(keys).size, `seed ${seed}`).toBe(9);
      expect(session.hands).toHaveLength(9);
    }
  });
});

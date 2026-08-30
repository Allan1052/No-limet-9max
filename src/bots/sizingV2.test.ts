import { describe, expect, it } from "vitest";
import { sizingV2 } from "./decision";

describe("Motor V2 — sizing pós-flop", () => {
  it("SPR baixo comprime o sizing para evitar aposta artificialmente grande", () => {
    const deep = sizingV2({ wetness: 0.55, streetIdx: 1, equity: 0.72, spr: 8, rangeAdvantage: 0.05, nutAdvantage: 0.05 });
    const shallow = sizingV2({ wetness: 0.55, streetIdx: 1, equity: 0.72, spr: 1.2, rangeAdvantage: 0.05, nutAdvantage: 0.05 });
    expect(shallow).toBeLessThan(deep);
  });

  it("mesma textura usa sizing maior quando há vantagem de nuts e polarização", () => {
    const neutral = sizingV2({ wetness: 0.45, streetIdx: 2, equity: 0.88, spr: 5, rangeAdvantage: 0, nutAdvantage: 0 });
    const nutEdge = sizingV2({ wetness: 0.45, streetIdx: 2, equity: 0.88, spr: 5, rangeAdvantage: 0.12, nutAdvantage: 0.25 });
    expect(nutEdge).toBeGreaterThan(neutral);
  });

  it("mantém sizing em faixa operacional legal", () => {
    const size = sizingV2({ wetness: 1, streetIdx: 2, equity: 0.95, spr: 20, rangeAdvantage: 0.3, nutAdvantage: 0.4 });
    expect(size).toBeGreaterThanOrEqual(0.25);
    expect(size).toBeLessThanOrEqual(1.3);
  });
});

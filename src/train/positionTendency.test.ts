import { describe, expect, it } from "vitest";
import {
  reportFromRecords,
  reportFromCounts,
  tendencyFromCounts,
  type PositionalRecord,
} from "./positionTendency";

describe("tendência por posição", () => {
  it("ordena da PIOR posição (menor acerto) pra melhor", () => {
    const recs: PositionalRecord[] = [
      // BTN: 1 acerto em 5 (20%)
      ...Array.from({ length: 5 }, (_, i) => ({ position: "BTN", correct: i === 0 })),
      // UTG: 4 acertos em 5 (80%)
      ...Array.from({ length: 5 }, (_, i) => ({ position: "UTG", correct: i !== 0 })),
    ];
    const rep = reportFromRecords(recs);
    expect(rep[0].position).toBe("BTN");
    expect(rep[0].accuracy).toBeCloseTo(0.2, 5);
    expect(rep[1].position).toBe("UTG");
  });

  it("não mostra posição com amostra pequena (< mínimo)", () => {
    const recs: PositionalRecord[] = [
      { position: "SB", correct: false },
      { position: "SB", correct: true },
    ];
    expect(reportFromRecords(recs)).toEqual([]);
  });

  it("detecta tendência AGRESSIVA (call/raise quando era fold)", () => {
    const recs: PositionalRecord[] = Array.from({ length: 6 }, () => ({
      position: "BTN",
      correct: false,
      heroFam: "aggro" as const,
      adviceFam: "fold" as const,
    }));
    const rep = reportFromRecords(recs);
    expect(rep[0].tendency).toBe("agressivo");
    expect(rep[0].aggressiveErrors).toBe(6);
    expect(rep[0].leakLabel).toContain("call/raise");
  });

  it("detecta tendência PASSIVA (fold quando era continuar)", () => {
    const recs: PositionalRecord[] = Array.from({ length: 5 }, () => ({
      position: "BB",
      correct: false,
      heroFam: "fold" as const,
      adviceFam: "aggro" as const,
    }));
    const rep = reportFromRecords(recs);
    expect(rep[0].tendency).toBe("passivo");
    expect(rep[0].passiveErrors).toBe(5);
  });

  it("com poucos erros não afirma tendência (null)", () => {
    expect(tendencyFromCounts(1, 1).tendency).toBeNull();
    expect(tendencyFromCounts(2, 0).tendency).toBeNull();
  });

  it("erros divididos → equilibrado", () => {
    expect(tendencyFromCounts(3, 3).tendency).toBe("equilibrado");
  });

  it("reportFromCounts espelha reportFromRecords", () => {
    const rep = reportFromCounts({
      BTN: { hands: 10, correct: 4, aggressive: 5, passive: 1 },
      UTG: { hands: 8, correct: 7, aggressive: 1, passive: 0 },
    });
    expect(rep[0].position).toBe("BTN"); // pior acerto primeiro
    expect(rep[0].tendency).toBe("agressivo");
    expect(rep[1].position).toBe("UTG");
  });
});

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
    const recs: PositionalRecord[] = Array.from({ length: 10 }, () => ({
      position: "BTN",
      correct: false,
      heroFam: "aggro" as const,
      adviceFam: "fold" as const,
    }));
    const rep = reportFromRecords(recs);
    expect(rep[0].tendency).toBe("agressivo");
    expect(rep[0].aggressiveErrors).toBe(10);
    expect(rep[0].leakLabel).toContain("call/raise");
  });

  it("detecta tendência PASSIVA (fold quando era continuar)", () => {
    const recs: PositionalRecord[] = Array.from({ length: 9 }, () => ({
      position: "BB",
      correct: false,
      heroFam: "fold" as const,
      adviceFam: "aggro" as const,
    }));
    const rep = reportFromRecords(recs);
    expect(rep[0].tendency).toBe("passivo");
    expect(rep[0].passiveErrors).toBe(9);
  });

  it("com poucos erros não afirma tendência (null)", () => {
    expect(tendencyFromCounts(1, 1).tendency).toBeNull();
    expect(tendencyFromCounts(2, 0).tendency).toBeNull();
    // 🐞 15/09/2026: com 3 erros (2 de um lado) o app carimbava "agressivo
    // demais". Calculado: 50% de chance de rotular POR ACASO quem erra igual
    // para os dois lados. O Allan viu o resultado disso — 8 das 9 posições
    // marcadas, todas com 80%-94% de acerto.
    expect(tendencyFromCounts(2, 1).tendency, "3 erros ainda rotulavam").toBeNull();
    expect(tendencyFromCounts(5, 2).tendency, "7 erros ainda é pouco").toBeNull();
  });

  it("proporção alta mas margem pequena não vira tendência", () => {
    // 6×2: passa nos 70%, mas 4 de margem é o mínimo — 6-2 = 4, passa.
    expect(tendencyFromCounts(6, 2).tendency).toBe("agressivo");
    // 6×3: 67% não chega aos 70%.
    expect(tendencyFromCounts(6, 3).tendency).toBe("equilibrado");
  });

  it("⚠️ posição que já vai BEM não recebe rótulo de vazamento", () => {
    // Era o caso do print do Allan: 94% de acerto marcado "agressivo demais".
    // Quem acerta quase tudo numa posição não tem o que corrigir ali.
    expect(tendencyFromCounts(10, 1, 0.94).tendency).toBeNull();
    expect(tendencyFromCounts(10, 1, 0.9).tendency).toBeNull();
    // Com acerto baixo, o mesmo padrão de erro vira diagnóstico de verdade.
    expect(tendencyFromCounts(10, 1, 0.6).tendency).toBe("agressivo");
  });

  it("erros divididos → equilibrado", () => {
    expect(tendencyFromCounts(5, 5).tendency).toBe("equilibrado");
  });

  it("reportFromCounts espelha reportFromRecords", () => {
    const rep = reportFromCounts({
      BTN: { hands: 30, correct: 12, aggressive: 16, passive: 2 },
      UTG: { hands: 8, correct: 7, aggressive: 1, passive: 0 },
    });
    expect(rep[0].position).toBe("BTN"); // pior acerto primeiro
    expect(rep[0].tendency).toBe("agressivo");
    expect(rep[1].position).toBe("UTG");
  });
});

import { describe, it, expect } from "vitest";
import { seededRng } from "../engine/cards";
import {
  prizePool,
  paidPlaces,
  payoutLadder,
  tablePayouts,
  unevenStacks,
  STAGES,
} from "./structure";

describe("premiação e escada de prêmios", () => {
  it("premiação = buy-in × inscritos", () => {
    expect(prizePool(5, 100)).toBe(500);
    expect(prizePool(109, 500)).toBe(54500);
  });

  it("paga ~15% do campo (mínimo 1)", () => {
    expect(paidPlaces(100)).toBe(15);
    expect(paidPlaces(3)).toBe(1);
  });

  it("a escada soma exatamente a premiação", () => {
    const pool = prizePool(22, 200);
    const ladder = payoutLadder(200, pool);
    expect(ladder.reduce((a, b) => a + b, 0)).toBe(pool);
  });

  it("os prêmios decrescem (1º > 2º > 3º ...)", () => {
    const ladder = payoutLadder(300, prizePool(11, 300));
    for (let i = 1; i < ladder.length; i++) {
      expect(ladder[i - 1]).toBeGreaterThanOrEqual(ladder[i]);
    }
    expect(ladder[0]).toBeGreaterThan(ladder[1]);
  });

  it("campo pequeno (poucos pagos) ainda soma e decresce", () => {
    const pool = prizePool(55, 20); // paga 3
    const ladder = payoutLadder(20, pool);
    expect(ladder.length).toBe(3);
    expect(ladder.reduce((a, b) => a + b, 0)).toBe(pool);
    expect(ladder[0]).toBeGreaterThan(ladder[2]);
  });

  it("a mínima premiação nunca é zero (~1,5× buy-in)", () => {
    const ladder = payoutLadder(500, prizePool(11, 500));
    const minCash = ladder[ladder.length - 1];
    expect(minCash).toBeGreaterThan(0);
    expect(minCash).toBeGreaterThanOrEqual(Math.round(1.5 * 11) - 1);
  });
});

describe("prêmios da mesa para o ICM", () => {
  const ladder = payoutLadder(500, prizePool(22, 500));

  it("sem ICM → indefinido", () => {
    expect(tablePayouts("none", ladder)).toBeUndefined();
  });

  it("mesa final → os 9 maiores prêmios, decrescentes", () => {
    const p = tablePayouts("final", ladder)!;
    expect(p.length).toBe(9);
    expect(p[0]).toBe(ladder[0]);
    expect(p[0]).toBeGreaterThan(p[8]);
  });

  it("bolha → 3 dos 9 não pagam (zeros no fim)", () => {
    const p = tablePayouts("bubble", ladder)!;
    expect(p.length).toBe(9);
    expect(p[6]).toBe(0);
    expect(p[7]).toBe(0);
    expect(p[8]).toBe(0);
    expect(p[0]).toBeGreaterThan(0);
  });
});

describe("stacks desiguais", () => {
  it("gera n stacks com média próxima do alvo e variação real", () => {
    const rng = seededRng(7);
    const avg = STAGES.mesa_final.avgBB * 600; // 20bb × 600
    const stacks = unevenStacks(avg, 9, STAGES.mesa_final.spread, rng);
    expect(stacks.length).toBe(9);
    const total = stacks.reduce((a, b) => a + b, 0);
    // Soma próxima de 9 × média (tolerância por piso e arredondamento).
    expect(Math.abs(total - avg * 9) / (avg * 9)).toBeLessThan(0.2);
    // Há desigualdade real: o maior é claramente maior que o menor.
    expect(Math.max(...stacks)).toBeGreaterThan(Math.min(...stacks) * 1.3);
  });

  it("respeita um piso mínimo de fichas", () => {
    const rng = seededRng(3);
    const stacks = unevenStacks(10000, 9, 0.6, rng, 2000);
    for (const s of stacks) expect(s).toBeGreaterThanOrEqual(1200); // piso ~12% da média
  });
});

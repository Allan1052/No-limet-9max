import { describe, it, expect } from "vitest";
import { cardsFromString, seededRng } from "./cards";
import { equityHandVsHand, equityVsRandom, equityHandVsRange } from "./equity";

// Tolerância: Monte Carlo tem ruído. Com 60k iterações e semente fixa, ±1.5%
// é folgado. Os valores de referência são números clássicos e bem conhecidos.
const ITER = 60000;
const TOL = 0.015;

function hvh(hero: string, villain: string, board = "") {
  return equityHandVsHand(
    cardsFromString(hero),
    cardsFromString(villain),
    board ? cardsFromString(board) : [],
    ITER,
    seededRng(12345),
  ).equity;
}

describe("equity — confrontos pré-flop conhecidos", () => {
  it("AA vs KK ≈ 82%", () => {
    expect(hvh("AsAh", "KsKh")).toBeCloseTo(0.82, 1);
    expect(Math.abs(hvh("AsAh", "KsKh") - 0.823)).toBeLessThan(TOL);
  });

  it("AKs vs QQ ≈ 46% (corrida clássica)", () => {
    // AK suited contra um par médio: por volta de 46-47%.
    expect(Math.abs(hvh("AsKs", "QhQd") - 0.465)).toBeLessThan(0.02);
  });

  it("AKo vs 22 ≈ 46.5% (o par baixo é levemente favorito)", () => {
    // Duas cartas altas contra um par pequeno: quase moeda ao ar, mas o par
    // leva a melhor por pouco (~53%), então AK fica perto de 46-47%.
    expect(Math.abs(hvh("AsKh", "2c2d") - 0.465)).toBeLessThan(0.02);
  });

  it("dominação: AK vs AQ ≈ 74%", () => {
    expect(Math.abs(hvh("AsKh", "AdQc") - 0.74) < 0.02).toBe(true);
  });
});

describe("equity — no board", () => {
  it("no flop, set esmaga projeto de flush", () => {
    // 888 (trinca) vs AKs com nut flush draw no flop seco.
    const eq = equityHandVsHand(
      cardsFromString("8h8d"),
      cardsFromString("AsKs"),
      cardsFromString("8s5c2d"),
      ITER,
      seededRng(999),
    ).equity;
    expect(eq).toBeGreaterThan(0.85);
  });
});

describe("equity — vs mão aleatória", () => {
  it("AA vence ~85% contra uma mão aleatória", () => {
    const eq = equityVsRandom(cardsFromString("AsAh"), [], ITER, seededRng(7)).equity;
    expect(eq).toBeGreaterThan(0.83);
    expect(eq).toBeLessThan(0.88);
  });
});

describe("equity — vs range", () => {
  it("QQ contra {AA, KK} está em desvantagem (~18%)", () => {
    const range = [cardsFromString("AsAh"), cardsFromString("KsKh")];
    const r = equityHandVsRange(cardsFromString("QcQd"), range, [], ITER, seededRng(3));
    expect(r.equity).toBeLessThan(0.25);
    expect(r.sampled).toBeGreaterThan(ITER * 0.9);
  });
});

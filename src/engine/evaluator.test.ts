import { describe, it, expect } from "vitest";
import { cardsFromString } from "./cards";
import { evaluate, categoryOf, Category, CATEGORY_NAMES_PT } from "./evaluator";

function val(hand: string): number {
  return evaluate(cardsFromString(hand));
}
function cat(hand: string): number {
  return categoryOf(val(hand));
}

describe("evaluator — categorias", () => {
  it("reconhece straight flush", () => {
    expect(cat("Ts Js Qs Ks As 2c 3d")).toBe(Category.StraightFlush);
  });
  it("reconhece a roda como straight (A-2-3-4-5)", () => {
    expect(cat("As 2c 3d 4h 5s Kd Qc")).toBe(Category.Straight);
  });
  it("reconhece straight flush na roda", () => {
    expect(cat("As 2s 3s 4s 5s Kd Qc")).toBe(Category.StraightFlush);
  });
  it("reconhece quadra", () => {
    expect(cat("7s 7h 7d 7c Ks 2c 3d")).toBe(Category.Quads);
  });
  it("reconhece full house", () => {
    expect(cat("7s 7h 7d Kc Ks 2c 3d")).toBe(Category.FullHouse);
  });
  it("reconhece flush", () => {
    expect(cat("2s 5s 8s Js Ks 3c 4d")).toBe(Category.Flush);
  });
  it("reconhece trinca", () => {
    expect(cat("9s 9h 9d Kc 2s 3c 4d")).toBe(Category.Trips);
  });
  it("reconhece dois pares", () => {
    expect(cat("9s 9h Kc Kd 2s 3c 4d")).toBe(Category.TwoPair);
  });
  it("reconhece par", () => {
    expect(cat("9s 9h Kc Qd 2s 3c 4d")).toBe(Category.Pair);
  });
  it("reconhece carta alta", () => {
    expect(cat("9s 7h Kc Qd 2s 3c 4d")).toBe(Category.HighCard);
  });
});

describe("evaluator — comparações de força", () => {
  it("straight flush > quadra", () => {
    expect(val("Ts Js Qs Ks As 2c 3d")).toBeGreaterThan(val("7s 7h 7d 7c Ks 2c 3d"));
  });
  it("full house > flush", () => {
    expect(val("7s 7h 7d Kc Ks 2c 3d")).toBeGreaterThan(val("2s 5s 8s Js Ks 3c 4d"));
  });
  it("desempate de par por kicker (A vence Q)", () => {
    const comA = val("9s 9h Ac 5d 2s 3c 4d");
    const comQ = val("9s 9h Qc 5d 2s 3c 4d");
    expect(comA).toBeGreaterThan(comQ);
  });
  it("full house maior trinca vence", () => {
    expect(val("Ks Kh Kd 2c 2s 5c 6d")).toBeGreaterThan(val("Qs Qh Qd Ac As 5c 6d"));
  });
  it("dois pares mais altos vencem", () => {
    expect(val("As Ah Kc Kd 2s 3c 4d")).toBeGreaterThan(val("Qs Qh Jc Jd As Kc 4d"));
  });
  it("straight mais alto vence a roda", () => {
    expect(val("6s 7c 8d 9h Ts 2c 3d")).toBeGreaterThan(val("As 2c 3d 4h 5s Kd Qc"));
  });
});

describe("evaluator — nomes das categorias", () => {
  it("mapeia categoria para nome em pt-BR", () => {
    expect(CATEGORY_NAMES_PT[Category.FullHouse]).toBe("Full house");
    expect(CATEGORY_NAMES_PT[Category.StraightFlush]).toBe("Straight flush");
  });
});

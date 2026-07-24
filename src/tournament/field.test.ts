import { describe, it, expect } from "vitest";
import {
  initialFieldRemaining,
  attritionPerHand,
  estimateHeroRank,
  fieldStatus,
  cashForPlace,
} from "./field";
import { paidPlaces, prizePool, payoutLadder } from "./structure";

describe("campo do torneio", () => {
  it("campo inicial reflete o estágio escolhido", () => {
    const paid = paidPlaces(2500);
    expect(initialFieldRemaining(2500, "inicio", paid)).toBe(2500);
    expect(initialFieldRemaining(2500, "mesa_final", paid)).toBe(9);
    // Bolha: logo acima do dinheiro.
    const bubble = initialFieldRemaining(2500, "bolha", paid);
    expect(bubble).toBeGreaterThan(paid);
    expect(bubble).toBeLessThan(paid * 1.2);
  });

  it("atrito encolhe o campo e acelera com o nível de blind", () => {
    const early = attritionPerHand(1000, 0);
    const late = attritionPerHand(1000, 5);
    expect(late).toBeGreaterThan(early);
    // Perto da mesa final o atrito global zera.
    expect(attritionPerHand(9, 3)).toBe(0);
  });

  it("classificação: stack grande fica perto do topo, curto perto do fim", () => {
    const big = estimateHeroRank(1000, 30000, 10000);
    const short = estimateHeroRank(1000, 2000, 10000);
    expect(big).toBeLessThan(short);
    expect(big).toBeGreaterThanOrEqual(1);
    expect(short).toBeLessThanOrEqual(1000);
  });

  it("estouro da bolha: dentro do dinheiro garante prêmio", () => {
    const pool = prizePool(11, 2500);
    const ladder = payoutLadder(2500, pool);
    // Fora do dinheiro (muitos vivos): sem cash, com jogadores até a bolha.
    const out = fieldStatus({ entrants: 2500, remaining: 900, heroStack: 5000, avgStack: 5000, ladder });
    expect(out.inMoney).toBe(false);
    expect(out.currentCash).toBe(0);
    expect(out.toBubble).toBeGreaterThan(0);
    // Dentro do dinheiro (poucos vivos): garante ao menos a mínima.
    const itm = fieldStatus({ entrants: 2500, remaining: 50, heroStack: 20000, avgStack: 12000, ladder });
    expect(itm.inMoney).toBe(true);
    expect(itm.currentCash).toBeGreaterThan(0);
    expect(itm.toBubble).toBe(0);
  });

  it("cash por posição: 1º > min-cash > fora do dinheiro", () => {
    const pool = prizePool(11, 500);
    const ladder = payoutLadder(500, pool);
    expect(cashForPlace(1, ladder)).toBeGreaterThan(cashForPlace(ladder.length, ladder));
    expect(cashForPlace(ladder.length + 1, ladder)).toBe(0);
  });
});

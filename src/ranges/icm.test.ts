import { describe, it, expect } from "vitest";
import {
  icmEquity,
  requiredEquityToCall,
  bubbleFactor,
  icmTightenFactor,
} from "./icm";

describe("ICM — valores de prêmio", () => {
  it("os valores somam o prêmio total", () => {
    const vals = icmEquity([5000, 3000, 2000], [50, 30, 20]);
    const sum = vals.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(100, 5);
  });

  it("stacks iguais → valores iguais", () => {
    const vals = icmEquity([1000, 1000, 1000], [50, 30, 20]);
    expect(vals[0]).toBeCloseTo(vals[1], 6);
    expect(vals[1]).toBeCloseTo(vals[2], 6);
    expect(vals[0]).toBeCloseTo(100 / 3, 5);
  });

  it("ICM é côncavo: o líder vale MENOS que sua fatia de fichas", () => {
    const stacks = [8000, 1000, 1000];
    const vals = icmEquity(stacks, [50, 30, 20]);
    const chipShare = 8000 / 10000; // 0.8
    const prizeShare = vals[0] / 100;
    expect(prizeShare).toBeLessThan(chipShare); // não recebe 80% do prêmio
    // ...mas ainda é o maior valor da mesa
    expect(vals[0]).toBeGreaterThan(vals[1]);
    expect(vals[0]).toBeGreaterThan(vals[2]);
  });

  it("stack maior nunca vale menos que um menor", () => {
    const vals = icmEquity([4000, 3000, 2000, 1000], [40, 30, 20, 10]);
    expect(vals[0]).toBeGreaterThanOrEqual(vals[1]);
    expect(vals[1]).toBeGreaterThanOrEqual(vals[2]);
    expect(vals[2]).toBeGreaterThanOrEqual(vals[3]);
  });
});

describe("ICM — pressão de bolha", () => {
  // Cenário de bolha: 4 jogadores, pagam 3. Herói e vilão médios; quebrar
  // significa não pagar. Pagar all-in deve exigir bem mais que 50% de equity.
  const bubble = {
    stacks: [3000, 3000, 3000, 1000],
    payouts: [50, 30, 20], // 4º não paga
    hero: 0,
    villain: 1,
    chips: 3000,
  };

  it("exige mais de 50% de equity para pagar na bolha", () => {
    const req = requiredEquityToCall(bubble);
    expect(req).toBeGreaterThan(0.5);
  });

  it("bubble factor > 1 sob pressão", () => {
    expect(bubbleFactor(bubble)).toBeGreaterThan(1);
  });

  it("aperta a range (fator < 1) e respeita a sensibilidade do perfil", () => {
    const sensível = icmTightenFactor(bubble, 0.9);
    const insensível = icmTightenFactor(bubble, 0.4);
    expect(sensível).toBeLessThan(1);
    expect(sensível).toBeLessThan(insensível); // mais sensível aperta mais
  });

  it("sem prêmios em jogo relevantes, não há aperto", () => {
    // Todos com stacks iguais e longe de qualquer bolha efetiva.
    const flat = {
      stacks: [10000, 10000, 10000, 10000, 10000],
      payouts: [100], // winner-take-all: sem laddering, menos pressão de bolha
      hero: 0,
      villain: 1,
      chips: 10000,
    };
    // winner-take-all tende a não gerar prêmio de risco (bubble factor ~1).
    expect(icmTightenFactor(flat, 0.9)).toBeCloseTo(1, 2);
  });
});

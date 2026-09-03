import { describe, it, expect } from "vitest";
import {
  icmEquity,
  requiredEquityToCall,
  requiredEquityForDecision,
  icmStatesFromSpot,
  bubbleFactor,
  icmTightenFactor,
} from "./icm";

describe("ICM — call barato do BB não é inflado (bug KQs do Allan)", () => {
  // Herói no BB, total 6.5bb (5.5 atrás + 1 blind já pago). Vilão all-in 1.7bb.
  // 6 vivos, perto do dinheiro. Pagar custa só 0.7bb — jamais deveria exigir
  // uma equity gigante. O bug: usar os stacks ATRÁS subcontava o estado de
  // "perder" (herói caía de 5.5→3.8 em vez de 6.5→4.8), inflando a exigência.
  const payouts = [100, 60, 40, 25, 15, 0];
  const villainIdx = 3;
  it("a convenção de stacks TOTAIS exige menos equity que a antiga (atrás)", () => {
    const totais = { stacks: [6.5, 12, 5, 1.7, 9, 12], payouts, hero: 0, villain: villainIdx, chips: 1.7 };
    const atras = { stacks: [5.5, 12, 5, 0, 9, 12], payouts, hero: 0, villain: villainIdx, chips: 1.7 };
    const reqTotais = requiredEquityForDecision(icmStatesFromSpot(totais, 1.0, true));
    const reqAtras = requiredEquityForDecision(icmStatesFromSpot(atras, 1.0, false));
    expect(reqTotais).toBeLessThan(reqAtras); // corrigido exige menos
    expect(reqTotais).toBeLessThan(0.58); // pagável por KQs (~57% de equity)
  });
});

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

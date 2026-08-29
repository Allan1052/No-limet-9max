import { describe, expect, it } from "vitest";
import { icmEquity, requiredEquityForDecision } from "./icm";

describe("Motor V2 — ICM por estados reais da decisão", () => {
  it("usa o stack de fold atual e não devolve fichas já investidas", () => {
    // Hero começou a mão com 30, já investiu 7 e agora tem 23 atrás.
    // Ao foldar, fica com 23 — os 7 são custo afundado.
    const foldStacks = [23, 30, 20];
    const winStacks = [40, 20, 13];
    const loseStacks = [18, 35, 20];
    const payouts = [100, 60, 40];

    const req = requiredEquityForDecision({ foldStacks, winStacks, loseStacks, payouts, hero: 0 });
    const foldValue = icmEquity(foldStacks, payouts)[0];
    const winValue = icmEquity(winStacks, payouts)[0];
    const loseValue = icmEquity(loseStacks, payouts)[0];
    const expected = (foldValue - loseValue) / (winValue - loseValue);

    expect(req).toBeCloseTo(expected, 10);
  });

  it("não depende de um short stack alheio quando os três estados do confronto são iguais", () => {
    const payouts = [100, 60, 40, 20];
    const a = requiredEquityForDecision({
      foldStacks: [30, 30, 25, 2],
      winStacks: [45, 15, 25, 2],
      loseStacks: [20, 40, 25, 2],
      payouts,
      hero: 0,
    });
    const b = requiredEquityForDecision({
      foldStacks: [30, 30, 25, 12],
      winStacks: [45, 15, 25, 12],
      loseStacks: [20, 40, 25, 12],
      payouts,
      hero: 0,
    });

    // O terceiro adversário pode mudar a pressão de ICM, mas não pode redefinir
    // arbitrariamente o risco Hero-vilão para o menor stack global.
    expect(Math.abs(a - b)).toBeLessThan(0.08);
  });

  it("retorna 50% em estado degenerado sem ganho entre perder e vencer", () => {
    const stacks = [20, 20, 20];
    expect(requiredEquityForDecision({
      foldStacks: stacks,
      winStacks: stacks,
      loseStacks: stacks,
      payouts: [100, 60, 40],
      hero: 0,
    })).toBe(0.5);
  });
});

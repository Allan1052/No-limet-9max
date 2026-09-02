import { describe, expect, it } from "vitest";
import { buildCoachV2Decision } from "./coachV2Decision";
import type { HeroAdvice } from "./analyzer";

describe("CoachV2Decision", () => {
  it("contextualiza uma resposta a 3-bet no pre-flop", () => {
    const advice: HeroAdvice = { kind: "preflop", action: "call", reason: "continuar", heroPosition: "BTN", effectiveBB: 42, betLevelFaced: 2 };
    const d = buildCoachV2Decision(advice, { street: "preflop", potBB: 10.5, toCallBB: 4.8 });
    expect(d.action).toBe("call");
    expect(d.contextLabel).toContain("BTN");
    expect(d.contextLabel).toContain("42bb");
    expect(d.contextLabel.toLowerCase()).toContain("3-bet");
  });

  it("preserva sizing e metricas pos-flop", () => {
    const advice: HeroAdvice = { kind: "postflop", action: "raise", reason: "pressao", equity: 0.41, potOdds: 0.25, villainRangePct: 0.22, effectiveBB: 36, potBB: 15, betSizePct: 0.67, betSizeBB: 10.1 };
    const d = buildCoachV2Decision(advice, { street: "flop", potBB: 15, toCallBB: 5, spr: 2.4 });
    expect(d.equity).toBe(0.41);
    expect(d.requiredEquity).toBe(0.25);
    expect(d.betSizePct).toBe(0.67);
    expect(d.betSizeBB).toBe(10.1);
    expect(d.spr).toBe(2.4);
  });

  it("nao inventa metricas ausentes", () => {
    const advice: HeroAdvice = { kind: "preflop", action: "fold", reason: "fold", heroPosition: "UTG", effectiveBB: 28 };
    const d = buildCoachV2Decision(advice, { street: "preflop" });
    expect(d.equity).toBeUndefined();
    expect(d.requiredEquity).toBeUndefined();
    expect(d.evBB).toBeUndefined();
    expect(d.betSizePct).toBeUndefined();
  });

  it("mostra o porque so quando o FOLD tem preco barato (spot que engana)", () => {
    // KJo do SB: preco barato (paga 1.5 num pote de 6.6 ~ 19%) mas o motor folda.
    const advice: HeroAdvice = {
      kind: "preflop",
      action: "fold",
      reason: "KJo: sem posição e sem valor de 3-bet, foldar é melhor que pagar dominado.",
      heroPosition: "SB",
      effectiveBB: 49,
    };
    const d = buildCoachV2Decision(advice, { street: "preflop", potBB: 6.6, toCallBB: 1.5 });
    expect(d.trapNote).toBeDefined();
    expect(d.trapNote).toMatch(/^Tá barato, mas /);
    // usa o motivo REAL do motor (sem o prefixo do codigo da mao "KJo:").
    expect(d.trapNote).toContain("sem posição");
    expect(d.trapNote).not.toContain("KJo");
  });

  it("nao mostra o porque quando o preco do fold e caro", () => {
    const advice: HeroAdvice = { kind: "preflop", action: "fold", reason: "KQo: fora do range de defesa.", heroPosition: "BB", effectiveBB: 30 };
    // Paga 6 num pote de 6 = 50% (caro): nao e o "ta barato" que engana.
    const d = buildCoachV2Decision(advice, { street: "preflop", potBB: 6, toCallBB: 6 });
    expect(d.trapNote).toBeUndefined();
  });

  it("nao mostra o porque em jogadas que nao sao fold", () => {
    const advice: HeroAdvice = { kind: "preflop", action: "call", reason: "AJs: paga barato o botao.", heroPosition: "BB", effectiveBB: 40 };
    const d = buildCoachV2Decision(advice, { street: "preflop", potBB: 8, toCallBB: 1 });
    expect(d.trapNote).toBeUndefined();
  });
});

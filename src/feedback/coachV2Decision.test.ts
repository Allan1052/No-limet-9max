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

  // -------------------------------------------------------------------------
  // A NOTA DA FAIXA (12/09/2026 — reescrita a pedido do Allan).
  //
  // REGRA ANTIGA: a faixa só explicava o fold barato e ficava muda no resto.
  // REGRA NOVA: a faixa explica SEMPRE; o gancho "Tá barato, mas" é que é
  // exceção — e só vale quando pagar é barato no POTE e no STACK.
  // -------------------------------------------------------------------------

  it("explica TODA recomendação — inclusive raise e call", () => {
    for (const action of ["raise", "3bet", "call", "check", "fold"]) {
      const advice: HeroAdvice = {
        kind: "preflop",
        action,
        reason: "KJs: 3-bet por valor contra abertura de CO.",
        heroPosition: "BB",
        effectiveBB: 44,
      };
      const d = buildCoachV2Decision(advice, { street: "preflop", potBB: 2.6, toCallBB: 1 });
      expect(d.trapNote, `${action} ficou sem porquê`).toBeDefined();
      expect(d.trapNote).toContain("3-bet por valor");
    }
  });

  it("tira o código da mão (as cartas estão na mesa) e mantém o resto", () => {
    const advice: HeroAdvice = {
      kind: "preflop", action: "fold", heroPosition: "SB", effectiveBB: 49,
      reason: "KJo: sem posição e sem valor de 3-bet, foldar é melhor que pagar dominado.",
    };
    const d = buildCoachV2Decision(advice, { street: "preflop", potBB: 6.6, toCallBB: 1.5, heroHandTempting: true });
    expect(d.trapNote).toContain("sem posição");
    expect(d.trapNote).not.toContain("KJo");
  });

  it("MANTÉM OS NÚMEROS do motivo — era aqui que a frase virava jargão vazio", () => {
    // Regressão real: a nota passava por plainReason, que apagava toda
    // porcentagem. "Paga: equity 52% ≥ preço 38%" chegava na tela como
    // "Paga: ≥." e o caso de ICM como "exige (2 oponentes)", sem o número.
    const advice: HeroAdvice = {
      kind: "postflop", action: "call", heroPosition: "BB", effectiveBB: 40,
      reason: "Paga: equity 52% ≥ preço 38%.",
    };
    const d = buildCoachV2Decision(advice, { street: "flop", potBB: 10, toCallBB: 3 });
    expect(d.trapNote).toContain("52%");
    expect(d.trapNote).toContain("38%");
    expect(d.trapNote).not.toBe("Paga: ≥.");
  });

  it("o gancho 'Tá barato' aparece no fold barato com mão que tenta", () => {
    const advice: HeroAdvice = {
      kind: "preflop", action: "fold", heroPosition: "SB", effectiveBB: 49,
      reason: "KJo: sem posição e sem valor de 3-bet, foldar é melhor que pagar dominado.",
    };
    const d = buildCoachV2Decision(advice, { street: "preflop", potBB: 6.6, toCallBB: 1.5, heroHandTempting: true });
    expect(d.trapNote).toMatch(/^Tá barato, mas /);
  });

  it("BARATO EXIGE O STACK TAMBÉM: 10,2bb com stack de 10,7bb não é barato", () => {
    // O print do Allan (12/09): dois all-ins, pagar 10,2bb num pote de 22,9bb
    // dava 31% do pote — "barato" pela conta antiga. Eram 95% do stack dele.
    const advice: HeroAdvice = {
      kind: "preflop", action: "fold", heroPosition: "BB", effectiveBB: 10.7,
      reason: "QJs: folda: equity 34% < preço do pote 31% + ICM (prêmio de risco) → exige 45% (2 oponentes).",
    };
    const d = buildCoachV2Decision(advice, { street: "preflop", potBB: 22.9, toCallBB: 10.2, heroHandTempting: true });
    expect(d.trapNote).toBeDefined();               // o porquê continua
    expect(d.trapNote).not.toMatch(/Tá barato/);    // a mentira, não
    expect(d.trapNote).toContain("45%");            // e com o número de volta
  });

  it("lixo óbvio não ganha o gancho, mas ganha o porquê", () => {
    const advice: HeroAdvice = {
      kind: "preflop", action: "fold", heroPosition: "CO", effectiveBB: 16,
      reason: "82o: fora do range de re-shove; flatar dominado é pior que foldar.",
    };
    const d = buildCoachV2Decision(advice, { street: "preflop", potBB: 4.5, toCallBB: 2, heroHandTempting: false });
    expect(d.trapNote).not.toMatch(/Tá barato/);
    expect(d.trapNote).toContain("ora do range de re-shove");
  });

  it("fold com preço CARO não ganha o gancho", () => {
    const advice: HeroAdvice = { kind: "preflop", action: "fold", reason: "KQo: fora do range de defesa aqui.", heroPosition: "BB", effectiveBB: 30 };
    const d = buildCoachV2Decision(advice, { street: "preflop", potBB: 6, toCallBB: 6, heroHandTempting: true });
    expect(d.trapNote).not.toMatch(/Tá barato/);
  });

  it("o porquê COMPLETO vai junto, para o painel que abre no ▾", () => {
    const advice: HeroAdvice = {
      kind: "preflop", action: "fold", heroPosition: "BB", effectiveBB: 14,
      reason: "J8o: 14bb enfrentando a abertura de SB — fora do range de re-shove; flatar dominado com stack curto (ainda mais OOP) é pior que foldar.",
    };
    const d = buildCoachV2Decision(advice, { street: "preflop", potBB: 3.3, toCallBB: 1 });
    expect(d.porQueCompleto).toContain("flatar dominado");   // a frase inteira
    expect(d.trapNote!.length).toBeLessThan(d.porQueCompleto!.length); // a faixa é o resumo
  });

  it("motivo vazio não vira nota", () => {
    const advice: HeroAdvice = { kind: "preflop", action: "fold", reason: "", heroPosition: "BB", effectiveBB: 20 };
    const d = buildCoachV2Decision(advice, { street: "preflop", potBB: 3, toCallBB: 1 });
    expect(d.trapNote).toBeUndefined();
    expect(d.porQueCompleto).toBeUndefined();
  });
});

import { describe, it, expect } from "vitest";
import { seededRng, makeCard } from "../engine/cards";
import { MODULES, buildScenario, buildScenarioFromSpec, evaluateChoice, isCorrect } from "./scenarios";
import { recordResult, moduleView, type MasteryState } from "./mastery";

describe("Módulos de Maestria — cenários", () => {
  it("cada módulo gera um cenário jogável com ações e recomendação", () => {
    for (const m of MODULES) {
      const s = buildScenario(m, seededRng(42));
      expect(s.hand).toHaveLength(2);
      expect(s.actions.length).toBeGreaterThanOrEqual(2);
      expect(s.advice.kind).toBe("preflop");
      expect(["fold", "raise", "call", "3bet", "jam"]).toContain(s.advice.action);
    }
  });

  it("fixedHand: o 1×1 abre com as cartas montadas e preserva a fase", () => {
    const hand = [makeCard(14, 3), makeCard(7, 3)]; // A♠ 7♠ (a mão do Allan)
    const sc = buildScenarioFromSpec(
      { heroPosition: "BB", effectiveBB: 20, raiserPosition: "BTN", openSizeBB: 2.3, fixedHand: hand, stage: "bolha" },
      Math.random,
    );
    expect(sc.hand).toEqual(hand);
    expect(sc.spec.stage).toBe("bolha");
    expect(sc.advice.kind).toBe("preflop");
  });

  it("facingAllin: 1×1 oferece só Fold/Call e decide por equity", () => {
    const sc = buildScenarioFromSpec(
      { heroPosition: "BB", effectiveBB: 15, raiserPosition: "BTN", facingAllin: true, fixedHand: [makeCard(10, 3), makeCard(10, 2)] },
      Math.random,
    );
    expect(sc.actions.map((a) => a.key).sort()).toEqual(["call", "fold"]);
    expect(sc.advice.action).toBe("call"); // TT paga o shove de 15bb
  });

  it("push/fold oferece Fold e All-in (não raise pequeno)", () => {
    const pf = MODULES.find((m) => m.id === "push_fold")!;
    const s = buildScenario(pf, seededRng(7));
    const keys = s.actions.map((a) => a.key);
    expect(keys).toContain("fold");
    expect(keys).toContain("allin");
    expect(keys).not.toContain("raise");
  });

  it("avaliar a jogada recomendada conta como acerto", () => {
    const m = MODULES[0];
    const s = buildScenario(m, seededRng(123));
    // Escolher a família da ação recomendada deve dar nota boa/ok (acerto).
    const map: Record<string, "fold" | "call" | "raise" | "allin"> = {
      fold: "fold",
      call: "call",
      raise: "raise",
      "3bet": "raise",
      jam: "allin",
    };
    const good = map[s.advice.action];
    // Só testa se a ação recomendada está entre as opções oferecidas.
    if (s.actions.some((a) => a.key === good)) {
      expect(isCorrect(evaluateChoice(s, good))).toBe(true);
    }
  });
});

describe("Módulos de Maestria — progresso", () => {
  it("dominar exige 16 dos últimos 20 acertos", () => {
    let state: MasteryState = {};
    // 4 erros + 15 acertos = janela de 19 → ainda não domina (faltam 20).
    for (let i = 0; i < 4; i++) state = recordResult(state, "x", false);
    for (let i = 0; i < 15; i++) state = recordResult(state, "x", true);
    expect(moduleView(state, "x").mastered).toBe(false);
    // O 16º acerto fecha a janela em 4F + 16T = 16/20 → domina.
    state = recordResult(state, "x", true);
    expect(moduleView(state, "x").mastered).toBe(true);
  });
});

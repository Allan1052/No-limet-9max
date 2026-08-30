import { describe, expect, it } from "vitest";
import { buildCoachV2HintView } from "./coachV2Hint";
import type { CoachV2Decision } from "../feedback/coachV2Decision";

function decision(overrides: Partial<CoachV2Decision> = {}): CoachV2Decision {
  return {
    street: "flop",
    action: "call",
    reason: "equity suficiente para continuar",
    contextLabel: "Flop · BTN · 42bb",
    potBB: 12,
    toCallBB: 4,
    equity: 0.41,
    requiredEquity: 0.25,
    spr: 2.5,
    ...overrides,
  };
}

describe("Dica visual Coach V2", () => {
  it("mostra ação, contexto e números reais do spot", () => {
    const view = buildCoachV2HintView(decision());
    expect(view.actionLabel).toBe("Pagar");
    expect(view.contextLabel).toBe("Flop · BTN · 42bb");
    expect(view.metrics).toContain("Pote 12bb");
    expect(view.metrics).toContain("Pagar 4bb");
    expect(view.metrics).toContain("Equity 41%");
    expect(view.metrics).toContain("Precisa 25%");
    expect(view.metrics).toContain("SPR 2.5");
  });

  it("mostra sizing quando o motor recomenda apostar", () => {
    const view = buildCoachV2HintView(decision({ action: "bet", betSizeBB: 7.5, betSizePct: 0.62 }));
    expect(view.actionLabel).toBe("Apostar ~7.5bb");
    expect(view.metrics).toContain("62% pote");
  });

  it("não inventa métricas ausentes", () => {
    const view = buildCoachV2HintView(decision({ potBB: undefined, toCallBB: undefined, equity: undefined, requiredEquity: undefined, spr: undefined }));
    expect(view.metrics).toEqual([]);
  });
});

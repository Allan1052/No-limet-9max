import { describe, expect, it } from "vitest";
import type { FeedbackItem } from "../feedback/analyzer";
import { buildCoachV2PostHandDecision } from "./coachV2PostHand";

const base: FeedbackItem = {
  street: "Flop",
  heroAction: "Call",
  advice: "Call",
  rating: "boa",
  text: "Você tem equity suficiente para continuar.",
  equity: 0.41,
  potOdds: 0.25,
  evBB: 2.3,
  betSizePct: 0.6,
  betSizeBB: 9,
};

describe("Coach V2 pós-mão", () => {
  it("no modo simples lidera com a decisão (veredito + jogada), motivo, e SEM números", () => {
    const view = buildCoachV2PostHandDecision(base, "simple");

    // rating "boa" + herói fez o recomendado (Call): veredito positivo.
    expect(view.decisionLine).toBe("✔ Boa! Call era o caminho.");
    expect(view.reason).toBe(base.text);
    expect(view.metrics).toEqual([]);
  });

  it("quando a jogada não foi a ideal, o veredito mostra o recomendado", () => {
    const view = buildCoachV2PostHandDecision(
      { ...base, heroAction: "Call", advice: "Fold", rating: "ruim" },
      "simple",
    );
    expect(view.decisionLine).toBe("✗ Melhor era Fold. Você fez Call.");
  });

  it("no modo técnico mostra apenas métricas realmente presentes no feedback", () => {
    const view = buildCoachV2PostHandDecision(base, "technical");

    expect(view.metrics).toEqual([
      "Equity 41%",
      "Preço 25%",
      "EV +2.3bb",
      "Sizing ~60% · 9bb",
    ]);

    const withoutMetrics = buildCoachV2PostHandDecision(
      { ...base, equity: undefined, potOdds: undefined, evBB: undefined, betSizePct: undefined, betSizeBB: undefined },
      "technical",
    );
    expect(withoutMetrics.metrics).toEqual([]);
  });
});

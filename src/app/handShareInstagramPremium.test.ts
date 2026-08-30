import { describe, expect, it } from "vitest";
import { instagramPremiumLayout, buildInstagramPremiumDecisionView } from "./handShareInstagramPremium";
import type { HandShareData } from "./handShareCard";

describe("Instagram premium share card", () => {
  it("usa formato vertical 4:5 para ocupar mais espaço no feed", () => {
    expect(instagramPremiumLayout.width).toBe(1080);
    expect(instagramPremiumLayout.height).toBe(1350);
    expect(instagramPremiumLayout.aspectRatio).toBe("4:5");
  });

  it("define hierarquia visual centrada em cartas e comparação Você x Coach V2", () => {
    expect(instagramPremiumLayout.heroCardsEmphasis).toBe("primary");
    expect(instagramPremiumLayout.decisionComparison).toBe("hero-vs-coach");
    expect(instagramPremiumLayout.metricsStyle).toBe("chips");
    expect(instagramPremiumLayout.brandSignature).toBe("Call ou Fold · Coach V2");
  });

  it("monta a comparação e mostra somente métricas realmente disponíveis", () => {
    const data = {
      heroCards: [], board: [], heroAction: "CALL", coachAction: "3-BET ~8BB", rating: "imprecisa",
      coachTip: "Você podia pressionar melhor esse range.", street: "Pré-Flop", tournamentInfo: "Call ou Fold",
      context: "", position: "BTN", stackBB: "38bb", equity: 0.41, potOdds: 0.25, evBB: 1.8,
    } as HandShareData;

    expect(buildInstagramPremiumDecisionView(data)).toEqual({
      heroAction: "VOCÊ: CALL",
      coachAction: "COACH V2: 3-BET ~8BB",
      metrics: ["Equity 41%", "Preço 25%", "EV +1.8bb"],
      signature: "Call ou Fold · Coach V2",
    });

    expect(buildInstagramPremiumDecisionView({ ...data, equity: undefined, potOdds: undefined, evBB: undefined }).metrics).toEqual([]);
  });
});

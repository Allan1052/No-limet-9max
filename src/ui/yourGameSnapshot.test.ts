import { describe, expect, it } from "vitest";
import type { FeedbackItem } from "../feedback/analyzer";
import type { ProgressSummary } from "../app/progress";
import { buildYourGameSnapshot } from "./yourGameSnapshot";

function summary(overrides: Partial<ProgressSummary> = {}): ProgressSummary {
  return {
    hands: 0,
    decisions: 0,
    goodRateAll: 0,
    goodRateWeek: 0,
    weekDecisions: 0,
    trend: 0,
    counts: { boa: 0, ok: 0, imprecisa: 0, ruim: 0 },
    chipsLostThisWeek: 0,
    chipsLostAllTime: 0,
    preflopFoldsThisWeek: 0,
    vpip: 0,
    cbetsThisWeek: 0,
    botsFoldedThisWeek: 0,
    evolutionLevel: 1,
    weeksCounts: {},
    ...overrides,
  };
}

function loosePreflop(rating: "imprecisa" | "ruim" = "ruim"): FeedbackItem {
  return {
    street: "preflop",
    heroAction: "Call",
    advice: "Fold",
    rating,
    text: "Você pagou quando o fold era melhor.",
    kind: "preflop",
    heroFam: "call",
    adviceFam: "fold",
  };
}

describe("Seu jogo — snapshot honesto de evolução", () => {
  it("não mostra precisão robusta com menos de 5 decisões", () => {
    const snap = buildYourGameSnapshot(
      summary({ decisions: 4, goodRateAll: 75, weekDecisions: 4, goodRateWeek: 75 }),
      [],
    );

    expect(snap.accuracy).toBeNull();
    expect(snap.accuracyBasis).toBeNull();
    expect(snap.trend).toBeNull();
  });

  it("prefere a precisão semanal quando a semana tem amostra mínima", () => {
    const snap = buildYourGameSnapshot(
      summary({ decisions: 40, goodRateAll: 68, weekDecisions: 8, goodRateWeek: 75, trend: 7 }),
      [],
    );

    expect(snap.accuracy).toBe(75);
    expect(snap.accuracyBasis).toBe("semana");
    expect(snap.trend).toBe(7);
  });

  it("usa precisão geral quando há amostra total, mas a semana ainda é curta", () => {
    const snap = buildYourGameSnapshot(
      summary({ decisions: 20, goodRateAll: 70, weekDecisions: 3, goodRateWeek: 100, trend: 0 }),
      [],
    );

    expect(snap.accuracy).toBe(70);
    expect(snap.accuracyBasis).toBe("geral");
    expect(snap.trend).toBeNull();
  });

  it("só chama de maior oportunidade um padrão que apareceu pelo menos duas vezes", () => {
    const one = buildYourGameSnapshot(summary({ decisions: 20 }), [loosePreflop()]);
    const two = buildYourGameSnapshot(summary({ decisions: 20 }), [loosePreflop(), loosePreflop("imprecisa")]);

    expect(one.opportunity).toBeNull();
    expect(two.opportunity?.id).toBe("loose_preflop");
    expect(two.opportunity?.count).toBe(2);
    expect(two.opportunity?.canDirectedTrain).toBe(true);
  });

  it("expõe a evolução real do treino quando ela existe", () => {
    const trend = {
      attempts: 2,
      first: 50,
      last: 75,
      best: 75,
      delta: 25,
      improved: true,
      history: [50, 75],
    };
    const snap = buildYourGameSnapshot(
      summary({ decisions: 20 }),
      [loosePreflop(), loosePreflop()],
      () => trend,
    );

    expect(snap.opportunity?.trainingTrend).toEqual(trend);
    expect(snap.opportunity?.trainingTrend?.delta).toBe(25);
  });
});

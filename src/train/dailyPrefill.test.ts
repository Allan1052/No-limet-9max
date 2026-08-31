import { describe, expect, it } from "vitest";
import { buildDailyScenario } from "./daily";
import { cardsToString, cardsFromString } from "../engine/cards";
import { analyzeHand, parseHand, type HandLabSpec } from "./stage";

// "Analisar a minha mão" leva a MÃO DO DIA pré-carregada pro HandLab. Este teste
// trava o contrato dos dados: o spot do dia mapeia pra um HandLabSpec válido, as
// cartas fazem round-trip (string→hand), e o motor analisa sem erro.

describe("Mão do dia pré-carregada no HandLab", () => {
  it("mapeia o cenário do dia num HandLabSpec analisável (com veredito e selo)", () => {
    const { scenario } = buildDailyScenario();
    const sp = scenario.spec;

    // Mesmo mapeamento que a HojeView grava no slot cof-sua-mao-spec.
    const cards = cardsToString(scenario.hand);
    const prefill = {
      heroPosition: sp.heroPosition,
      villainPosition: sp.raiserPosition ?? "BB",
      situation: sp.raiserPosition ? ("vsopen" as const) : ("open" as const),
      stage: "inicio" as const,
      stackBB: sp.effectiveBB,
      cards,
    };

    // As cartas do slot fazem round-trip (é como o HandLab remonta a mão).
    const hand = parseHand(prefill.cards);
    expect(hand).not.toBeNull();
    expect(prefill.cards.length).toBeGreaterThanOrEqual(4);

    const spec: HandLabSpec = {
      heroPosition: prefill.heroPosition,
      villainPosition: prefill.villainPosition,
      situation: prefill.situation,
      stage: prefill.stage,
      stackBB: prefill.stackBB,
      hand: hand!,
      anteBB: 1,
    };
    const a = analyzeHand(spec);
    expect(["fold", "call", "raise", "allin"]).toContain(a.recommended);
    expect(a.confidence).toBeTruthy();
    // O jogador vê a alternativa oposta ("por que não…") pra treinar os dois lados.
    expect(a.whyNot).not.toBeNull();
  });

  it("as cartas do dia batem com as cartas do cenário (sem trocar a mão)", () => {
    const { scenario } = buildDailyScenario();
    const roundTrip = cardsFromString(cardsToString(scenario.hand));
    expect(roundTrip).toEqual(scenario.hand);
  });
});

import { describe, expect, it } from "vitest";
import type { FeedbackItem } from "./analyzer";
import { feedbackHeroActionLabel } from "../ui/coachV2PostHand";

function item(over: Partial<FeedbackItem>): FeedbackItem {
  return {
    street: "Flop",
    heroAction: "Raise",
    advice: "Aposta",
    rating: "boa",
    text: "Linha correta.",
    kind: "postflop",
    ...over,
  };
}

describe("semântica da ação pós-flop", () => {
  it("mostra Aposta quando o raise técnico aconteceu sem aposta anterior", () => {
    expect(feedbackHeroActionLabel(item({}))).toBe("Aposta");
  });

  it("mantém Raise quando o spot realmente é de aumento", () => {
    expect(feedbackHeroActionLabel(item({ heroAction: "Raise", advice: "Raise" }))).toBe("Raise");
  });

  it("não altera outras ações", () => {
    expect(feedbackHeroActionLabel(item({ heroAction: "Call", advice: "Call" }))).toBe("Call");
    expect(feedbackHeroActionLabel(item({ heroAction: "Check", advice: "Check" }))).toBe("Check");
    expect(feedbackHeroActionLabel(item({ heroAction: "Fold", advice: "Fold" }))).toBe("Fold");
  });
});

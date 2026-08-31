import { describe, expect, it } from "vitest";
import { gradeDecision } from "./analyzer";

describe("semântica da ação pós-flop", () => {
  it("mostra Aposta quando o herói é o primeiro agressor da rua", () => {
    const item = gradeDecision("Flop", "free", "bet", {
      kind: "postflop",
      action: "bet",
      reason: "Aposta por valor.",
      equity: 0.92,
      potOdds: 0,
    });
    expect(item.heroAction).toBe("Aposta");
    expect(item.advice).toBe("Aposta");
  });

  it("continua mostrando Raise quando existe aposta anterior para aumentar", () => {
    const item = gradeDecision("River", "free", "raise", {
      kind: "postflop",
      action: "raise",
      reason: "Aumenta por valor.",
      equity: 0.92,
      potOdds: 0.25,
    });
    expect(item.heroAction).toBe("Raise");
    expect(item.advice).toBe("Raise");
  });
});

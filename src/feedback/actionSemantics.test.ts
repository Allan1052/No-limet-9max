import { describe, expect, it } from "vitest";
import { heroActionForFeedback } from "../app/gameController";

describe("semântica da ação pós-flop", () => {
  it("traduz raise técnico para bet quando não havia aposta para pagar", () => {
    expect(heroActionForFeedback("raise", "flop", 0)).toBe("bet");
    expect(heroActionForFeedback("raise", "river", 0)).toBe("bet");
  });

  it("mantém raise quando já existia aposta para pagar", () => {
    expect(heroActionForFeedback("raise", "flop", 120)).toBe("raise");
    expect(heroActionForFeedback("raise", "river", 2400)).toBe("raise");
  });

  it("não altera fold check call ou allin", () => {
    expect(heroActionForFeedback("fold", "flop", 0)).toBe("fold");
    expect(heroActionForFeedback("check", "turn", 0)).toBe("check");
    expect(heroActionForFeedback("call", "river", 10)).toBe("call");
    expect(heroActionForFeedback("allin", "river", 10)).toBe("allin");
  });
});

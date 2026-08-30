import { describe, expect, it } from "vitest";
import { rangePctFromActionLine } from "./villainRange";

describe("Motor V2 — propagação de ranges pós-flop", () => {
  it("sequências diferentes deixam ranges posteriores diferentes", () => {
    const passive = rangePctFromActionLine({
      preflopRaises: 1,
      street: "turn",
      actions: ["call", "check", "call"],
    });
    const barrel = rangePctFromActionLine({
      preflopRaises: 1,
      street: "turn",
      actions: ["call", "bet", "call", "bet"],
    });

    expect(barrel).toBeLessThan(passive);
  });

  it("3-bet pot começa mais estreito que single-raised pot na mesma linha", () => {
    const srp = rangePctFromActionLine({
      preflopRaises: 1,
      street: "flop",
      actions: ["call", "bet"],
    });
    const threeBetPot = rangePctFromActionLine({
      preflopRaises: 2,
      street: "flop",
      actions: ["call", "bet"],
    });

    expect(threeBetPot).toBeLessThan(srp);
  });

  it("é determinístico para a mesma sequência", () => {
    const line = {
      preflopRaises: 1,
      street: "river" as const,
      actions: ["call", "bet", "call", "bet", "call"],
    };
    expect(rangePctFromActionLine(line)).toBe(rangePctFromActionLine(line));
  });
});

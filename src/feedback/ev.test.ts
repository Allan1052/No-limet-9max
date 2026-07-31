import { describe, it, expect } from "vitest";
import { gradeDecision, type HeroAdvice } from "./analyzer";

const base: HeroAdvice = { kind: "postflop", action: "call", reason: "teste", equity: 0.6, potOdds: 0.4 };

describe("EV em bb no feedback", () => {
  it("call lucrativo mostra EV positivo e guarda evBB", () => {
    const item = gradeDecision("Flop", "free", "call", { ...base, evBB: 2.3 });
    expect(item.evBB).toBe(2.3);
    expect(item.text).toContain("+2.3bb");
    expect(item.text).toContain("💰");
  });

  it("fold que deixou fichas na mesa avisa o custo", () => {
    const item = gradeDecision("River", "free", "fold", { ...base, action: "call", evBB: 1.5 });
    expect(item.text).toContain("deixou fichas");
    expect(item.text).toContain("+1.5bb");
  });

  it("fold correto quando pagar seria negativo", () => {
    const item = gradeDecision("Turn", "free", "fold", { ...base, action: "fold", evBB: -0.8 });
    expect(item.text).toContain("fold certo");
    expect(item.text).toContain("-0.8bb");
  });

  it("sem evBB não adiciona nota de EV", () => {
    const item = gradeDecision("Flop", "free", "call", base);
    expect(item.evBB).toBeUndefined();
    expect(item.text).not.toContain("EV:");
  });
});

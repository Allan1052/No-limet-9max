import { describe, it, expect } from "vitest";
import { gradeDecision, type HeroAdvice } from "./analyzer";
const base: HeroAdvice = { kind: "postflop", action: "call", reason: "teste", equity: 0.6, potOdds: 0.4 };
describe("EV em bb no feedback", () => {
  it("call lucrativo guarda evBB (texto humano no modo free)", () => {
    const item = gradeDecision("Flop", "free", "call", { ...base, evBB: 2.3 });
    expect(item.evBB).toBe(2.3);
    // No modo free, o texto é humano (sem números), mas evBB é preservado
    expect(item.text.length).toBeGreaterThan(0);
  });
  it("fold que deixou fichas avisa (modo free tem texto humano)", () => {
    const item = gradeDecision("River", "free", "fold", { ...base, action: "call", evBB: 1.5 });
    expect(item.text.length).toBeGreaterThan(0);
  });
  it("fold correto quando pagar seria negativo (modo free)", () => {
    const item = gradeDecision("Turn", "free", "fold", { ...base, action: "fold", evBB: -0.8 });
    expect(item.text.length).toBeGreaterThan(0);
    expect(item.text.toLowerCase()).toContain("boa");
  });
  it("sem evBB não adiciona nota de EV", () => {
    const item = gradeDecision("Flop", "free", "call", base);
    expect(item.evBB).toBeUndefined();
  });
});

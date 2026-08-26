import { describe, it, expect } from "vitest";
import { spotRangeGrid } from "./spotGrid";
import { BASELINE_PROFILE } from "../bots/profiles";

describe("spotRangeGrid — abertura (RFI)", () => {
  it("UTG abre apertado: AA abre, 72o folda", () => {
    const g = spotRangeGrid({ heroPosition: "UTG", effectiveBB: 100, profile: BASELINE_PROFILE });
    expect(g["AA"].category).toBe("open");
    expect(g["72o"].category).toBe("fold");
    expect(g["KK"].category).toBe("open");
  });

  it("BTN abre bem mais largo que UTG", () => {
    const utg = spotRangeGrid({ heroPosition: "UTG", effectiveBB: 100, profile: BASELINE_PROFILE });
    const btn = spotRangeGrid({ heroPosition: "BTN", effectiveBB: 100, profile: BASELINE_PROFILE });
    const opens = (g: Record<string, { category: string }>) =>
      Object.values(g).filter((c) => c.category === "open").length;
    expect(opens(btn)).toBeGreaterThan(opens(utg));
  });

  it("tem 169 células e preserva o mix do motor quando disponível", () => {
    const g = spotRangeGrid({ heroPosition: "CO", effectiveBB: 100, profile: BASELINE_PROFILE });
    expect(Object.keys(g).length).toBe(169);
    const aaMix = g["AA"].mix;
    if (aaMix) {
      expect(aaMix.some((m) => m.cat === "open")).toBe(true);
      expect(aaMix.reduce((sum, m) => sum + m.freq, 0)).toBeCloseTo(1, 5);
    }
  });
});

describe("spotRangeGrid — defesa (enfrentando raise)", () => {
  it("BB vs abertura do CO: AA 3-beta, lixo folda", () => {
    const g = spotRangeGrid({
      heroPosition: "BB",
      effectiveBB: 100,
      profile: BASELINE_PROFILE,
      raiserPosition: "CO",
      openSizeBB: 2.3,
    });
    expect(g["AA"].category).toBe("3bet");
    expect(g["72o"].category).toBe("fold");
    // Deve existir alguma mão de call (defesa larga do BB).
    const calls = Object.values(g).filter((c) => c.category === "call").length;
    expect(calls).toBeGreaterThan(0);
  });

  it("categorias de defesa nunca usam 'open' (é spot de raise)", () => {
    const g = spotRangeGrid({
      heroPosition: "BTN",
      effectiveBB: 100,
      profile: BASELINE_PROFILE,
      raiserPosition: "UTG",
      openSizeBB: 2.3,
    });
    const cats = new Set(Object.values(g).map((c) => c.category));
    expect(cats.has("open")).toBe(false);
    expect(cats.has("limp")).toBe(false);
  });
});

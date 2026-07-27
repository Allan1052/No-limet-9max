import { describe, it, expect } from "vitest";
import { spotRangeGrid } from "./spotGrid";
import { BASELINE_PROFILE } from "../bots/profiles";

// O herói ABRIU e leva um 3-bet → grade de 4-bet / pagar / foldar.
describe("spotRangeGrid — enfrentando 3-bet (herói abriu)", () => {
  it("abriu CO e leva 3-bet do BTN (40bb): QQ+/AK são 4-bet, lixo folda", () => {
    const g = spotRangeGrid({
      heroPosition: "CO",
      effectiveBB: 40,
      profile: BASELINE_PROFILE,
      raiserPosition: "BTN",
      openSizeBB: 7,
      threeBet: true,
    });
    // Núcleo de valor: 4-bet garantido.
    expect(g["AA"].category).toBe("4bet");
    expect(g["KK"].category).toBe("4bet");
    expect(g["QQ"].category).toBe("4bet");
    expect(g["AKs"].category).toBe("4bet");
    expect(g["AKo"].category).toBe("4bet"); // <- o caso do Allan
    // Lixo folda.
    expect(g["72o"].category).toBe("fold");
    expect(g["J4s"].category).toBe("fold");
  });

  it("fora de posição (CO vs 3-bet do BTN) é 4-bet ou fold — quase sem call", () => {
    const g = spotRangeGrid({
      heroPosition: "CO",
      effectiveBB: 40,
      profile: BASELINE_PROFILE,
      raiserPosition: "BTN",
      openSizeBB: 7,
      threeBet: true,
    });
    const calls = Object.values(g).filter((c) => c.category === "call").length;
    expect(calls).toBe(0);
  });

  it("em posição (BTN abriu, BB deu 3-bet) pode PAGAR algumas mãos", () => {
    const g = spotRangeGrid({
      heroPosition: "BTN",
      effectiveBB: 60,
      profile: BASELINE_PROFILE,
      raiserPosition: "BB",
      openSizeBB: 9,
      threeBet: true,
    });
    expect(g["AA"].category).toBe("4bet");
    const calls = Object.values(g).filter((c) => c.category === "call").length;
    expect(calls).toBeGreaterThan(0);
  });

  it("stack raso: 4-bet vira all-in (jam) — AK ainda continua", () => {
    const g = spotRangeGrid({
      heroPosition: "CO",
      effectiveBB: 16,
      profile: BASELINE_PROFILE,
      raiserPosition: "BTN",
      openSizeBB: 6,
      threeBet: true,
    });
    // AK/QQ+ continuam (all-in), nunca foldam com stack curto.
    expect(g["AKo"].category).toBe("4bet");
    expect(g["AA"].category).toBe("4bet");
  });

  it("continua bem mais apertado que a range de defesa vs uma abertura", () => {
    const vsOpen = spotRangeGrid({
      heroPosition: "CO",
      effectiveBB: 40,
      profile: BASELINE_PROFILE,
      raiserPosition: "BTN",
      openSizeBB: 2.3,
    });
    const vs3bet = spotRangeGrid({
      heroPosition: "CO",
      effectiveBB: 40,
      profile: BASELINE_PROFILE,
      raiserPosition: "BTN",
      openSizeBB: 7,
      threeBet: true,
    });
    const cont = (g: Record<string, { category: string }>) =>
      Object.values(g).filter((c) => c.category !== "fold").length;
    expect(cont(vs3bet)).toBeLessThan(cont(vsOpen));
  });

  it("a grade nunca mistura 'open'/'limp'/'3bet' no modo vs-3bet", () => {
    const g = spotRangeGrid({
      heroPosition: "CO",
      effectiveBB: 40,
      profile: BASELINE_PROFILE,
      raiserPosition: "BTN",
      openSizeBB: 7,
      threeBet: true,
    });
    const cats = new Set(Object.values(g).map((c) => c.category));
    expect(cats.has("open")).toBe(false);
    expect(cats.has("limp")).toBe(false);
    expect(cats.has("3bet")).toBe(false);
  });
});

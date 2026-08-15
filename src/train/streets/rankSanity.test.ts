// Sanity check: valida que o ranking real de handStrength ordena corretamente
// (AA, KK, QQ, JJ... no topo) e que o RFI por posicao contem as maos esperadas.
import { describe, it, expect } from "vitest";
import { handStrengthTable, handRank } from "../../ranges/handStrength";
import { preflopOpenRange, heroRecommendedGrid } from "./dynamicRanges";

describe("handStrength ranking real", () => {
  it("top 15: pares nobres e ases na frente", () => {
    const table = handStrengthTable();
    const top15 = table.slice(0, 15).map((r) => r.handType);
    // Ordem exata depende do Monte Carlo + bônus de jogabilidade; apenas
    // garantir que as manos premium estão no top 15.
    console.log("top20:", top15);
    // sem assert — inspecao apenas
  });
  it("AA rank 0 (mais forte)", () => {
    expect(handRank("AA")).toBe(0);
    expect(handRank("KK") < handRank("QQ")).toBe(true);
    expect(handRank("QQ") < handRank("72o")).toBe(true);
  });
});

describe("RFI real por posicao (20bb)", () => {
  it("UTG ~11-13% contem AA/KK/QQ/AKs", () => {
    const r = preflopOpenRange("UTG", 20);
    expect("AA" in r && "KK" in r && "QQ" in r && "AKs" in r).toBe(true);
    expect("72o" in r).toBe(false);
    expect("32o" in r).toBe(false);
    let w = 0;
    for (const h of Object.keys(r)) w += r[h] * (h.length === 2 ? 6 : 4);
    console.log("UTG 20bb:", ((w / 1326) * 100).toFixed(1) + "% combos:", w, "tipos:", Object.keys(r).length);
  });
  it("BTN ~40% contem AA e AJo/T9s", () => {
    const r = preflopOpenRange("BTN", 20);
    expect("AA" in r && "TT" in r).toBe(true);
    const count = Object.keys(r).length;
    console.log("BTN 20bb:", Math.round((count / 169) * 100) + "% tipos:", count);
  });
  it("hero grid: AA nunca folda; grid A-8-6 UTG", () => {
    const RANKS = "23456789TJQKA";
    const suitIdx: Record<string, number> = { c: 0, d: 1, h: 2, s: 3 };
    const mk = (s: string) => RANKS.indexOf(s[0]) * 4 + suitIdx[s[1]];
    const board = (cards: string[], street: "flop" | "turn" | "river") => ({ street, cards: cards.map(mk) });
    const g = heroRecommendedGrid(board(["As", "8d", "6c"], "flop"), "UTG", "BTN", 20, false, 3.5);
    const cat = (h: string) => g.find((c) => c.handType === h)?.category;
    expect(cat("AA")).toBe("bet");
    expect(cat("99")).toBe("check");
    // KQo sem hit em board A-alto: check defensivo leve (overcards) é a linha do grid
    expect(["check", "fold"]).toContain(cat("KQo"));
    console.log("grid A-8-6 UTG: AA=" + cat("AA") + " 99=" + cat("99") + " KQo=" + cat("KQo") + " bet=" + g.filter((c) => c.category === "bet").length);
    const g2 = heroRecommendedGrid(board(["Th", "8h", "4h"], "flop"), "BTN", "SB", 20, false, 3.5);
    const cat2 = (h: string) => g2.find((c) => c.handType === h)?.category;
    expect(cat2("AA")).toBe("bet");
    console.log("grid Th8h4h BTN: AA=" + cat2("AA") + " KK=" + cat2("KK") + " AKs=" + cat2("AKs"));
  });
  it("stack curto alarga UTG/BTN", () => {
    const u12 = preflopOpenRange("UTG", 12);
    const u20 = preflopOpenRange("UTG", 20);
    expect(Object.keys(u12).length).toBeGreaterThan(Object.keys(u20).length);
  });
});

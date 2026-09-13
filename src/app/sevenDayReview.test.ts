import { describe, expect, it } from "vitest";
import { buildSevenDayReview } from "./sevenDayReview";
import type { HandHistoryEntry } from "./handHistoryLog";

function entry(daysAgo: number, rating: "boa" | "ok" | "imprecisa" | "ruim", street = "Pré-Flop"): HandHistoryEntry {
  const now = new Date("2026-08-29T12:00:00Z").getTime();
  return {
    timestamp: now - daysAgo * 86400000,
    buyIn: 11,
    mode: "livre",
    entrants: 100,
    item: { street, rating, heroAction: "Call", advice: "Fold", heroFam: "call", adviceFam: "fold", text: "" } as any,
  };
}

describe("Seu jogo em 7 dias", () => {
  it("considera somente os últimos sete dias e encontra padrão recorrente", () => {
    const now = new Date("2026-08-29T12:00:00Z").getTime();
    const r = buildSevenDayReview([entry(0, "ruim"), entry(2, "imprecisa"), entry(3, "ok"), entry(9, "ruim")], now);
    expect(r.total).toBe(3);
    expect(r.attention).toBe(2);
    expect(r.recommendation?.mode).toBe("preflop");
  });

  it("não afirma evolução sem amostra suficiente no período anterior", () => {
    const now = new Date("2026-08-29T12:00:00Z").getTime();
    const r = buildSevenDayReview([entry(0, "ok"), entry(1, "ruim")], now);
    expect(r.trend).toBeNull();
  });
});

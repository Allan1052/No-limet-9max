import { describe, it, expect } from "vitest";
import {
  emptyProgress,
  recordDecision,
  recordHand,
  summarize,
  isoWeekKey,
} from "./progress";

describe("placar de evolução", () => {
  it("chave de semana ISO é estável e no formato certo", () => {
    const k = isoWeekKey(new Date("2026-07-24T12:00:00Z"));
    expect(k).toMatch(/^\d{4}-W\d{2}$/);
    // Mesma semana → mesma chave.
    expect(isoWeekKey(new Date("2026-07-20T00:00:00Z"))).toBe(
      isoWeekKey(new Date("2026-07-24T23:00:00Z")),
    );
  });

  it("acumula notas e calcula a taxa de boas decisões", () => {
    const s = emptyProgress();
    const now = new Date("2026-07-24T12:00:00Z");
    recordDecision(s, "boa", now);
    recordDecision(s, "ok", now);
    recordDecision(s, "ruim", now);
    recordDecision(s, "imprecisa", now);
    const sum = summarize(s, now);
    expect(sum.decisions).toBe(4);
    expect(sum.goodRateAll).toBe(50); // 2 boas/ok de 4
    expect(sum.counts.boa).toBe(1);
  });

  it("conta mãos jogadas separado das decisões", () => {
    const s = emptyProgress();
    recordHand(s);
    recordHand(s);
    expect(summarize(s).hands).toBe(2);
    expect(summarize(s).decisions).toBe(0);
  });

  it("tendência compara a semana com o geral quando há amostra", () => {
    const s = emptyProgress();
    const wkA = new Date("2026-07-01T12:00:00Z"); // semana antiga
    const wkB = new Date("2026-07-24T12:00:00Z"); // semana atual
    // Semana antiga: metade boas.
    for (let i = 0; i < 5; i++) recordDecision(s, i < 2 ? "boa" : "ruim", wkA);
    // Semana atual: quase todas boas → tendência positiva.
    for (let i = 0; i < 6; i++) recordDecision(s, i < 5 ? "boa" : "ruim", wkB);
    const sum = summarize(s, wkB);
    expect(sum.weekDecisions).toBe(6);
    expect(sum.trend).toBeGreaterThan(0);
  });
});

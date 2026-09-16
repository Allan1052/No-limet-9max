// ---------------------------------------------------------------------------
// FOLDAR NÃO É PERDER.
// 🐞 15/09/2026 — Allan: "no histórico de mãos até as mãos que foldo, mostra
// que perdi".
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import { saldoDaMao, rotuloDoSaldo } from "./saldoDaMao";
import type { HandHistory } from "./replay";

const mao = (o: Partial<HandHistory> & { eventos?: Array<{ committed: number }> }): HandHistory =>
  ({
    heroSeat: 0,
    bigBlind: 50,
    names: {},
    holeCards: {},
    finalBoard: [],
    buttonSeat: 1,
    events: (o.eventos ?? []).map((e) => ({
      street: "preflop",
      seat: 0,
      name: "Você",
      isHero: true,
      actionLabel: "",
      actionType: "fold",
      board: [],
      seats: [{ stack: 0, committed: 0, totalCommitted: e.committed, status: "active" }],
    })),
    ...o,
  }) as unknown as HandHistory;

describe("saldo da mão", () => {
  it("fold pré-flop sem pôr ficha: NÃO é derrota", () => {
    const h = mao({ eventos: [{ committed: 0 }], result: { winningsBySeat: {}, pots: [], showdown: false } });
    const s = saldoDaMao(h);
    expect(s.bb).toBe(0);
    expect(s.investiu).toBe(false);
    expect(rotuloDoSaldo(h)).toEqual({ texto: "não disputou", ganhou: false });
  });

  it("fold no big blind: perdeu 1bb, e a tela diz isso em bb", () => {
    const h = mao({ eventos: [{ committed: 50 }], result: { winningsBySeat: {}, pots: [], showdown: false } });
    expect(saldoDaMao(h).bb).toBe(-1);
    expect(rotuloDoSaldo(h)).toEqual({ texto: "−1bb", ganhou: false });
  });

  it("ganhou de verdade: o saldo desconta o que ele pôs", () => {
    // Pôs 200 (4bb) e levou 500 (10bb) → saldo +6bb, não +10bb.
    const h = mao({
      eventos: [{ committed: 200 }],
      result: { winningsBySeat: { 0: 500 }, pots: [], showdown: true },
    });
    expect(saldoDaMao(h).bb).toBe(6);
    expect(rotuloDoSaldo(h)).toEqual({ texto: "+6bb", ganhou: true });
  });

  it("⚠️ pagou 10 e levou 10 é EMPATE, não vitória", () => {
    const h = mao({
      eventos: [{ committed: 500 }],
      result: { winningsBySeat: { 0: 500 }, pots: [], showdown: true },
    });
    expect(saldoDaMao(h).neutro).toBe(true);
    // Investiu e empatou: nada a escrever — a tela não inventa resultado.
    expect(rotuloDoSaldo(h)).toBeNull();
  });

  it("perdeu um pote grande", () => {
    const h = mao({
      eventos: [{ committed: 1500 }],
      result: { winningsBySeat: { 1: 3000 }, pots: [], showdown: true },
    });
    expect(saldoDaMao(h).bb).toBe(-30);
    expect(rotuloDoSaldo(h)?.texto).toBe("−30bb");
  });

  it("mão sem snapshot de assentos não inventa derrota", () => {
    const h = mao({ eventos: [], result: { winningsBySeat: {}, pots: [], showdown: false } });
    expect(rotuloDoSaldo(h)).toEqual({ texto: "não disputou", ganhou: false });
  });
});

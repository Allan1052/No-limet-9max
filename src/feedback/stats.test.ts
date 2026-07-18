import { describe, it, expect } from "vitest";
import {
  emptyStats,
  beginHand,
  recordPreflopAction,
  toRow,
  type PlayerStats,
} from "./stats";

/** Simula uma mão para um jogador: começa a mão e aplica ações em sequência. */
function playPreflop(stats: PlayerStats, actions: Array<[string, boolean]>): void {
  const flags = beginHand(stats);
  for (const [type, facingRaise] of actions) {
    recordPreflopAction(stats, flags, type, facingRaise);
  }
}

describe("stats — VPIP", () => {
  it("call ou raise contam VPIP; check e fold não", () => {
    const s = emptyStats();
    playPreflop(s, [["call", false]]); // limp = VPIP
    playPreflop(s, [["fold", false]]); // fold ≠ VPIP
    playPreflop(s, [["check", false]]); // BB check ≠ VPIP
    playPreflop(s, [["raise", false]]); // raise = VPIP
    expect(s.handsDealt).toBe(4);
    expect(s.vpip).toBe(2);
    expect(toRow(0, "X", false, s).vpip).toBe(50);
  });

  it("agir duas vezes na mesma mão conta VPIP uma vez só", () => {
    const s = emptyStats();
    playPreflop(s, [["call", false], ["call", true]]); // limpa e depois paga um raise
    expect(s.vpip).toBe(1);
  });
});

describe("stats — PFR", () => {
  it("só raise conta PFR, uma vez por mão", () => {
    const s = emptyStats();
    playPreflop(s, [["raise", false], ["raise", true]]); // abre e depois 4-beta
    playPreflop(s, [["call", false]]);
    expect(s.pfr).toBe(1);
    expect(s.handsDealt).toBe(2);
    expect(toRow(0, "X", false, s).pfr).toBe(50);
  });
});

describe("stats — 3-bet", () => {
  it("3-bet conta quando enfrenta abertura sem ter aumentado antes", () => {
    const s = emptyStats();
    playPreflop(s, [["raise", true]]); // enfrentou open e re-aumentou = 3-bet
    expect(s.threeBet).toBe(1);
    expect(s.threeBetOpp).toBe(1);
    expect(toRow(0, "X", false, s).threeBet).toBe(100);
  });

  it("cold-call de uma abertura é oportunidade de 3-bet não usada", () => {
    const s = emptyStats();
    playPreflop(s, [["call", true]]);
    expect(s.threeBetOpp).toBe(1);
    expect(s.threeBet).toBe(0);
    expect(toRow(0, "X", false, s).threeBet).toBe(0);
  });

  it("abrir e depois enfrentar um 3-bet NÃO conta como oportunidade de 3-bet", () => {
    const s = emptyStats();
    // Abre (não facingRaise), depois enfrenta um 3-bet e 4-beta (facingRaise).
    playPreflop(s, [["raise", false], ["raise", true]]);
    expect(s.threeBetOpp).toBe(0); // é spot de 4-bet, não de 3-bet
    expect(s.threeBet).toBe(0);
  });

  it("fold vs abertura é oportunidade sem 3-bet", () => {
    const s = emptyStats();
    playPreflop(s, [["fold", true]]);
    expect(s.threeBetOpp).toBe(1);
    expect(s.threeBet).toBe(0);
  });
});

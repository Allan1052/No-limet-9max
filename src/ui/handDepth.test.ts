// Teste do helper de profundidade de stack (UI layer).
import { describe, expect, it } from "vitest";
import type { Card } from "../engine/cards";
import type { HandHistory } from "../app/replay";
import { heroBBBefore } from "./handDepth";

function mkHand(opts: {
  startingBB: number;
  bigBlind: number;
  events: { seat: number; isHero: boolean; actionType: string; actionLabel: string; pot: number }[];
  winnings?: number;
}): HandHistory {
  const bb = opts.bigBlind;
  return {
    events: opts.events.map((e) => ({
      street: "Pré-flop",
      seat: e.seat,
      name: e.isHero ? "Você" : "Vilão",
      isHero: e.isHero,
      actionLabel: e.actionLabel,
      actionType: e.actionType,
      board: [] as Card[],
      pot: e.pot,
    })),
    holeCards: { 0: [] },
    names: { 0: "Você", 1: "Vilão" },
    heroSeat: 0,
    finalBoard: [] as Card[],
    buttonSeat: 1,
    bigBlind: bb,
    startingStacks: { 0: opts.startingBB * bb, 1: opts.startingBB * bb },
    result: opts.winnings !== undefined ? { winningsBySeat: { 0: opts.winnings, 1: -opts.winnings }, pots: [] } : undefined,
  } as unknown as HandHistory;
}

describe("handDepth — heroBBBefore", () => {
  it("100bb de partida, call de 4bb no preflop → ~96bb", () => {
    const h = mkHand({
      startingBB: 100,
      bigBlind: 50,
      events: [{ seat: 0, isHero: true, actionType: "call", actionLabel: "Call 4bb", pot: 150 }],
    });
    const bb = heroBBBefore(h, 1);
    expect(bb).toBeCloseTo(96, 0);
  });

  it("raise de 11.5bb seguido de call 11.5bb → 77bb", () => {
    const h = mkHand({
      startingBB: 100,
      bigBlind: 50,
      events: [
        { seat: 0, isHero: true, actionType: "raise", actionLabel: "Raise 11.5bb", pot: 200 },
        { seat: 1, isHero: false, actionType: "call", actionLabel: "Call 11.5bb", pot: 400 },
        { seat: 0, isHero: true, actionType: "call", actionLabel: "Call 11.5bb", pot: 400 },
      ],
    });
    const bb = heroBBBefore(h, 3);
    expect(bb).toBeCloseTo(77, 0);
  });

  it("all-in sem valor no rótulo usa o pote como teto", () => {
    const h = mkHand({
      startingBB: 25,
      bigBlind: 50,
      events: [{ seat: 0, isHero: true, actionType: "allin", actionLabel: "All-in", pot: 1250 }],
    });
    const bb = heroBBBefore(h, 1);
    // 25bb de partida, pote 1250 = 25bb → ~0bb restantes
    expect(bb).not.toBeNull();
    expect(bb).toBeLessThanOrEqual(0.5);
  });

  it("aplica winnings do showdown após o fim da mão", () => {
    const h = mkHand({
      startingBB: 100,
      bigBlind: 50,
      events: [
        { seat: 0, isHero: true, actionType: "raise", actionLabel: "Raise 11.5bb", pot: 200 },
        { seat: 1, isHero: false, actionType: "call", actionLabel: "Call 11.5bb", pot: 400 },
      ],
      winnings: 1150, // ganhou o pote de 23bb (o hero investiu só 11.5bb)
    });
    const bb = heroBBBefore(h, 3); // após todos os eventos: 100 - 11.5 + 23 = 111.5bb
    expect(bb).toBeCloseTo(111.5, 0);
  });

  it("sem startingStacks retorna null", () => {
    const h = mkHand({ startingBB: 0, bigBlind: 50, events: [] });
    expect(heroBBBefore(h, 0)).toBeNull();
  });
});

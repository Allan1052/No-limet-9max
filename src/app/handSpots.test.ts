import { describe, it, expect } from "vitest";
import { handSpots } from "./handSpots";
import type { HandHistory } from "./replay";
import { cardsFromString } from "../engine/cards";

// Mão sintética: 6 jogadores, botão no assento 5.
// Assentos 0..5; botão=5 → SB=0, BB=1, e meio=2,3,4 (LJ,HJ,CO).
// CO (assento 4) abre 2.3bb, BB (assento 1) defende.
function makeHand(): HandHistory {
  const ev = (seat: number, actionType: string, actionLabel: string) => ({
    street: "Pré-flop",
    seat,
    name: `P${seat}`,
    isHero: seat === 1,
    actionLabel,
    actionType,
    board: [],
    pot: 0,
  });
  return {
    events: [
      ev(2, "fold", "Fold"),
      ev(3, "fold", "Fold"),
      ev(4, "raise", "Raise 2.3bb"), // CO abre
      ev(5, "fold", "Fold"),
      ev(0, "fold", "Fold"),
      ev(1, "call", "Call 1.3bb"), // BB defende
    ],
    holeCards: {
      0: cardsFromString("7d2c"),
      1: cardsFromString("AhKd"),
      2: cardsFromString("9s4h"),
      3: cardsFromString("Jc8c"),
      4: cardsFromString("AsQs"),
      5: cardsFromString("Kh3d"),
    },
    names: { 0: "P0", 1: "Hero", 2: "P2", 3: "P3", 4: "P4", 5: "P5" },
    heroSeat: 1,
    finalBoard: [],
    buttonSeat: 5,
    bigBlind: 100,
    startingStacks: { 0: 10000, 1: 10000, 2: 10000, 3: 10000, 4: 10000, 5: 10000 },
  };
}

describe("handSpots", () => {
  const spots = handSpots(makeHand());

  it("atribui as posições certas", () => {
    const bySeat = Object.fromEntries(spots.map((s) => [s.seat, s.position]));
    expect(bySeat[5]).toBe("BTN");
    expect(bySeat[0]).toBe("SB");
    expect(bySeat[1]).toBe("BB");
    expect(bySeat[4]).toBe("CO");
  });

  it("o CO é o abridor (sem raiser antes)", () => {
    const co = spots.find((s) => s.seat === 4)!;
    expect(co.raiserPosition).toBeUndefined();
    expect(co.actionType).toBe("raise");
    expect(co.handType).toBe("AQs");
  });

  it("o BB defende contra a abertura do CO", () => {
    const bb = spots.find((s) => s.seat === 1)!;
    expect(bb.raiserPosition).toBe("CO");
    expect(bb.openSizeBB).toBeCloseTo(2.3, 1);
    expect(bb.handType).toBe("AKo");
    expect(bb.effectiveBB).toBe(100);
  });
});

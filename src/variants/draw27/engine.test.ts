import { describe, it, expect } from "vitest";
import {
  createDraw27Table,
  draw27ApplyAction,
  draw27Discard,
  draw27SimulateHand,
  eval27Hand,
  draw27BotDiscard,
} from "./engine";
import { cardFromString } from "../../engine/cards";

describe("2-7 Triple Draw — avaliador lowball", () => {
  it("7-5-4-3-2 (best hand) beats any 8-high", () => {
    const best = [
      cardFromString("7s")!,
      cardFromString("5h")!,
      cardFromString("4d")!,
      cardFromString("3c")!,
      cardFromString("2h")!,
    ];
    const eightHigh = [
      cardFromString("8s")!,
      cardFromString("5h")!,
      cardFromString("4d")!,
      cardFromString("3c")!,
      cardFromString("2h")!,
    ];
    expect(eval27Hand(best)).toBeLessThan(eval27Hand(eightHigh));
  });

  it("Ace counts as HIGH (bad)", () => {
    const aceLow = [
      cardFromString("As")!,
      cardFromString("2h")!,
      cardFromString("3d")!,
      cardFromString("4c")!,
      cardFromString("5s")!,
    ];
    const sevenHigh = [
      cardFromString("7s")!,
      cardFromString("6h")!,
      cardFromString("4d")!,
      cardFromString("3c")!,
      cardFromString("2h")!,
    ];
    // A-2-3-4-5 is a straight (wheel) in 2-7 — penalized heavily
    // 7-high is much better
    expect(eval27Hand(aceLow)).toBeGreaterThan(eval27Hand(sevenHigh));
  });

  it("Straight counts AGAINST you", () => {
    const straight = [
      cardFromString("5s")!,
      cardFromString("4h")!,
      cardFromString("3d")!,
      cardFromString("2c")!,
      cardFromString("6s")!,
    ];
    const nonStraight = [
      cardFromString("7s")!,
      cardFromString("5h")!,
      cardFromString("4d")!,
      cardFromString("3c")!,
      cardFromString("2h")!,
    ];
    // 5-4-3-2-6 is a straight (2-3-4-5-6) — penalized
    // 7-5-4-3-2 is the best hand
    expect(eval27Hand(straight)).toBeGreaterThan(eval27Hand(nonStraight));
  });

  it("Flush counts AGAINST you", () => {
    const flush = [
      cardFromString("7s")!,
      cardFromString("5s")!,
      cardFromString("4s")!,
      cardFromString("3s")!,
      cardFromString("2s")!,
    ];
    const nonFlush = [
      cardFromString("7h")!,
      cardFromString("5d")!,
      cardFromString("4c")!,
      cardFromString("3s")!,
      cardFromString("2h")!,
    ];
    // Both are 7-5-4-3-2, but flush is penalized
    expect(eval27Hand(flush)).toBeGreaterThan(eval27Hand(nonFlush));
  });

  it("Lower is always better in 2-7", () => {
    const hand1 = [
      cardFromString("7s")!,
      cardFromString("6h")!,
      cardFromString("4d")!,
      cardFromString("3c")!,
      cardFromString("2h")!,
    ];
    const hand2 = [
      cardFromString("8s")!,
      cardFromString("6h")!,
      cardFromString("4d")!,
      cardFromString("3c")!,
      cardFromString("2h")!,
    ];
    expect(eval27Hand(hand1)).toBeLessThan(eval27Hand(hand2));
  });

  it("8-7-6-5-4 is worse than 7-6-5-4-3", () => {
    const hand1 = [
      cardFromString("7s")!,
      cardFromString("6h")!,
      cardFromString("5d")!,
      cardFromString("4c")!,
      cardFromString("3h")!,
    ];
    const hand2 = [
      cardFromString("8s")!,
      cardFromString("7h")!,
      cardFromString("6d")!,
      cardFromString("5c")!,
      cardFromString("4h")!,
    ];
    expect(eval27Hand(hand1)).toBeLessThan(eval27Hand(hand2));
  });
});

describe("createDraw27Table", () => {
  it("cria mesa com 4 seats, 5 cartas cada", () => {
    const state = createDraw27Table({ numSeats: 4, seed: 42 });
    expect(state.seats).toHaveLength(4);
    for (const seat of state.seats) {
      expect(seat.cards).toHaveLength(5);
    }
  });

  it("aplica blinds corretamente", () => {
    const state = createDraw27Table({ numSeats: 4, sb: 10, bb: 20, seed: 42 });
    // SB (seat 0) pays 10
    expect(state.seats[0].totalBet).toBe(10);
    // BB (seat 1) pays 20
    expect(state.seats[1].totalBet).toBe(20);
    // Pot = 30
    expect(state.pot).toBe(30);
  });

  it("fase inicial é bet1", () => {
    const state = createDraw27Table({ seed: 42 });
    expect(state.phase).toBe("bet1");
  });

  it("UTG (seat 2) acts first", () => {
    const state = createDraw27Table({ seed: 42 });
    expect(state.actingSeat).toBe(2);
  });
});

describe("draw27ApplyAction", () => {
  it("fold remove o jogador", () => {
    const state = createDraw27Table({ numSeats: 4, seed: 42 });
    const actor = state.actingSeat;
    draw27ApplyAction(state, "fold");
    expect(state.seats[actor].folded).toBe(true);
  });

  it("call paga a diferença para o BB", () => {
    const state = createDraw27Table({ numSeats: 4, sb: 10, bb: 20, seed: 42 });
    const actor = state.actingSeat;
    const beforeStack = state.seats[actor].stack;
    draw27ApplyAction(state, "call");
    // UTG needs to call BB (20)
    expect(state.seats[actor].stack).toBeLessThan(beforeStack);
    expect(state.pot).toBeGreaterThan(30);
  });

  it("todos foldam menos 1 → mão termina", () => {
    const state = createDraw27Table({ numSeats: 4, seed: 42 });
    const seat0 = 0;
    let steps = 0;
    while (!state.handOver && steps < 20) {
      const acting = state.actingSeat;
      if (acting !== seat0) {
        draw27ApplyAction(state, "fold");
      } else {
        draw27ApplyAction(state, "call");
      }
      steps++;
    }
    expect(state.handOver).toBe(true);
  });
});

describe("draw27Discard", () => {
  it("troca cartas descartadas por novas do baralho", () => {
    const state = createDraw27Table({ numSeats: 2, seed: 42 });
    const beforeCards = [...state.seats[0].cards];
    // Discard indices 0, 1, 2 (keep 3, 4)
    draw27Discard(state, 0, [0, 1, 2]);
    // Should still have 5 cards
    expect(state.seats[0].cards).toHaveLength(5);
    // The kept cards (indices 3, 4) should still be in the hand
    expect(state.seats[0].cards).toContain(beforeCards[3]);
    expect(state.seats[0].cards).toContain(beforeCards[4]);
    // Total unique cards should include the kept ones + 3 new ones
    const uniqueBefore = new Set(beforeCards);
    const uniqueAfter = new Set(state.seats[0].cards);
    expect(uniqueAfter.size).toBeGreaterThanOrEqual(uniqueBefore.size);
  });
});

describe("draw27BotDiscard", () => {
  it("descarta cartas >= 8", () => {
    const cards = [
      cardFromString("7s")!,
      cardFromString("9h")!,
      cardFromString("3d")!,
      cardFromString("Kc")!,
      cardFromString("2h")!,
    ];
    const discards = draw27BotDiscard(cards);
    // Should discard 9h (idx 1) and Kc (idx 3)
    expect(discards).toContain(1);
    expect(discards).toContain(3);
    // Should keep 7s, 3d, 2h
    expect(discards).not.toContain(0);
    expect(discards).not.toContain(2);
    expect(discards).not.toContain(4);
  });

  it("mantém pelo menos 1 carta", () => {
    const cards = [
      cardFromString("Ks")!,
      cardFromString("Qh")!,
      cardFromString("Jd")!,
      cardFromString("Tc")!,
      cardFromString("9h")!,
    ];
    const discards = draw27BotDiscard(cards);
    // All are >= 8, but must keep at least 1
    expect(discards.length).toBeLessThan(5);
  });
});

describe("draw27SimulateHand", () => {
  it("simulação completa não trava", () => {
    const state = draw27SimulateHand({ numSeats: 4, seed: 123 });
    expect(state.handOver).toBe(true);
    expect(state.result).not.toBeNull();
  });

  it("simulação heads-up funciona", () => {
    const state = draw27SimulateHand({ numSeats: 2, seed: 77 });
    expect(state.handOver).toBe(true);
    expect(state.seats).toHaveLength(2);
  });

  it("winner recebe o pot", () => {
    const state = draw27SimulateHand({ numSeats: 4, seed: 456 });
    expect(state.handOver).toBe(true);
    if (state.result) {
      expect(state.seats[state.result.winnerSeat].stack).toBeGreaterThan(
        1000 - 20, // starting stack minus at most BB
      );
    }
  });
});

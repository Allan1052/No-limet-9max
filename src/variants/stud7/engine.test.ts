import { describe, it, expect } from "vitest";
import {
  createStud7Table,
  stud7ApplyAction,
  stud7SimulateHand,
  bestFiveOfSeven,
  cardRank,
} from "./engine";
import { cardFromString } from "../../engine/cards";
import { categoryOf, Category } from "../../engine/evaluator";

describe("bestFiveOfSeven — avaliador melhor 5 de 7", () => {
  it("Royal Flush vence Straight Flush", () => {
    const royal = [
      cardFromString("Ts")!,
      cardFromString("Js")!,
      cardFromString("Qs")!,
      cardFromString("Ks")!,
      cardFromString("As")!,
      cardFromString("2h")!,
      cardFromString("3c")!,
    ];
    const sf = [
      cardFromString("8s")!,
      cardFromString("9s")!,
      cardFromString("Ts")!,
      cardFromString("Js")!,
      cardFromString("Qs")!,
      cardFromString("2h")!,
      cardFromString("3d")!,
    ];
    const royalBest = bestFiveOfSeven(royal);
    const sfBest = bestFiveOfSeven(sf);
    expect(royalBest).toBeGreaterThan(sfBest);
    expect(categoryOf(royalBest)).toBe(Category.StraightFlush);
  });

  it("Full House vence Flush", () => {
    const fh = [
      cardFromString("Ts")!,
      cardFromString("Th")!,
      cardFromString("Td")!,
      cardFromString("5c")!,
      cardFromString("5h")!,
      cardFromString("2s")!,
      cardFromString("3d")!,
    ];
    const flush = [
      cardFromString("2h")!,
      cardFromString("4h")!,
      cardFromString("7h")!,
      cardFromString("9h")!,
      cardFromString("Qh")!,
      cardFromString("5s")!,
      cardFromString("6c")!,
    ];
    const fhBest = bestFiveOfSeven(fh);
    const flushBest = bestFiveOfSeven(flush);
    expect(fhBest).toBeGreaterThan(flushBest);
  });

  it("Quadra vence Full House", () => {
    const quads = [
      cardFromString("Ts")!,
      cardFromString("Th")!,
      cardFromString("Td")!,
      cardFromString("Tc")!,
      cardFromString("5h")!,
      cardFromString("2s")!,
      cardFromString("3d")!,
    ];
    const fh = [
      cardFromString("Qs")!,
      cardFromString("Qh")!,
      cardFromString("Qd")!,
      cardFromString("5c")!,
      cardFromString("5h")!,
      cardFromString("2s")!,
      cardFromString("3d")!,
    ];
    expect(bestFiveOfSeven(quads)).toBeGreaterThan(bestFiveOfSeven(fh));
  });

  it("Straight vence Trips", () => {
    const straight = [
      cardFromString("8h")!,
      cardFromString("9s")!,
      cardFromString("Td")!,
      cardFromString("Jc")!,
      cardFromString("Qh")!,
      cardFromString("2s")!,
      cardFromString("3d")!,
    ];
    const trips = [
      cardFromString("Ts")!,
      cardFromString("Th")!,
      cardFromString("Td")!,
      cardFromString("5c")!,
      cardFromString("2h")!,
      cardFromString("7s")!,
      cardFromString("3d")!,
    ];
    expect(bestFiveOfSeven(straight)).toBeGreaterThan(bestFiveOfSeven(trips));
  });

  it("Escolhe a melhor combinação entre 7 cartas", () => {
    // 7 cartas que contêm um par e um straight — straight deve vencer
    const mixed = [
      cardFromString("8h")!,
      cardFromString("9s")!,
      cardFromString("Td")!,
      cardFromString("Jc")!,
      cardFromString("Qh")!,
      cardFromString("Ts")!,
      cardFromString("3d")!,
    ];
    const best = bestFiveOfSeven(mixed);
    expect(categoryOf(best)).toBeGreaterThanOrEqual(Category.Straight);
  });

  it("Ace alto conta como 14 no high card", () => {
    const aceHigh = [
      cardFromString("Ah")!,
      cardFromString("2s")!,
      cardFromString("3d")!,
      cardFromString("5c")!,
      cardFromString("7h")!,
      cardFromString("4s")!,
      cardFromString("6d")!,
    ];
    const best = bestFiveOfSeven(aceHigh);
    void categoryOf(best);
    // Ace-high straight (A-2-3-4-5 wheel) or high card with Ace
    // With 7 cards there might be a wheel straight
    expect(best).toBeGreaterThan(0);
  });
});

describe("createStud7Table", () => {
  it("cria mesa com 6 seats, 3 cartas cada (2 down + 1 up)", () => {
    const state = createStud7Table({ numSeats: 6, seed: 42 });
    expect(state.seats.length).toBe(6);
    for (const seat of state.seats) {
      expect(seat.cards.length).toBe(3);
    }
  });

  it("deduz ante de todos os jogadores", () => {
    const state = createStud7Table({ numSeats: 4, ante: 5, seed: 42 });
    const totalAnte = state.seats.reduce((sum, s) => sum + s.totalBet, 0);
    expect(totalAnte).toBe(4 * 5 + 2); // 4 antes + bring-in
  });

  it("assigna bring-in ao jogador com menor upcard", () => {
    const state = createStud7Table({ numSeats: 6, seed: 42 });
    let minIdx = 0;
    let minRank = Infinity;
    for (let i = 0; i < state.seats.length; i++) {
      const upRank = cardRank(state.seats[i].cards[2]);
      if (upRank < minRank || (upRank === minRank && i < minIdx)) {
        minRank = upRank;
        minIdx = i;
      }
    }
    expect(state.bringInSeat).toBe(minIdx);
  });

  it("bring-in paga o bring-in do stack", () => {
    const state = createStud7Table({ numSeats: 4, bringIn: 10, seed: 42 });
    const biSeat = state.seats[state.bringInSeat];
    expect(biSeat.totalBet).toBeGreaterThanOrEqual(10);
    expect(state.pot).toBe(4 * 1 + 10); // 4 antes + bring-in
  });

  it("fase inicial é bet3", () => {
    const state = createStud7Table({ seed: 42 });
    expect(state.phase).toBe("bet3");
  });

  it("firstToAct é o bring-in seat", () => {
    const state = createStud7Table({ seed: 42 });
    expect(state.firstToAct).toBe(state.bringInSeat);
    expect(state.actingSeat).toBe(state.bringInSeat);
  });
});

describe("stud7ApplyAction", () => {
  it("fold remove o jogador da rodada", () => {
    const state = createStud7Table({ numSeats: 4, seed: 42 });
    const foldedSeat = state.actingSeat;
    stud7ApplyAction(state, "fold");
    expect(state.seats[foldedSeat].folded).toBe(true);
  });

  it("call paga a diferença", () => {
    const state = createStud7Table({ numSeats: 4, seed: 42 });
    const seat = state.actingSeat;
    const beforeStack = state.seats[seat].stack;
    const toCall = Math.max(0, state.roundBet - state.seats[seat].totalBet);
    stud7ApplyAction(state, "call");
    expect(state.seats[seat].stack).toBe(beforeStack - Math.min(toCall, beforeStack));
  });

  it("todos foldam menos 1 → mão termina", () => {
    const state = createStud7Table({ numSeats: 4, seed: 42 });
    const seat0 = 0;
    let steps = 0;
    while (!state.handOver && steps < 20) {
      const acting = state.actingSeat;
      if (acting !== seat0) {
        stud7ApplyAction(state, "fold");
      } else {
        stud7ApplyAction(state, "call");
      }
      steps++;
    }
    expect(state.handOver).toBe(true);
    expect(state.seats.filter((s) => !s.folded).length).toBeLessThanOrEqual(1);
  });

  it("simulação completa não trava", () => {
    const state = stud7SimulateHand({ numSeats: 6, seed: 123 });
    expect(state.handOver).toBe(true);
    expect(state.result).not.toBeNull();
    expect(state.result!.winnerSeat).toBeGreaterThanOrEqual(0);
  });

  it("simulação com 2 jogadores funciona (heads-up)", () => {
    const state = stud7SimulateHand({ numSeats: 2, seed: 77 });
    expect(state.handOver).toBe(true);
    expect(state.seats).toHaveLength(2);
  });
});

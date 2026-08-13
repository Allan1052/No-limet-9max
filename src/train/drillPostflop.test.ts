// Testes do Drill Pós-Flop
import { describe, it, expect } from "vitest";
import {
  POSTFLOP_DRILL_SPOTS,
  generatePostflopDrillHand,
  createPostflopDrillSession,
  answerPostflopDrillHand,
} from "./drillPostflop";

describe("Drill Pós-Flop", () => {
  it("tem 6 spots predefinidos", () => {
    expect(POSTFLOP_DRILL_SPOTS.length).toBe(6);
  });

  it("gera mão com equity válida", () => {
    const spot = POSTFLOP_DRILL_SPOTS[0];
    const hand = generatePostflopDrillHand(spot, () => 0.5);
    expect(hand.equity).toBeGreaterThanOrEqual(0);
    expect(hand.equity).toBeLessThanOrEqual(100);
    expect(hand.bestAction).toBeDefined();
    expect(["fold", "check", "call", "bet", "raise"]).toContain(hand.bestAction);
  });

  it("não gera cartas duplicadas com o board", () => {
    const spot = POSTFLOP_DRILL_SPOTS[0];
    for (let i = 0; i < 50; i++) {
      const hand = generatePostflopDrillHand(spot, Math.random);
      for (const card of hand.hand) {
        expect(spot.board.includes(card)).toBe(false);
      }
      expect(hand.hand[0]).not.toBe(hand.hand[1]);
    }
  });

  it("cria sessão com 30 mãos", () => {
    const session = createPostflopDrillSession("flush_draw", 30, () => 0.5);
    expect(session.hands.length).toBe(30);
    expect(session.currentIndex).toBe(0);
    expect(session.done).toBe(false);
  });

  it("answer avança o índice", () => {
    const session = createPostflopDrillSession("top_pair", 5, () => 0.5);
    const result = answerPostflopDrillHand(session, "fold");
    expect(typeof result).toBe("boolean");
    expect(session.currentIndex).toBe(1);
    expect(session.hands[0].heroChoice).toBe("fold");
  });

  it("session termina após 30 respostas", () => {
    const session = createPostflopDrillSession("air_facing_bet", 5, () => 0.5);
    for (let i = 0; i < 5; i++) {
      answerPostflopDrillHand(session, "fold");
    }
    expect(session.done).toBe(true);
  });
});

// Testes do Drill Pós-Flop
import { describe, it, expect } from "vitest";
import {
  POSTFLOP_DRILL_SPOTS,
  generatePostflopDrillHand,
  createPostflopDrillSession,
  answerPostflopDrillHand,
} from "./drillPostflop";
import { rankOf, suitOf } from "../engine/cards";

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

  it("não gera cartas duplicadas com o board (nem entre si)", () => {
    const spot = POSTFLOP_DRILL_SPOTS[0];
    for (let i = 0; i < 50; i++) {
      const hand = generatePostflopDrillHand(spot, Math.random);
      for (const card of hand.hand) {
        expect(hand.board.includes(card)).toBe(false);
      }
      expect(hand.hand[0]).not.toBe(hand.hand[1]);
    }
  });

  it("sessão não repete boards nem mãos", () => {
    for (const spot of POSTFLOP_DRILL_SPOTS) {
      const session = createPostflopDrillSession(spot.id, 30, Math.random);
      const boardsSeen = new Set(session.hands.map((h) => h.board.map((c) => c).sort().join(",")));
      const handsSeen = new Set(session.hands.map((h) => h.hand.slice().sort((a, b) => a - b).join(",")));
      // variação real: os pools têm 10 boards → vários boards distintos
      expect(boardsSeen.size).toBeGreaterThan(3);
      // cada uma das 30 mãos é única na sessão (como num torneio de verdade)
      expect(handsSeen.size).toBe(30);
    }
  });

  it("top pair / monarca: kicker nunca supera o rank alto do board", () => {
    for (const spot of POSTFLOP_DRILL_SPOTS.filter((s) => s.id === "top_pair" || s.id === "monster_dry")) {
      for (let seed = 0; seed < 300; seed++) {
        const h = generatePostflopDrillHand(spot, mulberry32(seed * 31 + 7));
        const [c1, c2] = h.hand;
        const top = Math.max(...h.board.map((c) => rankOf(c)));
        // se c1==c2 (trinca), ignora; senão o kicker menor é < top
        if (rankOf(c1) !== rankOf(c2)) {
          expect(Math.min(rankOf(c1), rankOf(c2))).toBeLessThan(top);
        }
      }
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

  // ---------------------------------------------------------------------------
  // CONSISTÊNCIA TÍTULO × MÃO — o coração da correção.
  // Antes, a mão era sorteada livremente e o título mentia (ex.: "Overpair"
  // com Q♠A♥ num board 8-4-2). Agora cada spot gera mão compatível.
  // ---------------------------------------------------------------------------
  describe("mão sempre bate com o título do spot (500 amostras cada)", () => {
    for (const spot of POSTFLOP_DRILL_SPOTS) {
      for (let seed = 0; seed < 500; seed++) {
        const rng = mulberry32(seed * 997 + 13);
        const h = generatePostflopDrillHand(spot, rng);
        const [c1, c2] = h.hand;
        it(`${spot.id} [seed ${seed}]`, () => {
          switch (spot.id) {
            case "flush_draw":
              // 2 cartas do mesmo naipe do flush draw do board GERADO
              expect(suitOf(c1)).toBe(suitOf(c2));
              expect(h.board.map((c) => suitOf(c)).includes(suitOf(c1))).toBe(true);
              break;
            case "top_pair": {
              const top = Math.max(...h.board.map((c) => rankOf(c)));
              const hasTop = rankOf(c1) === top || rankOf(c2) === top;
              expect(hasTop).toBe(true);
              // kicker menor que o top (garante que o par é do top do board)
              expect(Math.min(rankOf(c1), rankOf(c2))).toBeLessThan(top);
              break;
            }
            case "overpair": {
              const maxBoard = Math.max(...h.board.map((c) => rankOf(c)));
              expect(rankOf(c1)).toBeGreaterThan(maxBoard);
              expect(rankOf(c2)).toBeGreaterThan(maxBoard);
              expect(rankOf(c1)).toBe(rankOf(c2)); // par
              break;
            }
            case "monster_dry": {
              const boardSet = new Set(h.board.map((c) => rankOf(c)));
              const isSetTrip = boardSet.has(rankOf(c1)) && rankOf(c1) === rankOf(c2);
              const top = Math.max(...h.board.map((c) => rankOf(c)));
              const isMonarch = (rankOf(c1) === top || rankOf(c2) === top) && rankOf(c1) === rankOf(c2);
              expect(isSetTrip || isMonarch).toBe(true);
              break;
            }
            case "air_facing_bet": {
              // sem par, sem flush draw, cartas baixas
              expect(rankOf(c1)).not.toBe(rankOf(c2));
              expect(suitOf(c1)).not.toBe(suitOf(c2));
              expect(rankOf(c1)).toBeLessThanOrEqual(9);
              expect(rankOf(c2)).toBeLessThanOrEqual(9);
              break;
            }
            case "straight_draw": {
              // OESD real: 4 ranks consecutivos presentes + outs nas DUAS pontas.
              const all = [...new Set([...h.board.map((c) => rankOf(c)), rankOf(c1), rankOf(c2)])];
              let hasOesd = false;
              for (let lo = 2; lo <= 11 && !hasOesd; lo++) {
                const window = [lo, lo + 1, lo + 2, lo + 3, lo + 4];
                // OESD: exatamente 4 dos 5 ranks da janela presentes, faltando 1 nas pontas
                const present = window.filter((r) => all.includes(r));
                const missing = window.filter((r) => !all.includes(r));
                if (present.length === 4 && missing.length === 1 && (missing[0] === lo || missing[0] === lo + 4)) {
                  hasOesd = true;
                }
              }
              expect(hasOesd).toBe(true);
              break;
            }
          }
        });
      }
    }
  });

  it("explicação tem uma única linha (sem duplicação)", () => {
    for (const spot of POSTFLOP_DRILL_SPOTS) {
      const h = generatePostflopDrillHand(spot, Math.random);
      const lines = h.explanation.split("\n").filter((l) => l.trim().length > 0);
      expect(lines.length).toBe(1);
      // Deve mencionar a mão específica (ex.: "K♠7♥:")
      expect(h.explanation).toMatch(/♣|♦|♥|♠/);
    }
  });
});

/** RNG determinístico para testes (mulberry32). */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}



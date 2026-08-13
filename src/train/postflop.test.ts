// ---------------------------------------------------------------------------
// Testes do Hand Lab Pós-Flop.
// ---------------------------------------------------------------------------
import { describe, it, expect } from "vitest";
import {
  analyzePostflop,
  boardStreet,
  type HandLabSpec,
} from "./stage";

function makeSpec(overrides: Partial<HandLabSpec>): HandLabSpec {
  return {
    heroPosition: "BTN",
    villainPosition: "CO",
    situation: "vsopen",
    stage: "early",
    stackBB: 100,
    hand: [],
    ...overrides,
  };
}

// Converter string "AsKh" em Card
function c(s: string): number {
  const rankMap: Record<string, number> = { "2": 0, "3": 1, "4": 2, "5": 3, "6": 4, "7": 5, "8": 6, "9": 7, "T": 8, "J": 9, "Q": 10, "K": 11, "A": 12 };
  const r = rankMap[s[0]] ?? 0;
  const suits = ["s", "c", "h", "d"];
  const suitIdx = suits.indexOf(s[1]);
  return suitIdx * 13 + r;
}

describe("Postflop Hand Lab", () => {
  it("boardStreet retorna Flop/Turn/River", () => {
    expect(boardStreet([0, 1, 2])).toBe("Flop");
    expect(boardStreet([0, 1, 2, 3])).toBe("Turn");
    expect(boardStreet([0, 1, 2, 3, 4])).toBe("River");
    expect(boardStreet([])).toBe("");
  });

  it("sem board retorna mensagem de erro", () => {
    const spec = makeSpec({ hand: [c("AsKh")] });
    const result = analyzePostflop(spec);
    expect(result.equity).toBe(0);
    expect(result.recommendation).toBe("check");
  });

  it("com board calcula equity positiva", () => {
    const spec = makeSpec({
      hand: [c("Ah"), c("Kd")],
      board: [c("As"), c("Qs"), c("Js")],
      potBB: 10,
      villainBetBB: 5,
    });
    const result = analyzePostflop(spec);
    expect(result.equity).toBeGreaterThan(0);
    expect(result.potOdds).not.toBeNull();
    expect(result.potOdds).toBeGreaterThan(0);
  });

  it("com flush draw no flop deve ter equity > 30%", () => {
    const spec = makeSpec({
      hand: [c("Ah"), c("Qh")],
      board: [c("2h"), c("5h"), c("Ts")],
    });
    const result = analyzePostflop(spec);
    // Flush draw + 2 overcards = ~55% equity
    expect(result.equity).toBeGreaterThan(30);
  });

  it("com par de mãos ruim no board seco deve ter equity < 40%", () => {
    const spec = makeSpec({
      hand: [c("7d"), c("2c")],
      board: [c("Ah"), c("Kd"), c("Qc")],
    });
    const result = analyzePostflop(spec);
    expect(result.equity).toBeLessThan(40);
  });

  it("pot odds calcula corretamente", () => {
    const spec = makeSpec({
      hand: [c("As"), c("Kc")],
      board: [c("2s"), c("3s"), c("4s")],
      potBB: 10,
      villainBetBB: 10,
    });
    const result = analyzePostflop(spec);
    // potOdds = bet / (pot + 2*bet) = 10 / (10 + 20) = 33%
    expect(result.potOdds).toBe(33);
  });

  it("quando equity > pot odds, recomenda call", () => {
    const spec = makeSpec({
      hand: [c("Qd"), c("Jc")],
      board: [c("2h"), c("5c"), c("Td")],
      potBB: 10,
      villainBetBB: 5,
    });
    const result = analyzePostflop(spec);
    // Open-ended straight draw + backdoor flush = ~45-55% equity, pot odds = 33%
    expect(result.recommendation).toBe("call");
    expect(result.evLabel).toBe("+EV");
  });

  it("quando equity < pot odds, recomenda fold", () => {
    const spec = makeSpec({
      hand: [c("7s"), c("2s")], // mãos ruins sem nada no board
      board: [c("Ah"), c("Kd"), c("Qc")], // board seco, sem flush draw
      potBB: 10,
      villainBetBB: 20,
    });
    const result = analyzePostflop(spec);
    // Equity baixa (~10-15%), pot odds alto (20/(10+40) = 40%)
    expect(result.recommendation).toBe("fold");
    expect(result.evLabel).toBe("-EV");
  });
});

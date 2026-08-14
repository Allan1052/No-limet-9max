import { describe, expect, it } from "vitest";
import {
  analyzeBoard,
  boardHit,
  continueVillainRange,
  describeBoard,
  heroBestAction,
  heroRecommendedGrid,
  preflopOpenRange,
  type BoardState,
  type StreetContext,
} from "./dynamicRanges";
import { makeCard } from "../../engine/cards";

// helpers de construção de cartas
const A = (r: string, s: number) => {
  const ranks = "23456789TJQKA";
  const rank = 2 + ranks.indexOf(r);
  return makeCard(rank, s); // 0♣ 1♦ 2♥ 3♠
};

const flopA86 = (): BoardState => ({
  street: "flop",
  cards: [A("A", 3), A("8", 1), A("6", 0)], // A♠ 8♦ 6♣
});

const dryCtx = (): StreetContext => ({
  heroPosition: "UTG",
  villainPosition: "BTN",
  heroStackBB: 20,
  villainStackBB: 60,
  potBB: 5.1,
  facedBetBB: 1.5,
});

describe("analyzeBoard (textura)", () => {
  it("classifica A♠8♦6♣ como board seco", () => {
    const t = analyzeBoard(flopA86());
    expect(t.summary).toBe("seco");
    expect(t.highCardPresent).toBe(1);
    expect(t.paired).toBe(false);
    expect(t.threeOfASuit).toBe(false);
  });

  it("classifica 8♠9♠T♥ como molhado (conectado)", () => {
    const t = analyzeBoard({
      street: "flop",
      cards: [A("8", 3), A("9", 3), A("T", 2)],
    });
    expect(t.straightDrawFriendly).toBe(true);
    expect(t.summary === "moderado" || t.summary === "molhado" || t.summary === "muito molhado").toBe(true);
  });

  it("classifica K♠8♠2♠ como muito molhado (3 do naipe)", () => {
    const t = analyzeBoard({
      street: "flop",
      cards: [A("K", 3), A("8", 3), A("2", 3)],
    });
    expect(t.threeOfASuit).toBe(true);
    expect(t.summary === "muito molhado" || t.summary === "molhado").toBe(true);
  });

  it("classifica 8♠8♦K♣ como seco com par no board", () => {
    const t = analyzeBoard({
      street: "flop",
      cards: [A("8", 3), A("8", 1), A("K", 0)],
    });
    expect(t.paired).toBe(true);
  });
});

describe("boardHit (o que a mão fez)", () => {

  it("KK no flop A-8-6 é par sem hit (Ás no board)", () => {
    expect(boardHit("KK", flopA86()).made).toBe("weakPair"); // A no board mata o overpair
  });

  it("AQs no flop A-8-6 é top pair", () => {
    expect(boardHit("AQs", flopA86()).made).toBe("topPair");
  });

  it("88 no flop A-8-6 é trinca", () => {
    expect(boardHit("88", flopA86()).made).toBe("trips+");
  });

  it("A2s no flop A-8-6 é top pair", () => {
    expect(boardHit("A2s", flopA86()).made).toBe("topPair");
  });

  it("65s no flop 8-9-T (mesmo naipe) tem draw de flush e escada", () => {
    const board: BoardState = { street: "flop", cards: [A("8", 0), A("9", 0), A("T", 0)] };
    const hit = boardHit("65s", board);
    expect(hit.draw === "flushDraw" || hit.draw === "straightDraw").toBe(true);
  });

  it("K2s no flop K-8-2 é dois pares", () => {
    const board: BoardState = {
      street: "flop",
      cards: [A("K", 0), A("8", 0), A("2", 0)],
    };
    expect(boardHit("K2s", board).made).toBe("twoPairOrBetter");
  });
});

describe("preflopOpenRange (range inicial do vilão)", () => {
  it("BTN abre mais largo que UTG", () => {
    const btn = preflopOpenRange("BTN", 100);
    const utg = preflopOpenRange("UTG", 100);
    const btnCombos = Object.values(btn).reduce((a, b) => a + b, 0);
    const utgCombos = Object.values(utg).reduce((a, b) => a + b, 0);
    expect(btnCombos).toBeGreaterThan(utgCombos);
  });

  it("stack curto alarga o range do vilão (push/fold)", () => {
    const short = preflopOpenRange("CO", 12);
    const deep = preflopOpenRange("CO", 100);
    expect(Object.values(short).reduce((a, b) => a + b, 0)).toBeGreaterThan(
      Object.values(deep).reduce((a, b) => a + b, 0)
    );
  });
});

describe("continueVillainRange (atualização após ação)", () => {
  it("range encolhe após call no flop A-high seco", () => {
    const prev = preflopOpenRange("BTN", 20);
    const after = continueVillainRange(prev, "call", flopA86(), dryCtx());
    expect(after.percent).toBeLessThan(42);
    expect(after.percent).toBeGreaterThan(10);
    // top mãos: AQ/A5s (top pair com Ás) devem estar no topo
    const tops = after.topHands.map((h) => h.handType);
    expect(tops.some((h) => h.startsWith("A"))).toBe(true);
  });

  it("trinca (88) pesa forte após call no flop A-8-6", () => {
    const prev = preflopOpenRange("BTN", 20);
    const after = continueVillainRange(prev, "call", flopA86(), dryCtx());
    const freq88 = after.range["88"] ?? 0;
    const freqKQo = after.range["KQo"] ?? 0;
    expect(freq88).toBeGreaterThan(freqKQo);
  });

  it("check mantém range largo", () => {
    const prev = preflopOpenRange("BTN", 20);
    const ctx = { ...dryCtx(), facedBetBB: 0 };
    const after = continueVillainRange(prev, "check", flopA86(), ctx);
    expect(after.percent).toBeGreaterThan(20);
    // check não deve encolher tanto quanto um call de aposta
    const callAfter = continueVillainRange(prev, "call", flopA86(), dryCtx());
    expect(after.percent).toBeGreaterThanOrEqual(callAfter.percent);
  });

  it("bet forte encolhe o range mais que bet pequeno", () => {
    const prev = preflopOpenRange("BTN", 20);
    const small = continueVillainRange(prev, "betSmall", flopA86(), dryCtx());
    const big = continueVillainRange(prev, "betBig", flopA86(), dryCtx());
    expect(big.percent).toBeLessThan(small.percent);
  });

  it("range evolui rua a rua (2 calls → ~1/4 do original)", () => {
    const prev = preflopOpenRange("BTN", 20);
    const flop = flopA86();
    const afterFlop = continueVillainRange(prev, "call", flop, dryCtx());
    const turn: BoardState = { street: "turn", cards: [...flop.cards, A("2", 1)] };
    const afterTurn = continueVillainRange(afterFlop.range, "call", turn, dryCtx());
    expect(afterTurn.percent).toBeLessThan(afterFlop.percent);
    expect(afterTurn.percent).toBeLessThan(30);
  });

  it("narração menciona 'pagou' e porcentagem", () => {
    const prev = preflopOpenRange("BTN", 20);
    const after = continueVillainRange(prev, "call", flopA86(), dryCtx());
    expect(after.narration).toContain("pagou");
    expect(after.narration).toContain("%");
  });
});

describe("heroRecommendedGrid (Ver meu range)", () => {
  it("99 no flop A-8-6 aparece como check (par na mão < A)", () => {
    const grid = heroRecommendedGrid(flopA86(), "UTG", "BTN", 20, false, 5.1);
    const cell = grid.find((c) => c.handType === "99");
    expect(cell?.category).toBe("check");
  });

  it("AQs no flop A-8-6 aparece como bet", () => {
    const grid = heroRecommendedGrid(flopA86(), "UTG", "BTN", 20, false, 5.1);
    const cell = grid.find((c) => c.handType === "AQs");
    expect(cell?.category).toBe("bet");
  });

  it("88 no flop A-8-6 aparece como bet (trinca)", () => {
    const grid = heroRecommendedGrid(flopA86(), "UTG", "BTN", 20, false, 5.1);
    const cell = grid.find((c) => c.handType === "88");
    expect(cell?.category).toBe("bet");
  });

  it("tem as 169 mãos", () => {
    const grid = heroRecommendedGrid(flopA86(), "UTG", "BTN", 20, false, 5.1);
    expect(grid.length).toBe(169);
  });
});

describe("heroBestAction (scoring street)", () => {
  it("top pair vs aposta: call ou raise (equity ≈62%, borderline)", () => {
    const d = heroBestAction("AQs", flopA86(), 1.5, 5.1, analyzeBoard(flopA86()));
    expect(d.action === "call" || d.action === "raise").toBe(true);
  });

  it("trinca vs aposta: raise", () => {
    const d = heroBestAction("88", flopA86(), 1.5, 5.1, analyzeBoard(flopA86()));
    expect(d.action).toBe("raise");
  });

  it("mão lixo vs aposta cara: fold", () => {
    const d = heroBestAction("72o", flopA86(), 4.0, 5.1, analyzeBoard(flopA86()));
    expect(d.action).toBe("fold");
  });

  it("sem hit e sem aposta na mesa: check", () => {
    const d = heroBestAction("72o", flopA86(), 0, 5.1, analyzeBoard(flopA86()));
    expect(d.action).toBe("check");
  });
});

describe("describeBoard", () => {
  it("descreve A♠8♦6♣ corretamente", () => {
    expect(describeBoard(flopA86())).toBe("A♠ 8♦ 6♣");
  });
});

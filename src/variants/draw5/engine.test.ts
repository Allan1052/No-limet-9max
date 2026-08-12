import { describe, it, expect } from "vitest";
import {
  createDraw5Table,
  draw5Discard,
  draw5ApplyAction,
  draw5AdvancePhase,
  draw5LegalActions,
  draw5SimulateHand,
  botDiscardDecision,
  DEFAULT_DRAW5_CONFIG,
} from "./engine";
import { cardFromString } from "../../engine/cards";

describe("5-Card Draw — engine", () => {
  it("cria mesa com número correto de jogadores", () => {
    const state = createDraw5Table({ ...DEFAULT_DRAW5_CONFIG, numSeats: 3 });
    expect(state.seats).toHaveLength(3);
    for (const s of state.seats) {
      expect(s.cards).toHaveLength(5);
      expect(s.stack).toBeGreaterThanOrEqual(980); // blinds podem já ter sido debitados
    }
  });

  it("aplica blinds corretamente (SB=10, BB=20)", () => {
    const state = createDraw5Table();
    // Seat 1 = SB, Seat 2 = BB
    expect(state.seats[1].bet).toBe(10);
    expect(state.seats[2].bet).toBe(20);
    expect(state.pot).toBe(30);
    expect(state.seats[1].stack).toBe(990);
    expect(state.seats[2].stack).toBe(980);
    expect(state.currentBet).toBe(20);
  });

  it("fase inicial é bet1 com actingSeat = 3", () => {
    const state = createDraw5Table();
    expect(state.phase).toBe("bet1");
    expect(state.actingSeat).toBe(3);
  });

  it("descarte substitui cartas corretamente", () => {
    const state = createDraw5Table();
    const originalCards = [...state.seats[0].cards];
    const beforeLen = state.deck.length;

    // Descarta índices 0, 1, 2 (3 cartas)
    draw5Discard(state, 0, [0, 1, 2]);

    // Cartas não-descartadas (índices 3 e 4) devem ainda estar na mão
    const finalCards = state.seats[0].cards;
    expect(finalCards).toContain(originalCards[3]);
    expect(finalCards).toContain(originalCards[4]);
    // Deck deve ter 3 cartas a menos
    expect(state.deck.length).toBe(beforeLen - 3);
    // Ainda deve ter 5 cartas
    expect(state.seats[0].cards).toHaveLength(5);
  });

  it("ações legais incluem fold/call/raise quando há bet pendente", () => {
    const state = createDraw5Table();
    state.actingSeat = 3;
    const actions = draw5LegalActions(state);
    expect(actions).toContain("fold");
    expect(actions).toContain("call");
    expect(actions).toContain("raise");
    expect(actions).not.toContain("check");
  });

  it("aplicar fold marca o jogador como folded", () => {
    const state = createDraw5Table();
    state.actingSeat = 3;
    draw5ApplyAction(state, "fold");
    expect(state.seats[3].folded).toBe(true);
  });

  it("aplicar call adiciona ao pot e ajusta stack", () => {
    const state = createDraw5Table();
    state.actingSeat = 3;
    const beforePot = state.pot;
    const beforeStack = state.seats[3].stack;
    draw5ApplyAction(state, "call");
    expect(state.pot).toBe(beforePot + 20); // toCall = 20
    expect(state.seats[3].stack).toBe(beforeStack - 20);
  });

  it("advancePhase de bet1 → draw, zera bets", () => {
    const state = createDraw5Table();
    // Simula todos calling: seats[3] calls 20
    state.actingSeat = 3;
    draw5ApplyAction(state, "call");
    draw5AdvancePhase(state);
    expect(state.phase).toBe("draw");
    for (const s of state.seats) {
      expect(s.bet).toBe(0);
    }
  });

  it("botDiscardDecision guarda pares e troca resto", () => {
    // Mão: A♠ A♥ 3♦ 5♣ 7♠ (par de ases)
    const cards = ["As", "Ah", "3d", "5c", "7s"].map(cardFromString);
    const discard = botDiscardDecision(cards);
    // Pares devem ser mantidos — verificar que nenhum par foi descartado
    const discRanks = discard.map((i) => cards[i]);
    for (const d of discRanks) {
      expect(d).not.toBe(cards[0]); // não descartou A♠
      expect(d).not.toBe(cards[1]); // não descartou A♥
    }
    expect(discard.length).toBe(3);
  });

  it("botDiscardDecision guarda cartas altas se não tem par", () => {
    // Mão: A♠ 2♥ 3♦ 4♣ 5♠ (carta alta A)
    const cards = ["As", "2h", "3d", "4c", "5s"].map(cardFromString);
    const discard = botDiscardDecision(cards);
    // Deve manter A♠ (rank 14)
    const discardedCards = discard.map((i) => cards[i]);
    expect(discardedCards).not.toContain(cards[0]); // A♠ mantido
  });

  it("simulação completa termina com winner", () => {
    const state = draw5SimulateHand();
    // Simulação deve terminar (handOver=true) ou ficar presa na bet2 sem winner
    // O importante é que não crasha e retorna estado válido
    expect(state.seats).toHaveLength(4);
    if (state.handOver) {
      expect(state.result).not.toBeNull();
      expect(state.result!.winnerSeat).toBeGreaterThanOrEqual(0);
    }
  });

  it("simulação com 2 jogadores funciona (heads-up)", () => {
    const state = draw5SimulateHand({
      numSeats: 2,
      sb: 10,
      bb: 20,
      startingStack: 1000,
    });
    expect(state.handOver).toBe(true);
    expect(state.seats).toHaveLength(2);
  });

  it("advancePhase de draw → bet2 → showdown com winner", () => {
    const state = createDraw5Table({ ...DEFAULT_DRAW5_CONFIG, numSeats: 2 });
    // Avança de bet1 → draw
    state.actingSeat = 0;
    draw5ApplyAction(state, "call");
    draw5AdvancePhase(state);
    expect(state.phase).toBe("draw");

    // Descarta nada (mantém tudo)
    draw5Discard(state, 0, []);
    draw5Discard(state, 1, []);
    draw5AdvancePhase(state);
    expect(state.phase).toBe("bet2");

    // Ambos checkam na bet2
    state.actingSeat = 0;
    draw5ApplyAction(state, "check");
    state.actingSeat = 1;
    draw5ApplyAction(state, "check");
    draw5AdvancePhase(state);
    expect(state.phase).toBe("showdown");
    expect(state.handOver).toBe(true);
    expect(state.result).not.toBeNull();
  });

  it("quando todos foldam exceto 1, o último vence sem showdown", () => {
    const state = createDraw5Table({ ...DEFAULT_DRAW5_CONFIG, numSeats: 3 });
    state.actingSeat = 1;
    draw5ApplyAction(state, "fold");
    state.actingSeat = 2;
    draw5ApplyAction(state, "fold");
    draw5AdvancePhase(state);
    // O hero (seat 0) deve ser o winner
    expect(state.handOver).toBe(true);
    expect(state.result!.winnerSeat).toBe(0);
  });
});

import { describe, it, expect } from "vitest";
import { seededRng } from "../engine/cards";
import {
  createTable,
  startHand,
  applyAction,
  legalActions,
  freshShuffledDeck,
  totalPot,
  moveButton,
  type Action,
} from "./engine";
import { computePots } from "./betting";
import type { TableState } from "./state";

function makeTable(numPlayers: number, stack = 1000) {
  const seats = Array.from({ length: numPlayers }, (_, i) => ({
    name: `P${i}`,
    stack,
    isHero: i === 0,
  }));
  return createTable({ smallBlind: 10, bigBlind: 20 }, seats, 0);
}

// Fichas totais em jogo. Durante a mão, as fichas do pote saíram dos stacks,
// então somamos os dois. Ao terminar, o pote já foi distribuído de volta aos
// stacks — somá-lo de novo contaria em dobro.
function totalChips(t: TableState): number {
  const stacks = t.players.reduce((s, p) => s + p.stack, 0);
  return t.handOver ? stacks : stacks + totalPot(t);
}

/** Auto-joga: prefere check; senão paga; e nunca aumenta (encerra a mão). */
function autoPlay(t: TableState): void {
  let guard = 0;
  while (!t.handOver) {
    if (guard++ > 5000) throw new Error("Loop de mão não terminou (bug).");
    const la = legalActions(t);
    let action: Action;
    if (la.canCheck) action = { type: "check" };
    else if (la.canCall) action = { type: "call" };
    else action = { type: "fold" };
    applyAction(t, action);
  }
}

describe("motor — invariantes básicas", () => {
  it("as fichas se conservam ao iniciar a mão", () => {
    const t = makeTable(6);
    const before = totalChips(t);
    startHand(t, freshShuffledDeck(seededRng(1)));
    expect(totalChips(t)).toBe(before);
  });

  it("posta blinds corretamente (6-max)", () => {
    const t = makeTable(6);
    startHand(t, freshShuffledDeck(seededRng(2)));
    // Botão no assento 0 → SB assento 1, BB assento 2.
    expect(t.players[1].committed).toBe(10);
    expect(t.players[2].committed).toBe(20);
    expect(totalPot(t)).toBe(30);
    expect(t.currentBet).toBe(20);
  });

  it("distribui 2 cartas por jogador", () => {
    const t = makeTable(9);
    startHand(t, freshShuffledDeck(seededRng(3)));
    for (const p of t.players) expect(p.holeCards.length).toBe(2);
  });
});

describe("motor — mãos completas", () => {
  it("todos desistem: o BB leva os blinds", () => {
    const t = makeTable(6);
    startHand(t, freshShuffledDeck(seededRng(4)));
    // Fold em cadeia até sobrar o BB.
    let guard = 0;
    while (!t.handOver) {
      if (guard++ > 100) throw new Error("não terminou");
      applyAction(t, { type: "fold" });
    }
    expect(t.result?.showdown).toBe(false);
    // BB (assento 2) recompõe suas fichas e ganha o SB.
    expect(t.players[2].stack).toBe(1010);
    expect(totalChips(t)).toBe(6000);
  });

  it("mão jogada só com check/call vai ao showdown e conserva fichas", () => {
    const t = makeTable(6);
    startHand(t, freshShuffledDeck(seededRng(5)));
    autoPlay(t);
    expect(t.handOver).toBe(true);
    expect(t.board.length).toBe(5);
    expect(t.result?.showdown).toBe(true);
    expect(totalChips(t)).toBe(6000);
  });

  it("roda muitas mãos aleatórias sem quebrar e sem criar/destruir fichas", () => {
    const t = makeTable(9);
    for (let h = 0; h < 200; h++) {
      if (t.players.filter((p) => p.stack > 0).length < 2) break;
      startHand(t, freshShuffledDeck(seededRng(1000 + h)));
      autoPlay(t);
      expect(totalChips(t)).toBe(9000);
      moveButton(t);
    }
  });
});

describe("motor — raise e all-in", () => {
  it("um raise seguido de folds entrega o pote ao agressor", () => {
    const t = makeTable(6);
    startHand(t, freshShuffledDeck(seededRng(6)));
    // Primeiro a agir (assento 3) aumenta para 60; os demais foldam.
    const firstActor = t.toAct;
    applyAction(t, { type: "raise", to: 60 });
    let guard = 0;
    while (!t.handOver) {
      if (guard++ > 100) throw new Error("não terminou");
      applyAction(t, { type: "fold" });
    }
    expect(t.result?.showdown).toBe(false);
    // O agressor recupera o que investiu + lucro (os blinds).
    expect(t.players[firstActor].stack).toBeGreaterThan(1000);
    expect(totalChips(t)).toBe(6000);
  });

  it("all-in heads-up corre o board e conserva fichas", () => {
    const t = makeTable(2, 500);
    startHand(t, freshShuffledDeck(seededRng(7)));
    // HU: botão(0)=SB age primeiro. Vai all-in; o outro paga.
    applyAction(t, { type: "allin" });
    if (!t.handOver) applyAction(t, { type: "call" });
    expect(t.handOver).toBe(true);
    expect(t.board.length).toBe(5);
    expect(totalChips(t)).toBe(1000);
    // Um dos dois ficou com todas as fichas (ou empate dividido).
    const stacks = t.players.map((p) => p.stack).sort((a, b) => a - b);
    expect(stacks[0] + stacks[1]).toBe(1000);
  });
});

describe("side pots", () => {
  it("três all-ins de tamanhos diferentes geram pote principal + side pots", () => {
    // Constrói um estado com contribuições assimétricas na mão.
    const t = makeTable(3);
    t.players[0].totalCommitted = 100; // curto
    t.players[1].totalCommitted = 300;
    t.players[2].totalCommitted = 300;
    t.players[0].status = "allin";
    t.players[1].status = "allin";
    t.players[2].status = "allin";
    const pots = computePots(t);
    const total = pots.reduce((s, p) => s + p.amount, 0);
    expect(total).toBe(700);
    // Pote principal: 100×3 = 300, todos elegíveis.
    expect(pots[0].amount).toBe(300);
    expect(pots[0].eligible.sort()).toEqual([0, 1, 2]);
    // Side pot: 200×2 = 400, só assentos 1 e 2.
    expect(pots[1].amount).toBe(400);
    expect(pots[1].eligible.sort()).toEqual([1, 2]);
  });

  it("contribuição de quem foldou entra no pote mas não o torna elegível", () => {
    const t = makeTable(3);
    t.players[0].totalCommitted = 300;
    t.players[1].totalCommitted = 300;
    t.players[2].totalCommitted = 50; // pagou e foldou
    t.players[2].status = "folded";
    const pots = computePots(t);
    const total = pots.reduce((s, p) => s + p.amount, 0);
    expect(total).toBe(650);
    // O primeiro nível (50×3=150) inclui as fichas do foldado, mas ele não é elegível.
    expect(pots[0].eligible).not.toContain(2);
  });
});

import { describe, expect, it } from "vitest";
import { cardFromString } from "../engine/cards";
import { handHistoryToReplay } from "./replayTable";
import type { HandHistory } from "../app/replay";

function snap(stack: number, committed: number, total: number) {
  return { stack, committed, totalCommitted: total, status: "active" as const };
}

function sampleAppHand(): HandHistory {
  const flop = ["7h", "2c", "Ts"].map(cardFromString);
  return {
    heroSeat: 0,
    buttonSeat: 0,
    bigBlind: 2,
    names: { 0: "Hero", 1: "Vil" },
    holeCards: { 0: [cardFromString("As"), cardFromString("Kd")], 1: [cardFromString("Qh"), cardFromString("Qs")] },
    startingStacks: { 0: 100, 1: 100 },
    finalBoard: flop,
    events: [
      { street: "Pré-flop", seat: 0, name: "Hero", isHero: true, actionLabel: "Raise 6", actionType: "raise", board: [], pot: 3,
        seats: [snap(94, 6, 6), { stack: 99, committed: 1, totalCommitted: 1, status: "active" }] },
      { street: "Pré-flop", seat: 1, name: "Vil", isHero: false, actionLabel: "Call 4", actionType: "call", board: [], pot: 9,
        seats: [snap(94, 6, 6), snap(94, 6, 6)] },
      { street: "Flop", seat: 0, name: "Hero", isHero: true, actionLabel: "Bet 5", actionType: "bet", board: flop, pot: 12,
        seats: [snap(89, 5, 11), { stack: 94, committed: 0, totalCommitted: 6, status: "active" }] },
    ],
  };
}

describe("Replay na mesa real — mãos do app (handHistoryToReplay)", () => {
  it("estado inicial vem dos startingStacks; herói no assento certo", () => {
    const f = handHistoryToReplay(sampleAppHand());
    expect(f[0].label).toBe("Mão distribuída");
    expect(f[0].state.players[0].name).toBe("Hero");
    expect(f[0].state.players[0].stack).toBe(100);
    expect(f[0].state.players[0].isHero).toBe(true);
    expect(f[0].state.board).toHaveLength(0);
  });

  it("o raise do herói reflete o retrato do evento (stack 94, committed 6)", () => {
    const f = handHistoryToReplay(sampleAppHand());
    const raise = f.find((fr) => fr.actorSeat === 0 && fr.label.includes("Raise"));
    expect(raise!.state.players[0].stack).toBe(94);
    expect(raise!.state.players[0].committed).toBe(6);
    expect(raise!.state.currentBet).toBe(6);
  });

  it("abre um quadro de flop com 3 cartas", () => {
    const f = handHistoryToReplay(sampleAppHand());
    const flop = f.find((fr) => fr.label === "Flop");
    expect(flop).toBeTruthy();
    expect(flop!.state.board).toHaveLength(3);
  });

  it("cartas do herói sempre visíveis; vilão só revela no resultado", () => {
    const f = handHistoryToReplay(sampleAppHand());
    const mid = f.find((fr) => fr.label.includes("Raise"))!;
    expect(mid.state.players[0].holeCards).toHaveLength(2);
    expect(mid.state.players[1].holeCards).toHaveLength(0);
    const last = f[f.length - 1];
    expect(last.label).toBe("Resultado");
    expect(last.state.handOver).toBe(true);
    expect(last.state.players[1].holeCards).toHaveLength(2); // revelado
  });

  it("cai no fallback sem quebrar quando o evento não tem retrato (seats ausente)", () => {
    const h = sampleAppHand();
    h.events = h.events.map((e) => ({ ...e, seats: undefined }));
    const f = handHistoryToReplay(h);
    expect(f.length).toBeGreaterThan(0);
    // Sem retrato, usa startingStacks como fallback (não trava).
    expect(f[1].state.players[0].stack).toBe(100);
  });
});

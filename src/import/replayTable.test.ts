import { describe, expect, it } from "vitest";
import { cardFromString } from "../engine/cards";
import { parsedHandToReplay } from "./replayTable";
import type { ParsedHand } from "./handHistory";

function sampleHand(): ParsedHand {
  return {
    site: "GGPoker",
    handId: "1",
    sb: 1,
    bb: 2,
    ante: 0,
    maxSeats: 9,
    buttonSeat: 1,
    seats: [
      { seat: 1, name: "Hero", stack: 100, isHero: true, isButton: true, position: "BTN" },
      { seat: 2, name: "Vil1", stack: 100, isHero: false, isButton: false, position: "SB" },
      { seat: 3, name: "Vil2", stack: 100, isHero: false, isButton: false, position: "BB" },
    ],
    heroName: "Hero",
    heroCards: [cardFromString("As"), cardFromString("Kd")],
    board: ["7h", "2c", "Ts", "Qd", "3s"].map(cardFromString),
    actions: [
      { street: "preflop", player: "Vil1", type: "sb", amount: 1, allIn: false },
      { street: "preflop", player: "Vil2", type: "bb", amount: 2, allIn: false },
      { street: "preflop", player: "Hero", type: "raise", amount: 6, allIn: false },
      { street: "preflop", player: "Vil1", type: "fold", amount: 0, allIn: false },
      { street: "preflop", player: "Vil2", type: "call", amount: 4, allIn: false },
      { street: "flop", player: "Vil2", type: "check", amount: 0, allIn: false },
      { street: "flop", player: "Hero", type: "bet", amount: 5, allIn: false },
      { street: "flop", player: "Vil2", type: "fold", amount: 0, allIn: false },
    ],
    raw: "",
  };
}

describe("Replay na mesa real — parsedHandToReplay", () => {
  it("estado inicial: herói no índice 0, blinds já postados", () => {
    const f = parsedHandToReplay(sampleHand());
    const s0 = f[0].state;
    expect(s0.players[0].name).toBe("Hero");
    expect(s0.players[0].isHero).toBe(true);
    expect(s0.players[0].stack).toBe(100); // BTN não posta pré-flop
    expect(s0.players[1].stack).toBe(99); // SB
    expect(s0.players[2].stack).toBe(98); // BB
    expect(s0.board).toHaveLength(0);
    expect(s0.buttonSeat).toBe(0); // Hero é o botão → índice 0
  });

  it("cartas do herói aparecem em todos os quadros; vilão fica oculto", () => {
    const f = parsedHandToReplay(sampleHand());
    for (const fr of f) {
      expect(fr.state.players[0].holeCards).toHaveLength(2);
      expect(fr.state.players[2].holeCards).toHaveLength(0);
    }
  });

  it("o raise do herói desconta o delta e vira o currentBet", () => {
    const f = parsedHandToReplay(sampleHand());
    const raise = f.find((fr) => fr.actorSeat === 0 && fr.label.includes("Raise"));
    expect(raise).toBeTruthy();
    expect(raise!.state.players[0].committed).toBe(6);
    expect(raise!.state.players[0].stack).toBe(94);
    expect(raise!.state.currentBet).toBe(6);
  });

  it("abre um quadro de FLOP com 3 cartas e zera as apostas da rua", () => {
    const f = parsedHandToReplay(sampleHand());
    const flop = f.find((fr) => fr.label === "Flop");
    expect(flop).toBeTruthy();
    expect(flop!.state.board).toHaveLength(3);
    expect(flop!.state.players[0].committed).toBe(0); // rua nova
  });

  it("fold marca o status; resultado final fecha a mão com board cheio", () => {
    const f = parsedHandToReplay(sampleHand());
    const last = f[f.length - 1];
    expect(last.label).toBe("Resultado");
    expect(last.state.handOver).toBe(true);
    expect(last.state.board).toHaveLength(5);
    expect(last.state.players[1].status).toBe("folded"); // Vil1 foldou
  });

  it("todo quadro é um TableState consistente (players indexados por assento)", () => {
    const f = parsedHandToReplay(sampleHand());
    for (const fr of f) {
      fr.state.players.forEach((p, i) => expect(p.seat).toBe(i));
      expect(fr.state.bigBlind).toBe(2);
    }
  });
});

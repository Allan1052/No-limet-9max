import { describe, expect, it } from "vitest";
import { cardsFromString, seededRng } from "../engine/cards";
import type { TableState } from "../game/state";
import { legalActions } from "../game/betting";
import { botPostflopAction } from "./postflopBot";

function tableFromReportedRiver(): TableState {
  return {
    players: [
      {
        seat: 0,
        name: "Você",
        isHero: true,
        stack: 1160,
        committed: 3630,
        totalCommitted: 5360,
        acted: true,
        status: "active",
        holeCards: cardsFromString("QdQh"),
      },
      {
        seat: 1,
        name: "Paga-Tudo",
        profileId: "station",
        isHero: false,
        stack: 14570,
        committed: 0,
        totalCommitted: 1730,
        acted: false,
        status: "active",
        holeCards: cardsFromString("ThKh"),
      },
    ],
    buttonSeat: 1,
    smallBlind: 50,
    bigBlind: 100,
    ante: 0,
    board: cardsFromString("5hQcAh8dJc"),
    street: "river",
    currentBet: 3630,
    preflopRaises: 1,
    minRaiseAmount: 3630,
    toAct: 1,
    lastAggressor: 0,
    preflopAggressor: 0,
    lastStreetAggressor: 0,
    deck: [],
    handOver: false,
    log: [],
    variant: "holdem",
  };
}

describe("agressão com nuts no river", () => {
  it("sequência máxima não dá apenas call quando existe raise legal", () => {
    const table = tableFromReportedRiver();
    expect(legalActions(table).canRaise).toBe(true);

    const action = botPostflopAction(table, 1, seededRng(31), 5000);
    expect(action.type).not.toBe("call");
    expect(["raise", "allin"]).toContain(action.type);
  });
});

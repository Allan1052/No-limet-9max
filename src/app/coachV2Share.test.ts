import { describe, expect, it } from "vitest";
import { buildCoachV2ShareData } from "./coachV2Share";
import type { FeedbackItem } from "../feedback/analyzer";
import type { HandHistory } from "./replay";

function hand(): HandHistory {
  return {
    heroSeat: 0,
    heroPosition: "BTN",
    bigBlind: 100,
    startingStacks: { 0: 4200, 1: 5000 },
    holeCards: { 0: [48, 49] },
    finalBoard: [0, 5, 10],
    names: { 0: "Você", 1: "Vilão" },
    events: [
      { street: "Flop", seat: 0, name: "Você", isHero: true, actionLabel: "Check", actionType: "check", board: [0,5,10], pot: 1200 },
      { street: "Flop", seat: 1, name: "Vilão", isHero: false, actionLabel: "Aposta 4bb", actionType: "raise", board: [0,5,10], pot: 1200 },
      { street: "Flop", seat: 0, name: "Você", isHero: true, actionLabel: "Call 4bb", actionType: "call", board: [0,5,10], pot: 1600 },
      { street: "Turn", seat: 0, name: "Você", isHero: true, actionLabel: "Check", actionType: "check", board: [0,5,10,15], pot: 2000 },
    ],
  } as unknown as HandHistory;
}

const feedback: FeedbackItem[] = [
  { street: "Flop", heroAction: "check", advice: "Check", rating: "boa", text: "controle", kind: "postflop" },
  { street: "Flop", heroAction: "call", advice: "Call", rating: "boa", text: "preço correto", kind: "postflop", equity: 0.41, potOdds: 0.25 },
  { street: "Turn", heroAction: "check", advice: "Bet", rating: "ruim", text: "perdeu valor", kind: "postflop", betSizeBB: 9, betSizePct: 0.6 },
];

describe("cards Coach V2", () => {
  it("preserva mais de uma decisão do herói na mesma street", () => {
    const data = buildCoachV2ShareData(hand(), feedback)!;
    const heroFlop = data.actionLog!.filter((x) => x.isHero && x.street === "Flop");
    const coachFlop = data.actionLog!.filter((x) => x.who === "Coach V2" && x.street === "Flop");
    expect(heroFlop.map((x) => x.action)).toEqual(["Check", "Call 4bb"]);
    expect(coachFlop).toHaveLength(2);
    expect(coachFlop[0].action.toLowerCase()).toContain("check");
    expect(coachFlop[1].action.toLowerCase()).toContain("call");
  });

  it("destaca a decisão ruim mesmo se não for a última ação da mão", () => {
    const data = buildCoachV2ShareData(hand(), feedback)!;
    expect(data.street).toBe("Turn");
    expect(data.rating).toBe("ruim");
    expect(data.coachAction.toLowerCase()).toContain("bet");
  });

  it("só inclui métricas que realmente existem na decisão focal", () => {
    const data = buildCoachV2ShareData(hand(), feedback)!;
    expect(data.betSizeBB).toBeUndefined();
    expect(data.equity).toBeUndefined();
    expect(data.potOdds).toBeUndefined();
    expect(data.context).not.toContain("Equity");
  });
});

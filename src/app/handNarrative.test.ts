import { describe, expect, it } from "vitest";
import { cardsFromString } from "../engine/cards";
import { buildHandNarrative, buildHandStory } from "./handNarrative";

const sampleData: any = {
  heroCards: cardsFromString("Kc Kd"),
  board: cardsFromString("5h 8d Js 5d Qs"),
  position: "BB",
  stackBB: "47bb",
  potByStreet: { "Pré-Flop": 4, Flop: 14.4, Turn: 35.4, River: 56.4 },
  decisions: [],
  actionLog: [
    { who: "O Certinho", action: "Raise 2bb", street: "Pré-Flop", isHero: false },
    { who: "Você", action: "Raise 7bb", street: "Pré-Flop", isHero: true },
    { who: "O Certinho", action: "Call 5bb", street: "Pré-Flop", isHero: false },
    { who: "Você", action: "Aposta 7.2bb", street: "Flop", isHero: true },
    { who: "O Certinho", action: "Call 7.2bb", street: "Flop", isHero: false },
    { who: "Você", action: "Aposta 10.5bb", street: "Turn", isHero: true },
    { who: "O Certinho", action: "Call 10.5bb", street: "Turn", isHero: false },
    { who: "Você", action: "All-in", street: "River", isHero: true },
    { who: "O Certinho", action: "Call 9.8bb", street: "River", isHero: false },
  ],
};

describe("narrativa do card de mão", () => {
  it("identifica a 3-bet real e não chama a mão de abertura", () => {
    const story = buildHandStory(sampleData);
    expect(story[0].read).toContain("3-bet");
    expect(story[0].read).not.toContain("mão de abertura");
  });

  it("distingue overpair no flop de dois pares nas streets finais", () => {
    const story = buildHandStory(sampleData);
    expect(story[1].read.toLowerCase()).toContain("overpair de reis");
    expect(story[2].read.toLowerCase()).toContain("dois pares, reis e cincos");
    expect(story[3].read.toLowerCase()).toContain("dois pares, reis e cincos");
  });

  it("rotula a leitura do vilão como didática e mantém a ação real", () => {
    const narrative = buildHandNarrative(sampleData);
    expect(narrative[1].villain).toContain("Leitura didática:");
    expect(narrative[3].villain).toContain("Leitura didática:");
    expect(narrative[3].hero).toContain("All-in");
  });
});

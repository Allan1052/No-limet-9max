import { describe, it, expect } from "vitest";
import { classifyCardSpot } from "./seriesGen";
import { parseHand, type HandLabSpec } from "../train/stage";

function spec(o: Partial<HandLabSpec>): HandLabSpec {
  return { heroPosition: "BB", villainPosition: "BTN", situation: "vsallin", stage: "inicio", stackBB: 15, hand: parseHand("As7s")!, ...o };
}

describe("classificador de card — separa 4 fases de decisão única", () => {
  it("A7s 15bb vs all-in FLIPA e é curto → card de 4 fases", () => {
    const c = classifyCardSpot(spec({}));
    expect(c.kind).toBe("fases");
    expect(c.flips).toBe(true);
  });

  it("KQo BTN 200bb vs abertura NÃO cabe nas fases (fundo) → decisão única", () => {
    const c = classifyCardSpot(spec({ heroPosition: "BTN", villainPosition: "CO", situation: "vsopen", stackBB: 200, hand: parseHand("KsQh")! }));
    expect(c.kind).toBe("unica");
    expect(c.shortEnough).toBe(false);
  });

  it("mão que não muda entre as fases (mesma decisão) → decisão única, mesmo curta", () => {
    // AA vs all-in paga em qualquer fase — não há flip.
    const c = classifyCardSpot(spec({ hand: parseHand("AsAh")!, stackBB: 15 }));
    expect(c.decisions.every((d) => d === c.decisions[0])).toBe(true);
    expect(c.kind).toBe("unica");
  });
});

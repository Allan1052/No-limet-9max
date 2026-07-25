import { describe, it, expect } from "vitest";
import { encodeChallenge, decodeChallenge } from "./challenge";
import { cardsFromString } from "../engine/cards";
import type { ScenarioSpec } from "../train/scenarios";

describe("desafie um amigo — link", () => {
  it("codifica e decodifica um spot de defesa do BB", () => {
    const spec: ScenarioSpec = {
      heroPosition: "BB",
      effectiveBB: 40,
      raiserPosition: "CO",
      openSizeBB: 2.3,
    };
    const hand = cardsFromString("AsTd");
    const code = encodeChallenge(spec, hand);
    expect(typeof code).toBe("string");
    expect(code.length).toBeGreaterThan(0);

    const back = decodeChallenge(code);
    expect(back).toBeTruthy();
    expect(back!.spec.heroPosition).toBe("BB");
    expect(back!.spec.effectiveBB).toBe(40);
    expect(back!.spec.raiserPosition).toBe("CO");
    // Recalcula a recomendação e oferece ações jogáveis.
    expect(back!.advice.kind).toBe("preflop");
    expect(back!.actions.length).toBeGreaterThanOrEqual(2);
  });

  it("código inválido não quebra (devolve null)", () => {
    expect(decodeChallenge("xxx-lixo-!!!")).toBeNull();
  });
});

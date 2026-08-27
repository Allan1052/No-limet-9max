import { describe, it, expect } from "vitest";
import { analyzeHand, parseHand } from "../train/stage";

// Bug pego pelo Allan (card da Manus): KQo no BTN contra a abertura do CO saía
// FOLD na bolha/mesa final — em qualquer stack, até 200bb. Causa: o ICM apertava
// o range de FLAT (pagar um raise) com a mesma força de um all-in, e um flat
// premium caía fora. Um call de um raise é barato (dá pra foldar depois), então
// o ICM quase não deve mexer nele. O ICM CHEIO fica nos all-ins (caminho
// separado, requiredEquityToCall) — esse continua flipando como deve.
describe("ICM não folda flats premium (só aperta all-in de verdade)", () => {
  it("KQo no BTN vs abertura do CO paga em TODAS as fases (nunca fold por ICM)", () => {
    for (const stackBB of [200, 40, 20]) {
      for (const stage of ["inicio", "meio", "bolha", "mesa_final"] as const) {
        const a = analyzeHand({ heroPosition: "BTN", villainPosition: "CO", situation: "vsopen", stage, stackBB, hand: parseHand("KsQh")! });
        expect(a.recommended, `KQo ${stackBB}bb ${stage}`).not.toBe("fold");
      }
    }
  });

  it("mas o all-in AINDA flipa por ICM — A7s paga no chip-EV e folda no late", () => {
    const meio = analyzeHand({ heroPosition: "BB", villainPosition: "BTN", situation: "vsallin", stage: "meio", stackBB: 15, hand: parseHand("As7s")! });
    const late = analyzeHand({ heroPosition: "BB", villainPosition: "BTN", situation: "vsallin", stage: "mesa_final", stackBB: 15, hand: parseHand("As7s")! });
    expect(meio.recommended).toBe("call");
    expect(late.recommended).toBe("fold");
  });
});

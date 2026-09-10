import { describe, it, expect } from "vitest";
import { parseHandBlock } from "./handHistory";
import { analyzePreflopSteps } from "./analyzePreflopSteps";

// Pedido do Allan: "o motor me recomenda raise, o vilão dá re-raise e a dica não
// atualiza". Antes o app avaliava só a PRIMEIRA decisão pré-flop do herói.
const ABRE_E_LEVA_3BET = `PokerStars Hand #1: Tournament #1, $10+$1 USD Hold'em No Limit - Level V (30/60) - 2024/01/15 20:14:33 ET
Table '1 5' 9-max Seat #6 is the button
Seat 1: Alice (6000 in chips)
Seat 2: Bob (6000 in chips)
Seat 3: Carol (6000 in chips)
Seat 4: Dave (6000 in chips)
Seat 5: Hero (6000 in chips)
Seat 6: Frank (6000 in chips)
Alice: posts small blind 30
Bob: posts big blind 60
*** HOLE CARDS ***
Dealt to Hero [Ad Js]
Carol: folds
Dave: folds
Hero: raises 90 to 150
Frank: raises 330 to 480
Alice: folds
Bob: folds
Hero: folds
Uncalled bet (330) returned to Frank
Frank collected 330 from pot
*** SUMMARY ***
Total pot 330 | Rake 0
Seat 6: Frank collected (330)`;

describe("dica pré-flop por DECISÃO", () => {
  it("avalia a abertura E a decisão depois do 3-bet", () => {
    const hand = parseHandBlock(ABRE_E_LEVA_3BET);
    expect(hand).not.toBeNull();
    const steps = analyzePreflopSteps(hand!);
    // duas decisões voluntárias do herói: abrir e responder ao 3-bet
    expect(steps.length).toBe(2);
    expect(steps[0].actionIdx).toBeLessThan(steps[1].actionIdx);
    // a primeira é a abertura; a segunda já sabe que levou re-raise
    expect(steps[0].feedback.advice.toLowerCase()).toContain("raise");
    expect(steps[1].feedback.heroAction?.toLowerCase()).toContain("fold");
  });

  it("cada passo carrega o índice da ação (para o replay achar o veredito)", () => {
    const hand = parseHandBlock(ABRE_E_LEVA_3BET)!;
    for (const s of analyzePreflopSteps(hand)) {
      expect(hand.actions[s.actionIdx].player).toBe(hand.heroName ?? "Hero");
    }
  });
});

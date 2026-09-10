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

// --- pós-flop por decisão (mesma ideia, na mesma rua) ---
import { analyzePostflopSteps } from "./analyzePostflop";

const APOSTA_E_LEVA_RAISE = `PokerStars Hand #2: Tournament #1, $10+$1 USD Hold'em No Limit - Level V (30/60) - 2024/01/15 20:14:33 ET
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
Dealt to Hero [Ah Kd]
Carol: folds
Dave: folds
Hero: raises 90 to 150
Frank: calls 150
Alice: folds
Bob: folds
*** FLOP *** [Ks 7h 2c]
Hero: bets 200
Frank: raises 500 to 700
Hero: calls 500
*** TURN *** [Ks 7h 2c] [3d]
Hero: checks
Frank: checks
*** RIVER *** [Ks 7h 2c 3d] [9s]
Hero: checks
Frank: checks
*** SUMMARY ***
Total pot 1760 | Rake 0
Board [Ks 7h 2c 3d 9s]
Seat 5: Hero collected (1760)`;

describe("dica pós-flop por DECISÃO", () => {
  it("avalia a aposta E a resposta ao raise, na MESMA rua", () => {
    const hand = parseHandBlock(APOSTA_E_LEVA_RAISE);
    expect(hand).not.toBeNull();
    const steps = analyzePostflopSteps(hand!);
    const flop = steps.filter((s) => s.street === "flop");
    expect(flop.length).toBe(2);                       // apostar e depois pagar
    expect(flop[0].actionIdx).toBeLessThan(flop[1].actionIdx);
    // heroAction chega humanizado pelo gradeDecision ("Aposta" / "Paga").
    expect(flop[0].feedback.heroAction?.toLowerCase()).toContain("aposta");
    expect(flop[1].feedback.heroAction?.toLowerCase()).toMatch(/pag|call/);
  });

  it("cada decisão pós-flop aponta para uma ação do herói", () => {
    const hand = parseHandBlock(APOSTA_E_LEVA_RAISE)!;
    for (const s of analyzePostflopSteps(hand)) {
      expect(hand.actions[s.actionIdx].player).toBe(hand.heroName ?? "Hero");
    }
  });
});

import { describe, it, expect } from "vitest";
import { parseHandHistory } from "./handHistory";
import { analyzeSession, analyzeHand } from "./analyzeSession";

// AA no BB dando 3-bet contra abertura — jogada de valor óbvia.
const AA_3BET = `Poker Hand #TM1: Tournament #22, $5+$0.50 Hold'em No Limit - Level3(50/100) - 2024/02/20 18:00:00
Table '22 1' 9-max Seat #1 is the button
Seat 1: Villain (5000 in chips)
Seat 2: SBp (5000 in chips)
Seat 3: Hero (5000 in chips)
SBp: posts small blind 50
Hero: posts big blind 100
*** HOLE CARDS ***
Dealt to Hero [As Ac]
Villain: raises 130 to 230
SBp: folds
Hero: raises 470 to 700
Villain: calls 470
*** FLOP *** [2d 7c Jh]
Hero: bets 500
Villain: folds
Uncalled bet (500) returned to Hero
Hero collected 1900 from pot
*** SUMMARY ***
Total pot 1900`;

// 72o aberto de UTG — abertura solta clássica.
const TRASH_OPEN = `PokerStars Hand #2: Tournament #33, $10+$1 USD Hold'em No Limit - Level II (50/100) - 2024/01/15 20:14:33 ET
Table '33 5' 9-max Seat #9 is the button
Seat 1: Hero (10000 in chips)
Seat 2: B (10000 in chips)
Seat 3: C (10000 in chips)
Seat 4: D (10000 in chips)
Seat 5: E (10000 in chips)
Seat 6: F (10000 in chips)
Seat 7: G (10000 in chips)
Seat 8: SBx (10000 in chips)
Seat 9: BTNx (10000 in chips)
SBx: posts small blind 50
BTNx: posts big blind 100
*** HOLE CARDS ***
Dealt to Hero [7d 2c]
Hero: raises 100 to 200
B: folds
C: folds
D: folds
E: folds
F: folds
G: folds
SBx: folds
BTNx: folds
Uncalled bet (100) returned to Hero
Hero collected 250 from pot
*** SUMMARY ***
Total pot 250`;

describe("analyzeHand", () => {
  it("aprova o 3-bet de AA", () => {
    const [h] = parseHandHistory(AA_3BET);
    const r = analyzeHand(h);
    expect(r.heroCardsText).toBe("AsAc");
    expect(r.feedback).toBeTruthy();
    expect(r.feedback!.rating).toBe("boa");
    expect(r.pfr).toBe(true);
    expect(r.vpip).toBe(true);
  });

  it("critica a abertura de 72o em UTG", () => {
    const [h] = parseHandHistory(TRASH_OPEN);
    const r = analyzeHand(h);
    expect(r.heroCardsText).toBe("7d2c");
    // Herói na primeira posição (9 jogadores) abrindo lixo → não é "boa".
    expect(r.feedback).toBeTruthy();
    expect(r.feedback!.rating).not.toBe("boa");
  });
});

describe("analyzeSession", () => {
  it("agrega VPIP/PFR e gera vazamentos", () => {
    const hands = parseHandHistory(AA_3BET + "\n\n" + TRASH_OPEN);
    const report = analyzeSession(hands);
    expect(report.totalHands).toBe(2);
    expect(report.evaluated).toBeGreaterThanOrEqual(2);
    expect(report.pfr).toBeGreaterThan(0);
    expect(report.leaks.length).toBeGreaterThan(0);
  });
});

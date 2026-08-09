import { describe, expect, it } from "vitest";
import { GameController } from "./gameController";
import { anatomyFromDecisions } from "../tournament/anatomy";

describe("anatomia: decisions expostas pelo tournamentSummary", () => {
  it("as decisions do herói alimentam a anatomia e as contagens batem", () => {
    const gc = new GameController({ smallBlind: 25, bigBlind: 50, startingStack: 3000 });
    gc.configureTournament({ buyIn: 11, entrants: 100, stage: "inicio" as const, handsPerLevel: 10 });
    gc.newHand();
    // Alterna: ação do herói quando é a vez dele, botStep no resto, e reinicia
    // a mão quando ela acaba.
    for (let i = 0; i < 8; i++) {
      if (gc.isHeroTurn()) {
        const la = gc.legal();
        if (la.canFold) gc.heroAct({ type: "fold" });
      } else {
        gc.botStep();
      }
      if (gc.phase === "handOver") gc.newHand();
    }
    const summary = gc.tournamentSummary();
    expect(summary).not.toBeNull();
    const decisions = summary!.decisions ?? [];
    expect(decisions.length).toBeGreaterThan(0);
    const anatomy = anatomyFromDecisions(decisions);
    expect(anatomy.counts.total).toBe(decisions.length);
    // Todas as decisions registradas são ações reconhecidas da anatomia.
    expect(
      decisions.every((d) =>
        ["fold", "call", "check", "raise", "bet", "jam", "allin"].includes(d.heroAction),
      ),
    ).toBe(true);
  });
});

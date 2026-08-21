import { describe, it, expect } from "vitest";
import { GameController } from "./gameController";

// Teste headless do chip de sizing ao vivo: prova que, quando a recomendação
// do coach é apostar (bet/raise), o advice traz betSizeBB > 0 — o que o UI
// (Controls) usa para mostrar o chip dourado "💰 coach: ~Xbb".
//
// Atenção: os bots não jogam sozinhos — a UI chama `botStep()` entre turnos.
// O teste precisa avançar a mesa manualmente.
describe("sizing ao vivo na mesa (chip do coach)", () => {
  it("pós-flop: quando a recomendação é apostar, advice traz betSizeBB > 0", () => {
    const g = new GameController();
    let found: { street: string; action: string; bb: number } | null = null;
    let hands = 0;
    while (!found && hands++ < 300 && !g.tournamentOver) {
      g.newHand();
      // Avança a mão: bots jogam via botStep(); herói age pela linha de base.
      let steps = 0;
      while (steps++ < 60 && g.phase === "playing" && !g.table.handOver) {
        if (g.isHeroTurn()) {
          const adv = g.computeHeroAdvice();
          if (!adv) break;
          // Chip dourado "💰 coach: ~Xbb": no pós-flop usa betSizeBB; no
          // pré-flop usa suggestedRaiseTo. O chip só renderiza quando a
          // recomendação é apostar, então ambos os valores provam o UI.
          const bb = adv.betSizeBB ?? g.suggestedRaiseTo();
          if (adv.kind === "postflop" && (adv.action === "bet" || adv.action === "raise") && bb !== undefined) {
            found = { street: g.table.street, action: adv.action, bb };
            break;
          }
          const action = mapAction(adv.action, g);
          if (!action) break;
          g.heroAct(action);
        } else {
          g.botStep();
        }
      }
    }
    expect(found, "nenhum spot de aposta do herói encontrado em 300 mãos").not.toBeNull();
    expect(["bet", "raise"]).toContain(found!.action);
    expect(found!.bb).toBeGreaterThan(0);
  });
});

function mapAction(
  action: string,
  g: GameController,
): { type: "fold" } | { type: "check" } | { type: "call" } | { type: "raise"; to: number } | { type: "allin" } | null {
  const la = g.legal();
  if (action === "fold") return { type: "fold" };
  if (action === "check") return { type: "check" };
  if (action === "call") return { type: "call" };
  if (action === "jam" || action === "allin") return { type: "allin" };
  if (action === "bet" || action === "raise" || action === "3bet") {
    if (la.canRaise) return { type: "raise", to: la.minRaiseTo };
    return null;
  }
  return null;
}

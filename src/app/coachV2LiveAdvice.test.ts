import { describe, expect, it } from "vitest";
import { GameController } from "./gameController";
import { seededRng } from "../engine/cards";

describe("Coach V2 ao vivo", () => {
  it("expõe uma decisão estruturada somente na vez do herói", () => {
    const g = new GameController({ rng: seededRng(20260830) });
    g.newHand();
    let guard = 0;
    while (!g.isHeroTurn() && g.phase === "playing" && guard++ < 30) g.botStep();

    expect(g.isHeroTurn()).toBe(true);
    const coach = g.computeHeroCoachDecision();
    expect(coach).not.toBeNull();
    expect(coach!.street).toBe(g.table.street);
    expect(coach!.action).toBeTruthy();
    expect(coach!.contextLabel.length).toBeGreaterThan(3);

    const action = coach!.action;
    const la = g.legal();
    if (action === "fold") g.heroAct({ type: "fold" });
    else if (action === "check") g.heroAct({ type: "check" });
    else if (action === "call") g.heroAct({ type: "call" });
    else if (action === "jam" || action === "allin") g.heroAct({ type: "allin" });
    else if (la.canRaise) g.heroAct({ type: "raise", to: la.minRaiseTo });

    expect(g.computeHeroCoachDecision()).toBeNull();
  });

  it("carrega preço e pote do estado atual quando há aposta para pagar", () => {
    const g = new GameController({ rng: seededRng(20260831) });
    let found = null as ReturnType<GameController["computeHeroCoachDecision"]>;
    let hands = 0;
    while (!found && hands++ < 100) {
      g.newHand();
      let guard = 0;
      while (g.phase === "playing" && !g.table.handOver && guard++ < 50) {
        if (g.isHeroTurn()) {
          const la = g.legal();
          const coach = g.computeHeroCoachDecision();
          if (coach && la.callAmount > 0) {
            found = coach;
            expect(coach.toCallBB).toBeGreaterThan(0);
            expect(coach.potBB).toBeGreaterThan(0);
            break;
          }
          if (!coach) break;
          if (coach.action === "fold") g.heroAct({ type: "fold" });
          else if (coach.action === "check") g.heroAct({ type: "check" });
          else if (coach.action === "call") g.heroAct({ type: "call" });
          else if (coach.action === "jam" || coach.action === "allin") g.heroAct({ type: "allin" });
          else if (la.canRaise) g.heroAct({ type: "raise", to: la.minRaiseTo });
          else break;
        } else g.botStep();
      }
    }
    expect(found, "nenhuma decisão enfrentando aposta foi encontrada").not.toBeNull();
  });
});

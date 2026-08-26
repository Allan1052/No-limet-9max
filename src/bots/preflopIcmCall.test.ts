import { describe, it, expect } from "vitest";
import { createTable } from "../game/engine";
import type { TableState } from "../game/state";
import { cardsFromString } from "../engine/cards";
import { BASELINE_PROFILE } from "./profiles";
import { preflopContextFor } from "./preflopBot";
import { preflopDecision } from "../ranges/preflop";
import { payoutLadder, prizePool, tablePayouts } from "../tournament/structure";

// Reconstrói o bug do Allan (mesa final, imagem 6): QQ no BTN com 14.8bb
// enfrentando um all-in curto de 8.8bb, com SB e BB ainda VIVOS atrás (só
// postaram o blind). O motor contava SB/BB como oponentes no showdown
// (numContesting=3), a equity multiway de QQ caía a ~46% e ele MANDAVA FOLDAR
// um par premium pagando 8.8bb — o que nenhum profissional faz. O confronto é
// heads-up contra o shover: numContesting tem que ser 1 e a decisão, CALL.
function bttnVsShoveWithLiveBlinds(): TableState {
  const bb = 1200;
  const sb = 600;
  const ante = 150;
  const seats = Array.from({ length: 9 }, (_, i) => ({ name: `P${i}`, stack: 100000, isHero: i === 0 }));
  const t = createTable({ smallBlind: sb, bigBlind: bb, ante }, seats, /*button*/ 0);
  // Zera o estado inicial e recria o spot manualmente.
  for (const p of t.players) {
    p.committed = 0;
    p.totalCommitted = 0;
    p.acted = true;
    p.status = "folded";
    p.holeCards = cardsFromString("2c3d"); // irrelevante p/ os que foldaram
  }
  const set = (seat: number, patch: Partial<TableState["players"][number]>) => Object.assign(t.players[seat], patch);
  // Hero BTN (seat 0): QQ, 14.8bb atrás, ainda vai agir.
  set(0, { status: "active", acted: false, stack: Math.round(14.8 * bb), committed: 0, totalCommitted: 0, holeCards: cardsFromString("QsQh") });
  // SB (seat 1): só postou 0.5bb, VIVO atrás do BTN.
  set(1, { status: "active", acted: false, stack: Math.round(6.5 * bb) - sb, committed: sb, totalCommitted: sb });
  // BB (seat 2): só postou 1bb, VIVO atrás do BTN.
  set(2, { status: "active", acted: false, stack: Math.round(8.1 * bb) - bb, committed: bb, totalCommitted: bb });
  // Shover (seat 5): all-in de 8.8bb.
  const shove = Math.round(8.8 * bb);
  set(5, { status: "allin", acted: true, stack: 0, committed: shove, totalCommitted: shove });

  t.street = "preflop";
  t.currentBet = shove;
  t.preflopRaises = 1; // open-shove
  t.lastAggressor = 5;
  t.preflopAggressor = 5;
  t.toAct = 0;
  t.handOver = false;
  return t;
}

describe("preflop ICM — call de all-in premium (bug QQ do Allan)", () => {
  const pool = prizePool(9, 1000);
  const payouts = tablePayouts("final", payoutLadder(9, pool))!;

  it("QQ no BTN paga o all-in curto — SB/BB vivos atrás NÃO contam como oponentes", () => {
    const t = bttnVsShoveWithLiveBlinds();
    const ctx = preflopContextFor(t, 0, BASELINE_PROFILE, { payouts });
    // O confronto é heads-up contra o shover.
    expect(ctx.numContesting).toBe(1);
    const d = preflopDecision(ctx);
    expect(d.action).toBe("call");
  });

  it("QQ ainda paga mesmo SEM ICM (chip-EV puro)", () => {
    const t = bttnVsShoveWithLiveBlinds();
    const ctx = preflopContextFor(t, 0, BASELINE_PROFILE); // sem payouts
    expect(ctx.numContesting).toBe(1);
    expect(preflopDecision(ctx).action).toBe("call");
  });
});

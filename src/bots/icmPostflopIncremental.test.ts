import { describe, expect, it } from "vitest";
import { icmStatesFromSpot, requiredEquityForDecision, requiredEquityToCall, type IcmSpot } from "../ranges/icm";
import { cardsFromString } from "../engine/cards";
import { createTable } from "../game/engine";
import type { TableState } from "../game/state";
import { postflopContextFor } from "./postflopBot";
import { BASELINE_PROFILE } from "./profiles";

// Fecha o achado nº 1 no PÓS-FLOP: um all-in pós-flop com o herói pot-committed
// passa a usar o ICM incremental (foldar-agora × pagar-agora), não o legado.
// No pós-flop os stacks do spot JÁ incluem o committed (convenção true).

function spot(): IcmSpot {
  // Stacks incluem o committed (como o buildPostflopIcmSpot monta).
  return { stacks: [20, 45, 40, 8], payouts: [50, 30, 20, 0], hero: 0, villain: 1, chips: 20 };
}

describe("icmStatesFromSpot — convenções e equivalência", () => {
  it("com 0 investido é idêntico ao legado nas DUAS convenções", () => {
    const s = spot();
    const legacy = requiredEquityToCall(s);
    const preflopConv = requiredEquityForDecision(icmStatesFromSpot(s, 0, false));
    const postflopConv = requiredEquityForDecision(icmStatesFromSpot(s, 0, true));
    expect(preflopConv).toBeCloseTo(legacy, 6);
    expect(postflopConv).toBeCloseTo(legacy, 6);
  });

  it("pós-flop (stacks incluem committed): tira o investido do herói no estado de fold", () => {
    const s = spot();
    const st = icmStatesFromSpot(s, 6, true);
    expect(st.foldStacks[0]).toBe(20 - 6); // herói perde o investido
    expect(st.foldStacks[1]).toBe(45 + 6); // vai pro vilão
  });

  it("mais committed ⇒ menos equity exigida (pot-committed), monotônico", () => {
    const s = spot();
    let prev = Infinity;
    for (const c of [0, 3, 6, 10]) {
      const req = requiredEquityForDecision(icmStatesFromSpot(s, c, true));
      expect(req).toBeLessThanOrEqual(prev + 1e-9);
      prev = req;
    }
  });
});

function postflopCommittedTable(): TableState {
  const bb = 1000;
  const t = createTable(
    { smallBlind: 500, bigBlind: bb, ante: 0 },
    Array.from({ length: 9 }, (_, i) => ({ name: `P${i}`, stack: 50000, isHero: i === 4 })),
    0,
  );
  for (const p of t.players) {
    p.status = "out"; p.stack = 0; p.committed = 0; p.totalCommitted = 0; p.acted = true;
    p.holeCards = cardsFromString("2c3d");
  }
  const set = (seat: number, patch: Partial<TableState["players"][number]>) =>
    Object.assign(t.players[seat], patch);
  // Herói investiu 9bb nas ruas anteriores e agora enfrenta um shove no flop.
  set(4, { status: "active", stack: 14000, committed: 0, totalCommitted: 9000, acted: false, holeCards: cardsFromString("AhKh") });
  set(7, { status: "active", stack: 0, committed: 14000, totalCommitted: 23000, acted: true });
  set(2, { status: "active", stack: 30000, committed: 0, totalCommitted: 9000, acted: true });
  t.street = "flop"; t.board = cardsFromString("2h7dKs"); t.currentBet = 14000;
  t.lastAggressor = 7; t.toAct = 4; t.handOver = false;
  return t;
}

describe("ICM incremental pós-flop — committed flui do postflopBot", () => {
  it("o herói pot-committed leva as 9bb investidas pro contexto pós-flop", () => {
    const ctx = postflopContextFor(postflopCommittedTable(), 4, BASELINE_PROFILE, Math.random, undefined, [100, 60, 40, 20]);
    expect(ctx.heroCommittedBB).toBeCloseTo(9, 6);
  });
});

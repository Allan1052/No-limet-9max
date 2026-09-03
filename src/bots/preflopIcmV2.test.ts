import { describe, expect, it } from "vitest";
import { createTable } from "../game/engine";
import { cardsFromString } from "../engine/cards";
import type { TableState } from "../game/state";
import { BASELINE_PROFILE } from "./profiles";
import { preflopContextFor } from "./preflopBot";
import { icmStatesFromSpot } from "../ranges/icm";

function makeSpot(shortUnrelatedBB: number): TableState {
  const bb = 1000;
  const t = createTable(
    { smallBlind: 500, bigBlind: bb, ante: 0 },
    Array.from({ length: 9 }, (_, i) => ({ name: `P${i}`, stack: 50000, isHero: i === 4 })),
    0,
  );

  for (const p of t.players) {
    p.status = "out";
    p.stack = 0;
    p.committed = 0;
    p.totalCommitted = 0;
    p.acted = true;
    p.holeCards = cardsFromString("2c3d");
  }

  const set = (seat: number, patch: Partial<TableState["players"][number]>) =>
    Object.assign(t.players[seat], patch);

  set(4, {
    status: "active",
    stack: 23000,
    committed: 7000,
    totalCommitted: 7000,
    acted: false,
    holeCards: cardsFromString("AhQh"),
  });

  set(7, {
    status: "active",
    stack: 28000,
    committed: 12000,
    totalCommitted: 12000,
    acted: true,
  });

  set(1, {
    status: "active",
    stack: shortUnrelatedBB * bb,
    committed: 0,
    totalCommitted: 0,
    acted: true,
  });

  set(2, {
    status: "active",
    stack: 25000,
    committed: 0,
    totalCommitted: 0,
    acted: true,
  });

  t.street = "preflop";
  t.currentBet = 12000;
  t.preflopRaises = 2;
  t.lastAggressor = 7;
  t.preflopAggressor = 7;
  t.toAct = 4;
  t.handOver = false;
  return t;
}

describe("Motor V2 — integração ICM real no preflopBot", () => {
  const payouts = [100, 60, 40, 20];

  it("mapeia o último agressor real dentro da lista filtrada", () => {
    const ctx = preflopContextFor(makeSpot(2), 4, BASELINE_PROFILE, { payouts });
    expect(ctx.icmSpot).toBeTruthy();
    expect(ctx.icmSpot?.hero).toBe(2);
    expect(ctx.icmSpot?.villain).toBe(3);
  });

  it("usa o risco Hero-vilão, não o menor stack global", () => {
    const tiny = preflopContextFor(makeSpot(2), 4, BASELINE_PROFILE, { payouts });
    const normal = preflopContextFor(makeSpot(12), 4, BASELINE_PROFILE, { payouts });
    expect(tiny.icmSpot?.chips).toBe(normal.icmSpot?.chips);
    expect(tiny.icmSpot?.chips).toBeGreaterThan(2);
  });

  it("stacks do ICM vêm em BB e TOTAIS (atrás + committed): herói 30bb", () => {
    // Herói: 23000 atrás + 7000 committed = 30000 fichas = 30bb (bb=1000).
    const ctx = preflopContextFor(makeSpot(2), 4, BASELINE_PROFILE, { payouts });
    expect(ctx.icmSpot).toBeTruthy();
    expect(ctx.icmSpot?.stacks[ctx.icmSpot!.hero]).toBeCloseTo(30, 6);
  });

  it("no estado de FOLD o herói não recupera as 7bb investidas (custo afundado)", () => {
    // O total (30bb) alimenta ganhar/perder; ao FOLDAR o herói fica só com as
    // fichas atrás (23bb) — o committed vira custo afundado, descontado em BB.
    const ctx = preflopContextFor(makeSpot(2), 4, BASELINE_PROFILE, { payouts });
    const committedBB = ctx.heroCommittedBB ?? 0;
    expect(committedBB).toBeCloseTo(7, 6);
    const states = icmStatesFromSpot(ctx.icmSpot!, committedBB, true);
    expect(states.foldStacks[ctx.icmSpot!.hero]).toBeCloseTo(23, 6);
  });
});

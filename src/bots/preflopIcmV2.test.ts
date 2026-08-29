import { describe, expect, it } from "vitest";
import { createTable } from "../game/engine";
import { cardsFromString } from "../engine/cards";
import type { TableState } from "../game/state";
import { BASELINE_PROFILE } from "./profiles";
import { preflopContextFor } from "./preflopBot";

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

  // Hero tem 23bb atrás e já investiu 7bb nesta mão.
  set(4, {
    status: "active",
    stack: 23000,
    committed: 7000,
    totalCommitted: 7000,
    acted: false,
    holeCards: cardsFromString("AhQh"),
  });

  // Vilão real: seat 7, cobre o Hero e fez a última agressão para 12bb.
  set(7, {
    status: "active",
    stack: 28000,
    committed: 12000,
    totalCommitted: 12000,
    acted: true,
  });

  // Short alheio à disputa: não pode virar o "stack efetivo" do confronto.
  set(1, {
    status: "active",
    stack: shortUnrelatedBB * bb,
    committed: 0,
    totalCommitted: 0,
    acted: true,
  });

  // Outro jogador vivo para manter contexto de ICM multi-player.
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
    // filtered seats = [1,2,4,7], então Hero=2 e vilão seat 7 => índice 3.
    expect(ctx.icmSpot?.hero).toBe(2);
    expect(ctx.icmSpot?.villain).toBe(3);
  });

  it("usa o risco Hero-vilão, não o menor stack global", () => {
    const tiny = preflopContextFor(makeSpot(2), 4, BASELINE_PROFILE, { payouts });
    const normal = preflopContextFor(makeSpot(12), 4, BASELINE_PROFILE, { payouts });
    expect(tiny.icmSpot?.chips).toBe(normal.icmSpot?.chips);
    expect(tiny.icmSpot?.chips).toBeGreaterThan(2);
  });

  it("não devolve ao Hero as 7bb já investidas ao reconstruir o estado ICM", () => {
    const ctx = preflopContextFor(makeSpot(2), 4, BASELINE_PROFILE, { payouts });
    expect(ctx.icmSpot).toBeTruthy();
    // O stack de fold deve partir das 23bb que ainda estão atrás, não de 30bb.
    expect(ctx.icmSpot?.stacks[ctx.icmSpot!.hero]).toBe(23000);
  });
});

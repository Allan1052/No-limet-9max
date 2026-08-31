import { describe, expect, it } from "vitest";
import { facingAllinDecision } from "../ranges/facingAllin";
import { requiredEquityToCall, type IcmSpot } from "../ranges/icm";
import { cardsFromString, seededRng } from "../engine/cards";
import { createTable } from "../game/engine";
import type { TableState } from "../game/state";
import { BASELINE_PROFILE } from "./profiles";
import { preflopContextFor } from "./preflopBot";

// Liga o ICM INCREMENTAL (achado nº 1 da auditoria: caso KQs) no fluxo real de
// decisão. Antes a função existia mas só era exercitada por benchmark; agora
// facingAllinDecision usa foldar-agora × pagar-agora do ponto atual, com o que o
// herói JÁ investiu como custo afundado.

// Spot de bolha onde o ICM domina o preço cru (4 vivos, 3 pagam).
function bubbleSpot(): IcmSpot {
  return { stacks: [12, 40, 40, 8], payouts: [50, 30, 20, 0], hero: 0, villain: 1, chips: 12 };
}

const baseInput = () => ({
  hero: cardsFromString("Ah7d"),
  betLevelFaced: 1,
  numContesting: 1,
  contestablePotBB: 30,
  callBB: 12,
  effectiveBB: 12,
  raiserPosition: "BTN" as const,
  icmSpot: bubbleSpot(),
  iterations: 1500,
});

describe("ICM incremental — ligado no facingAllinDecision", () => {
  it("com 0 investido é IDÊNTICO ao modelo legado (nenhuma decisão existente muda)", () => {
    const spot = bubbleSpot();
    const legacy = requiredEquityToCall(spot);
    const r = facingAllinDecision({ ...baseInput(), heroCommittedBB: 0, rng: seededRng(1) });
    // O preço exibido é o max(pot odds, ICM); aqui o ICM domina, então bate com o legado.
    expect(r.requiredEquity).toBeCloseTo(legacy, 6);
  });

  it("quanto MAIS o herói já investiu, MENOS equity extra o ICM exige (pot-committed)", () => {
    const nada = facingAllinDecision({ ...baseInput(), heroCommittedBB: 0, rng: seededRng(2) });
    const pouco = facingAllinDecision({ ...baseInput(), heroCommittedBB: 4, rng: seededRng(2) });
    const muito = facingAllinDecision({ ...baseInput(), heroCommittedBB: 9, rng: seededRng(2) });
    expect(pouco.requiredEquity).toBeLessThan(nada.requiredEquity);
    expect(muito.requiredEquity).toBeLessThan(pouco.requiredEquity);
  });

  it("investimento nunca AUMENTA a exigência de ICM (monotônico pra baixo)", () => {
    let prev = Infinity;
    for (const c of [0, 2, 4, 6, 8, 10]) {
      const r = facingAllinDecision({ ...baseInput(), heroCommittedBB: c, rng: seededRng(3) });
      expect(r.requiredEquity).toBeLessThanOrEqual(prev + 1e-9);
      prev = r.requiredEquity;
    }
  });
});

// --- Integração real pelo preflopBot: o committed da mesa chega no contexto. ---
function committedTable(): TableState {
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
  // Herói abriu e 3-betou (7bb investidos) e agora enfrenta o shove do seat 7.
  set(4, { status: "active", stack: 23000, committed: 7000, totalCommitted: 7000, acted: false, holeCards: cardsFromString("KhQh") });
  set(7, { status: "active", stack: 28000, committed: 12000, totalCommitted: 12000, acted: true });
  set(2, { status: "active", stack: 25000, committed: 0, totalCommitted: 0, acted: true });
  t.street = "preflop"; t.currentBet = 12000; t.preflopRaises = 2;
  t.lastAggressor = 7; t.preflopAggressor = 7; t.toAct = 4; t.handOver = false;
  return t;
}

describe("ICM incremental — committed real flui do preflopBot", () => {
  it("o herói pot-committed leva as 7bb investidas pro contexto (heroCommittedBB)", () => {
    const ctx = preflopContextFor(committedTable(), 4, BASELINE_PROFILE, { payouts: [100, 60, 40, 20] });
    expect(ctx.heroCommittedBB).toBeCloseTo(7, 6);
  });
});

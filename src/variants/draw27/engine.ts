// ---------------------------------------------------------------------------
// 2-7 Triple Draw — variante isolada.
//
// Regras:
// - 2 a 6 jogadores, 5 cartas fechadas cada
// - LOWBALL 2-7: melhor mão é 7-5-4-3-2 NÃO naipado
// - Ace é SEMPRE ALTO (ruim)
// - Straights e Flushes contam CONTRA
// - Avaliação: ordenar 5 cartas do MENOR para o MAIOR, comparar como número
//   base 15 (menor = melhor). Penalizar straight/flush com offset gigante.
// - 4 rodadas de aposta com 3 descartes entre elas
// - Blinds: small/big (não sobem — draw é cash-style)
// - Bots: descartam cartas altas (>= 8), mantêm baixas (<= 7)
//
// DEV-UNLOCK: localStorage "draw27_dev_unlock" === "true"
// ---------------------------------------------------------------------------

import {
  type Card,
  rankOf,
  suitOf,
} from "../../engine/cards";
import { freshShuffledDeck as gameFreshDeck } from "../../game/engine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Draw27Phase =
  | "deal"
  | "bet1"
  | "draw1"
  | "bet2"
  | "draw2"
  | "bet3"
  | "draw3"
  | "bet4"
  | "showdown";

export interface Draw27Seat {
  name: string;
  stack: number;
  cards: Card[]; // always 5
  folded: boolean;
  committed: number; // committed this street
  totalBet: number; // total this hand
}

export interface Draw27State {
  seats: Draw27Seat[];
  deck: Card[];
  rng: () => number;
  phase: Draw27Phase;
  actingSeat: number;
  pot: number;
  sb: number;
  bb: number;
  roundBet: number;
  minRaise: number;
  handOver: boolean;
  result: {
    winnerSeat: number;
    pot: number;
    winnerValue: number;
  } | null;
  seed?: number;
}

export interface Draw27Config {
  numSeats: number;
  sb: number;
  bb: number;
  startingStack: number;
  seed?: number;
}

export const DEFAULT_DRAW27_CONFIG: Draw27Config = {
  numSeats: 4,
  sb: 10,
  bb: 20,
  startingStack: 1000,
};

// ---------------------------------------------------------------------------
// Card utilities (2-7 specific)
// ---------------------------------------------------------------------------

/** In 2-7, Ace is ALWAYS HIGH (bad). */
export function draw27Rank(c: Card): number {
  const r = rankOf(c);
  return r <= 1 ? 14 : r;
}

export function draw27Suit(c: Card): number {
  return suitOf(c);
}

// ---------------------------------------------------------------------------
// Hand evaluator: 2-7 Triple Draw LOWBALL
// ---------------------------------------------------------------------------

function isStraight27(ranks: number[]): boolean {
  if (ranks.length !== 5) return false;
  const sorted = [...ranks].sort((a, b) => a - b);
  // Regular straight
  if (
    sorted[4] - sorted[0] === 4 &&
    sorted[1] - sorted[0] === 1 &&
    sorted[2] - sorted[0] === 2 &&
    sorted[3] - sorted[0] === 3
  ) {
    return true;
  }
  // Wheel: A-2-3-4-5 (in 2-7, this is a straight and counts AGAINST)
  if (sorted[0] === 2 && sorted[1] === 3 && sorted[2] === 4 && sorted[3] === 5 && sorted[4] === 14) {
    return true;
  }
  return false;
}

/**
 * Evaluates a 5-card hand for 2-7 lowball.
 * Lower value = better hand.
 * Ace is always high (14). Straights and flushes are penalized.
 */
export function eval27Hand(cards: Card[]): number {
  if (cards.length !== 5) return Infinity;

  const ranks = cards.map(draw27Rank).sort((a, b) => a - b);
  const suits = cards.map(draw27Suit);

  const straight = isStraight27(ranks);
  const flush = suits.every((s) => s === suits[0]);

  // Base value: encode sorted ranks as base-15 number (lower = better)
  let value = 0;
  for (const r of ranks) {
    value = value * 15 + r;
  }

  // Penalize straights and flushes
  if (straight || flush) {
    value += 1000000000;
  }

  return value;
}

// ---------------------------------------------------------------------------
// Seeded RNG
// ---------------------------------------------------------------------------

function seededRng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ---------------------------------------------------------------------------
// State creation
// ---------------------------------------------------------------------------

export function createDraw27Table(cfg: Partial<Draw27Config> = {}): Draw27State {
  const config: Draw27Config = { ...DEFAULT_DRAW27_CONFIG, ...cfg };
  const seed = config.seed ?? Math.floor(Math.random() * 2147483647);
  const rng = seededRng(seed);
  const deck = gameFreshDeck(rng);

  const seats: Draw27Seat[] = [];
  for (let i = 0; i < config.numSeats; i++) {
    seats.push({
      name: `Bot${i}`,
      stack: config.startingStack,
      cards: [],
      folded: false,
      committed: 0,
      totalBet: 0,
    });
  }

  // Post blinds
  const sbSeat = 0;
  const bbSeat = 1 % config.numSeats;

  // SB posts small blind
  const sbPay = Math.min(config.sb, seats[sbSeat].stack);
  seats[sbSeat].stack -= sbPay;
  seats[sbSeat].committed = sbPay;
  seats[sbSeat].totalBet = sbPay;

  // BB posts big blind
  const bbPay = Math.min(config.bb, seats[bbSeat].stack);
  seats[bbSeat].stack -= bbPay;
  seats[bbSeat].committed = bbPay;
  seats[bbSeat].totalBet = bbPay;

  const pot = sbPay + bbPay;

  // Deal 5 cards to each
  for (let i = 0; i < config.numSeats; i++) {
    for (let j = 0; j < 5; j++) {
      seats[i].cards.push(deck.pop()!);
    }
  }

  return {
    seats,
    deck,
    rng,
    phase: "bet1",
    actingSeat: 2 % config.numSeats,
    pot,
    sb: config.sb,
    bb: config.bb,
    roundBet: config.bb,
    minRaise: config.bb,
    handOver: false,
    result: null,
    seed,
  };
}

// ---------------------------------------------------------------------------
// Action helpers
// ---------------------------------------------------------------------------

function countActive(state: Draw27State): number {
  return state.seats.filter((s) => !s.folded).length;
}

function nextActiveSeat(state: Draw27State, from: number): number {
  const n = state.seats.length;
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n;
    if (!state.seats[idx].folded) return idx;
  }
  return from;
}

function resetStreetBets(state: Draw27State): void {
  for (const seat of state.seats) {
    seat.committed = 0;
  }
}

function firstToAct(state: Draw27State): number {
  return nextActiveSeat(state, 1); // BB position + 1
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function draw27LegalActions(state: Draw27State): string[] {
  if (state.handOver || state.phase === "showdown") return [];
  const seat = state.seats[state.actingSeat];
  const toCall = Math.max(0, state.roundBet - seat.committed);
  const canCall = seat.stack >= toCall;
  const canRaise =
    seat.stack > toCall &&
    seat.stack >= state.roundBet + state.minRaise;

  const actions: string[] = ["fold"];
  if (canCall) actions.push("call");
  if (canRaise) actions.push("raise");
  return actions;
}

export function draw27ApplyAction(
  state: Draw27State,
  action: "fold" | "call" | "raise",
): boolean {
  if (state.handOver) return false;
  const seat = state.seats[state.actingSeat];
  const toCall = Math.max(0, state.roundBet - seat.committed);

  switch (action) {
    case "fold": {
      seat.folded = true;
      break;
    }
    case "call": {
      const pay = Math.min(toCall, seat.stack);
      seat.stack -= pay;
      seat.committed += pay;
      seat.totalBet += pay;
      state.pot += pay;
      break;
    }
    case "raise": {
      const raiseTo = state.roundBet + state.minRaise;
      const pay = Math.min(raiseTo - seat.committed, seat.stack);
      seat.stack -= pay;
      seat.committed += pay;
      seat.totalBet += pay;
      state.pot += pay;
      state.roundBet = seat.committed;
      // Reset everyone else
      for (let i = 0; i < state.seats.length; i++) {
        if (i !== state.actingSeat) {
          state.seats[i].committed = 0;
        }
      }
      break;
    }
    default:
      return false;
  }

  // Check if only one player left
  if (countActive(state) <= 1) {
    state.handOver = true;
    state.phase = "showdown";
    resolveDraw27Showdown(state);
    return true;
  }

  // Move to next seat
  const next = nextActiveSeat(state, state.actingSeat);
  // If we've circled back to firstToAct and everyone matched
  if (next === firstToAct(state)) {
    advanceDraw27Phase(state);
    return true;
  }

  state.actingSeat = next;
  return true;
}

// ---------------------------------------------------------------------------
// Phase advancement
// ---------------------------------------------------------------------------

function advanceDraw27Phase(state: Draw27State): void {
  const streetOrder: Draw27Phase[] = [
    "bet1", "draw1", "bet2", "draw2", "bet3", "draw3", "bet4", "showdown",
  ];
  const currentIdx = streetOrder.indexOf(state.phase);
  if (currentIdx < 0 || currentIdx >= streetOrder.length - 1) {
    state.handOver = true;
    state.phase = "showdown";
    resolveDraw27Showdown(state);
    return;
  }

  const nextPhase = streetOrder[currentIdx + 1];
  state.phase = nextPhase;

  if (nextPhase.startsWith("draw")) {
    resetStreetBets(state);
    state.roundBet = 0;
    state.minRaise = state.bb;
    state.actingSeat = firstToAct(state);
  } else if (nextPhase.startsWith("bet")) {
    resetStreetBets(state);
    state.roundBet = 0;
    state.minRaise = state.bb;
    state.actingSeat = firstToAct(state);
  } else if (nextPhase === "showdown") {
    state.handOver = true;
    resolveDraw27Showdown(state);
  }
}

// ---------------------------------------------------------------------------
// Discard
// ---------------------------------------------------------------------------

export function draw27Discard(
  state: Draw27State,
  seatIdx: number,
  indices: number[],
): void {
  if (state.handOver) return;
  const seat = state.seats[seatIdx];
  if (seat.folded) return;

  const kept = seat.cards.filter((_, i) => !indices.includes(i));
  while (kept.length < 5 && state.deck.length > 0) {
    kept.push(state.deck.pop()!);
  }
  seat.cards = kept;
}

// ---------------------------------------------------------------------------
// Showdown
// ---------------------------------------------------------------------------

function resolveDraw27Showdown(state: Draw27State): void {
  const active = state.seats
    .map((s, i) => ({ seat: s, idx: i }))
    .filter((x) => !x.seat.folded);

  if (active.length === 1) {
    state.result = {
      winnerSeat: active[0].idx,
      pot: state.pot,
      winnerValue: 0,
    };
    state.seats[active[0].idx].stack += state.pot;
    return;
  }

  const hands = active.map((x) => ({
    idx: x.idx,
    value: eval27Hand(x.seat.cards),
  }));

  // Sort ascending — lower is better in 2-7
  hands.sort((a, b) => a.value - b.value);

  const winner = hands[0];
  state.seats[winner.idx].stack += state.pot;

  state.result = {
    winnerSeat: winner.idx,
    pot: state.pot,
    winnerValue: winner.value,
  };
}

// ---------------------------------------------------------------------------
// Bot AI (BETA)
// ---------------------------------------------------------------------------

export function draw27BotDiscard(cards: Card[]): number[] {
  const discards: number[] = [];
  for (let i = 0; i < cards.length; i++) {
    if (draw27Rank(cards[i]) >= 8) {
      discards.push(i);
    }
  }
  // Don't discard all 5 — keep at least 1
  if (discards.length >= 5) {
    let lowestIdx = 0;
    let lowestRank = draw27Rank(cards[0]);
    for (let i = 1; i < cards.length; i++) {
      const r = draw27Rank(cards[i]);
      if (r < lowestRank) {
        lowestRank = r;
        lowestIdx = i;
      }
    }
    return discards.filter((i) => i !== lowestIdx);
  }
  return discards;
}

export function draw27BotBetDecision(
  state: Draw27State,
  seatIdx: number,
): "fold" | "call" | "raise" {
  const seat = state.seats[seatIdx];
  const toCall = Math.max(0, state.roundBet - seat.committed);

  const ranks = seat.cards.map(draw27Rank).sort((a, b) => a - b);
  const highCard = ranks[4];

  let strength = 0;
  if (highCard <= 7) strength = 0.8;
  else if (highCard <= 9) strength = 0.5;
  else strength = 0.2;

  const canCall = seat.stack >= toCall;
  const canRaise =
    canCall &&
    seat.stack > toCall &&
    seat.stack >= state.roundBet + state.minRaise;

  if (strength >= 0.8 && canRaise && state.rng() > 0.4) {
    return "raise";
  }
  if (strength >= 0.5 || toCall === 0) {
    return "call";
  }
  if (toCall > 0 && strength < 0.3) {
    return "fold";
  }
  return "call";
}

export function draw27BotStep(state: Draw27State): void {
  if (state.handOver) return;
  const seat = state.seats[state.actingSeat];
  if (seat.folded) return;

  if (state.phase.startsWith("draw")) {
    const discards = draw27BotDiscard(seat.cards);
    draw27Discard(state, state.actingSeat, discards);
    const next = nextActiveSeat(state, state.actingSeat);
    if (next === firstToAct(state)) {
      advanceDraw27Phase(state);
    } else {
      state.actingSeat = next;
    }
    return;
  }

  const action = draw27BotBetDecision(state, state.actingSeat);
  draw27ApplyAction(state, action);
}

// ---------------------------------------------------------------------------
// Full hand simulation
// ---------------------------------------------------------------------------

export function draw27SimulateHand(cfg: Partial<Draw27Config> = {}): Draw27State {
  const state = createDraw27Table(cfg);
  let steps = 0;
  const maxSteps = 500;

  while (!state.handOver && steps < maxSteps) {
    draw27BotStep(state);
    steps++;
  }

  return state;
}

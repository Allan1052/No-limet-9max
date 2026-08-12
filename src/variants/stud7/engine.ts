/**
 * 7-Card Stud — engine completo
 * Sem cartas comunitárias. 2 down + 1 up (3rd street), bring-in,
 * ruas 4th-7th, melhor 5 de 7 vence.
 *
 * DEV-UNLOCK: localStorage "stud_dev_unlock" === "true"
 */

import {
  type Card,
  rankOf,
  suitOf,
  cardFromString,
} from "../../engine/cards";
import { evaluate, categoryOf } from "../../engine/evaluator";
import { freshShuffledDeck as gameFreshDeck } from "../../game/engine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StudPhase =
  | "deal3"
  | "bringIn"
  | "bet3"
  | "bet4"
  | "bet5"
  | "bet6"
  | "bet7"
  | "showdown";

export interface StudSeat {
  name: string;
  stack: number;
  cards: Card[]; // up to 7: [down1, down2, up1, up2, up3, up4, down3]
  folded: boolean;
  totalBet: number; // total bet this hand
}

export interface StudAction {
  seatIdx: number;
  action: "fold" | "call" | "raise";
  amount?: number;
}

export interface StudResult {
  winnerSeat: number;
  pot: number;
  winnerValue: number;
  allValues: number[];
}

export interface StudConfig {
  numSeats: number;
  ante: number;
  bringIn: number;
  smallBet: number;
  bigBet: number; // doubles on 6th/7th
  startingStack: number;
  seed?: number;
}

export const DEFAULT_STUD_CONFIG: StudConfig = {
  numSeats: 6,
  ante: 1,
  bringIn: 2,
  smallBet: 10,
  bigBet: 20,
  startingStack: 1000,
};

// ---------------------------------------------------------------------------
// Card utilities
// ---------------------------------------------------------------------------

export function cardRank(c: Card): number {
  return rankOf(c) <= 1 ? 14 : rankOf(c);
}

export function cardSuit(c: Card): number {
  return suitOf(c);
}

// ---------------------------------------------------------------------------
// Hand evaluator: best 5 of 7
// ---------------------------------------------------------------------------

/**
 * Returns the best 5-card hand from 7 cards by trying all C(7,5)=21 combos.
 * Uses the shared evaluate() from the main evaluator.
 */
export function bestFiveOfSeven(cards: Card[]): number {
  const n = cards.length;
  if (n < 5) {
    // Fallback: pad with 2♠ (should never happen in valid game)
    const padded = [...cards];
    while (padded.length < 5) {
      padded.push(cardFromString("2s")!);
    }
    return evaluate(padded);
  }
  let best = -1;
  for (let a = 0; a < n - 4; a++) {
    for (let b = a + 1; b < n - 3; b++) {
      for (let cIdx = b + 1; cIdx < n - 2; cIdx++) {
        for (let d = cIdx + 1; d < n - 1; d++) {
          for (let e = d + 1; e < n; e++) {
            const combo = [cards[a], cards[b], cards[cIdx], cards[d], cards[e]];
            const v = evaluate(combo);
            if (v > best) best = v;
          }
        }
      }
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// State creation
// ---------------------------------------------------------------------------

export interface Stud7State {
  seats: StudSeat[];
  deck: Card[];
  rng: () => number;
  phase: StudPhase;
  actingSeat: number;
  pot: number;
  bringInSeat: number;
  firstToAct: number;
  currentBet: number;
  minRaise: number;
  roundBet: number;
  handOver: boolean;
  result: StudResult | null;
  street: number;
}

function seededRng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function createStud7Table(cfg: Partial<StudConfig> = {}): Stud7State {
  const config: StudConfig = { ...DEFAULT_STUD_CONFIG, ...cfg };
  const rng = seededRng(config.seed ?? Math.floor(Math.random() * 2147483647));
  const deck = gameFreshDeck(rng);

  const seats: StudSeat[] = [];
  for (let i = 0; i < config.numSeats; i++) {
    seats.push({
      name: `Bot${i}`,
      stack: config.startingStack,
      cards: [],
      folded: false,
      totalBet: 0,
    });
  }

  // Ante
  for (let i = 0; i < config.numSeats; i++) {
    const a = Math.min(config.ante, seats[i].stack);
    seats[i].stack -= a;
    seats[i].totalBet += a;
  }

  // Deal 2 down + 1 up to each
  for (let i = 0; i < config.numSeats; i++) {
    seats[i].cards.push(deck.pop()!, deck.pop()!, deck.pop()!);
  }

  // Find bring-in: lowest upcard (3rd card)
  let bringInSeat = 0;
  for (let i = 1; i < config.numSeats; i++) {
    const curRank = cardRank(seats[bringInSeat].cards[2]);
    const newRank = cardRank(seats[i].cards[2]);
    if (newRank < curRank || (newRank === curRank && i < bringInSeat)) {
      bringInSeat = i;
    }
  }

  // In 7-card stud, suits break ties for bring-in: ♣ < ♦ < ♥ < ♠
  let lowestBringIn = bringInSeat;
  for (let i = 0; i < config.numSeats; i++) {
    if (i === bringInSeat) continue;
    const curRank = cardRank(seats[lowestBringIn].cards[2]);
    const newRank = cardRank(seats[i].cards[2]);
    if (newRank < curRank) {
      lowestBringIn = i;
    } else if (newRank === curRank) {
      const suitOrder = [0, 1, 2, 3]; // c < d < h < s
      const curSuit = cardSuit(seats[lowestBringIn].cards[2]);
      const newSuit = cardSuit(seats[i].cards[2]);
      if (suitOrder.indexOf(newSuit) < suitOrder.indexOf(curSuit)) {
        lowestBringIn = i;
      }
    }
  }
  bringInSeat = lowestBringIn;

  // Bring-in player pays the bring-in
  const bi = Math.min(config.bringIn, seats[bringInSeat].stack);
  seats[bringInSeat].stack -= bi;
  seats[bringInSeat].totalBet += bi;

  const state: Stud7State = {
    seats,
    deck,
    rng,
    phase: "bet3",
    actingSeat: bringInSeat,
    pot: config.numSeats * config.ante + bi,
    bringInSeat,
    firstToAct: bringInSeat,
    currentBet: config.bringIn,
    minRaise: config.smallBet,
    roundBet: config.bringIn,
    handOver: false,
    result: null,
    street: 3,
  };

  return state;
}

// ---------------------------------------------------------------------------
// Street progression
// ---------------------------------------------------------------------------

function countActive(state: Stud7State): number {
  return state.seats.filter((s) => !s.folded).length;
}

function nextActiveSeat(state: Stud7State, from: number): number {
  const n = state.seats.length;
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n;
    if (!state.seats[idx].folded) return idx;
  }
  return from;
}

function firstToActStreet(state: Stud7State): number {
  // On 4th+ street, the player with the best visible hand acts first.
  // Simple rule: highest pair visible, or highest card if no pair.
  const n = state.seats.length;
  let bestSeat = -1;
  let bestRank = -1;
  let bestPair = false;

  for (let i = 0; i < n; i++) {
    if (state.seats[i].folded) continue;
    const upcards = state.seats[i].cards.filter((_, idx) => idx >= 2);
    let maxCard = -1;
    let hasPair = false;
    const ranks = upcards.map(cardRank);

    for (let a = 0; a < ranks.length; a++) {
      for (let b = a + 1; b < ranks.length; b++) {
        if (ranks[a] === ranks[b]) {
          hasPair = true;
          maxCard = Math.max(maxCard, ranks[a]);
        }
      }
    }
    if (!hasPair) {
      maxCard = Math.max(...ranks);
    }

    if (
      bestSeat === -1 ||
      (hasPair && !bestPair) ||
      (hasPair && bestPair && maxCard > bestRank) ||
      (!hasPair && !bestPair && maxCard > bestRank) ||
      (maxCard === bestRank && i < bestSeat)
    ) {
      bestSeat = i;
      bestRank = maxCard;
      bestPair = hasPair;
    }
  }
  return bestSeat >= 0 ? bestSeat : 0;
}

function advancePhase(state: Stud7State): void {
  const cfg = DEFAULT_STUD_CONFIG;
  const n = state.seats.length;

  // Reset totalBet per seat for new street
  for (let i = 0; i < n; i++) {
    state.seats[i].totalBet = 0;
  }

  const street = state.street;
  const isLateStreet = street >= 6;
  const betSize = isLateStreet ? cfg.bigBet : cfg.smallBet;

  if (street < 7) {
    // Deal one upcard
    state.street = street + 1;
    for (let i = 0; i < n; i++) {
      if (!state.seats[i].folded && state.deck.length > 0) {
        state.seats[i].cards.push(state.deck.pop()!);
      }
    }
    // Bet phase name
    const phaseMap: Record<number, StudPhase> = {
      4: "bet4",
      5: "bet5",
      6: "bet6",
      7: "bet7",
    };
    state.phase = phaseMap[street + 1] ?? "bet4";
    state.currentBet = betSize;
    state.minRaise = betSize;
    state.roundBet = betSize;
    state.firstToAct = firstToActStreet(state);
    state.actingSeat = state.firstToAct;
  } else {
    // After 7th street betting → showdown
    state.phase = "showdown";
    state.handOver = true;
    resolveShowdown(state);
  }
}

function resolveShowdown(state: Stud7State): void {
  const active = state.seats
    .map((s, i) => ({ seat: s, idx: i }))
    .filter((x) => !x.seat.folded);

  if (active.length === 1) {
    state.result = {
      winnerSeat: active[0].idx,
      pot: state.pot,
      winnerValue: 0,
      allValues: [],
    };
    state.seats[active[0].idx].stack += state.pot;
    return;
  }

  // Evaluate best 5 of 7 for each
  const hands = active.map((x) => ({
    idx: x.idx,
    value: bestFiveOfSeven(x.seat.cards),
  }));

  // Sort descending by hand strength
  hands.sort((a, b) => b.value - a.value);

  const winner = hands[0];
  state.seats[winner.idx].stack += state.pot;

  state.result = {
    winnerSeat: winner.idx,
    pot: state.pot,
    winnerValue: winner.value,
    allValues: hands.map((h) => h.value),
  };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function stud7LegalActions(state: Stud7State): string[] {
  if (state.handOver || state.phase === "showdown") return [];
  const seat = state.seats[state.actingSeat];
  const toCall = Math.max(0, state.roundBet - seat.totalBet);
  const canCall = seat.stack >= toCall;
  const canRaise =
    seat.stack > toCall &&
    seat.stack >= state.roundBet + state.minRaise;
  const actions: string[] = ["fold"];
  if (canCall) actions.push("call");
  if (canRaise) actions.push("raise");
  return actions;
}

export function stud7ApplyAction(
  state: Stud7State,
  action: "fold" | "call" | "raise",
): boolean {
  if (state.handOver) return false;
  const seat = state.seats[state.actingSeat];
  const toCall = Math.max(0, state.roundBet - seat.totalBet);

  switch (action) {
    case "fold": {
      seat.folded = true;
      break;
    }
    case "call": {
      const pay = Math.min(toCall, seat.stack);
      seat.stack -= pay;
      seat.totalBet += pay;
      state.pot += pay;
      break;
    }
    case "raise": {
      const raiseTo = state.roundBet + state.minRaise;
      const pay = Math.min(raiseTo - seat.totalBet, seat.stack);
      seat.stack -= pay;
      seat.totalBet += pay;
      state.pot += pay;
      state.roundBet = seat.totalBet;
      // Reset everyone else to need to act again
      for (let i = 0; i < state.seats.length; i++) {
        if (i !== state.actingSeat) {
          state.seats[i].totalBet = 0;
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
    resolveShowdown(state);
    return true;
  }

  // Move to next seat
  const next = nextActiveSeat(state, state.actingSeat);
  // If we've circled back to firstToAct and everyone has matched the bet
  if (next === state.firstToAct) {
    // Phase complete — advance to next street
    advancePhase(state);
    return true;
  }

  state.actingSeat = next;
  return true;
}

// ---------------------------------------------------------------------------
// Bot AI (BETA)
// ---------------------------------------------------------------------------

export function stud7BotAction(state: Stud7State, seatIdx: number): StudAction {
  const seat = state.seats[seatIdx];
  const upcards = seat.cards.filter((_, i) => i >= 2);
  const ranks = upcards.map(cardRank);
  const hasPair = new Set(ranks).size < ranks.length;
  const maxUp = Math.max(...ranks);

  // Estimate hand strength
  let strength = 0;
  if (hasPair) strength = 0.6;
  if (maxUp >= 11) strength = Math.max(strength, 0.4);
  if (seat.cards.length >= 5) {
    const best = categoryOf(bestFiveOfSeven(seat.cards));
    if (best >= 3) strength = 0.8; // trips+
    else if (best === 2) strength = 0.7; // two pair
  }

  const toCall = Math.max(0, state.roundBet - seat.totalBet);
  const potOdds = toCall / (state.pot + toCall + state.roundBet);

  const canCall = seat.stack >= toCall;
  const canRaise =
    canCall &&
    seat.stack > toCall &&
    seat.stack >= state.roundBet + state.minRaise;

  if (strength < 0.2 && toCall > 0 && !canRaise) {
    return { seatIdx, action: "fold" };
  }
  if (strength >= 0.6 && canRaise && state.rng() > 0.5) {
    return { seatIdx, action: "raise" };
  }
  if (strength >= 0.3 || toCall === 0) {
    return { seatIdx, action: "call" };
  }
  if (potOdds < 0.15 && toCall > 0) {
    return { seatIdx, action: "fold" };
  }
  return { seatIdx, action: "call" };
}

export function stud7BotStep(state: Stud7State): StudAction | null {
  if (state.handOver) return null;
  const seat = state.seats[state.actingSeat];
  if (seat.folded) return null;
  return stud7BotAction(state, state.actingSeat);
}

// ---------------------------------------------------------------------------
// Full hand simulation (for testing)
// ---------------------------------------------------------------------------

export function stud7SimulateHand(cfg: Partial<StudConfig> = {}): Stud7State {
  const state = createStud7Table(cfg);
  let steps = 0;
  const maxSteps = 500;

  while (!state.handOver && steps < maxSteps) {
    const action = stud7BotStep(state);
    if (!action) break;
    stud7ApplyAction(state, action.action);
    steps++;
  }

  return state;
}

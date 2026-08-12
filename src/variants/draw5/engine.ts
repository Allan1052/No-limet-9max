// ---------------------------------------------------------------------------
// 5-Card Draw — variante isolada.
//
// Regras:
// - 2 a 6 jogadores, 5 cartas fechadas cada
// - Blinds: small/big (não sobem — draw é cash-style)
// - Fase 1: abertura (blind), 1 rodada de aposta
// - Fase 2: DESCARTE (cada jogador escolhe 0-5 cartas pra trocar)
// - Fase 3: 2ª rodada de aposta
// - Fase 4: showdown — melhor mão de 5 vence (ranking padrão)
// - Bots: guardam pares+/projetos, trocam o resto
// ---------------------------------------------------------------------------

import { type Card, rankOf, suitOf } from "../../engine/cards";
import { evaluate, categoryOf, CATEGORY_NAMES_PT } from "../../engine/evaluator";
import { freshShuffledDeck as gameFreshDeck } from "../../game/engine";

export type Draw5Phase = "deal" | "bet1" | "draw" | "bet2" | "showdown";

export interface Draw5Seat {
  id: number;
  name: string;
  isBot: boolean;
  cards: Card[];
  stack: number;
  bet: number;
  totalBet: number;
  folded: boolean;
  allIn: boolean;
}

export interface Draw5State {
  seats: Draw5Seat[];
  btn: number;
  phase: Draw5Phase;
  pot: number;
  sb: number;
  bb: number;
  currentBet: number;
  actingSeat: number;
  handOver: boolean;
  result: { winnerSeat: number; handValue: number; categoryName: string } | null;
  deck: Card[];
  roundBets: number[];
}

export interface Draw5Config {
  numSeats: number;
  sb: number;
  bb: number;
  startingStack: number;
}

export const DEFAULT_DRAW5_CONFIG: Draw5Config = {
  numSeats: 4,
  sb: 10,
  bb: 20,
  startingStack: 1000,
};

// ---------------------------------------------------------------------------
// Bots — lógica simples de descarte e aposta
// ---------------------------------------------------------------------------

export interface Draw5BotDecision {
  discardIndices: number[];
  action: "fold" | "call" | "raise" | "check";
  raiseAmount?: number;
}

function countRanks(cards: Card[]): number[] {
  const count = new Array(15).fill(0);
  for (const c of cards) count[rankOf(c)]++;
  return count;
}

/**
 * Decide quais cartas descartar.
 * Estratégia básica:
 * - Guarda: pares, trincas, quadras
 * - Se não tem par: guarda cartas altas (A, K, Q)
 * - Guarda 4 pra flush
 * - Guarda 4 pra straight (consecutivas)
 * - Troca o resto
 */
export function botDiscardDecision(cards: Card[]): number[] {
  const count = countRanks(cards);
  const keep: boolean[] = [false, false, false, false, false];

  // Guarda pares, trincas, quadras
  let hasPairOrBetter = false;
  for (let r = 2; r <= 14; r++) {
    if (count[r] >= 2) {
      hasPairOrBetter = true;
      for (let i = 0; i < 5; i++) {
        if (rankOf(cards[i]) === r) keep[i] = true;
      }
    }
  }

  // Se não tem par: guarda cartas altas
  if (!hasPairOrBetter) {
    for (let i = 0; i < 5; i++) {
      if (rankOf(cards[i]) >= 12) {
        keep[i] = true;
      }
    }
  }

  // Guarda 4 pra flush
  const suitCount = [0, 0, 0, 0];
  for (const c of cards) suitCount[suitOf(c)]++;
  for (let s = 0; s < 4; s++) {
    if (suitCount[s] >= 4) {
      for (let i = 0; i < 5; i++) {
        if (suitOf(cards[i]) === s) keep[i] = true;
      }
    }
  }

  // Retorna índices das cartas a descartar
  const discard: number[] = [];
  for (let i = 0; i < 5; i++) {
    if (!keep[i]) discard.push(i);
  }
  return discard;
}

/**
 * Decide a ação do bot na rodada de aposta.
 * Estratégia básica:
 * - Dois pares+: bet/raise
 * - Um par: call
 * - Fraco: fold se tem custo, check se grátis
 */
export function botBetDecision(
  cards: Card[],
  toCall: number,
  _canCheck: boolean
): Draw5BotDecision {
  const value = evaluate(cards);
  const cat = categoryOf(value);

  if (toCall === 0) {
    if (cat >= 2) {
      return { discardIndices: [], action: "raise", raiseAmount: 40 };
    }
    return { discardIndices: [], action: "check" };
  }

  if (cat >= 2) {
    return { discardIndices: [], action: "raise", raiseAmount: Math.min(toCall * 3, 200) };
  }
  if (cat >= 1) {
    return { discardIndices: [], action: "call" };
  }
  if (toCall <= 20) {
    return { discardIndices: [], action: "call" };
  }
  return { discardIndices: [], action: "fold" };
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export function createDraw5Table(config: Draw5Config = DEFAULT_DRAW5_CONFIG): Draw5State {
  const deck = gameFreshDeck();
  const seats: Draw5Seat[] = [];
  for (let i = 0; i < config.numSeats; i++) {
    const cards: Card[] = [];
    for (let j = 0; j < 5; j++) {
      cards.push(deck.pop()!);
    }
    seats.push({
      id: i,
      name: i === 0 ? "Você" : `Bot ${i}`,
      isBot: i !== 0,
      cards,
      stack: config.startingStack,
      bet: 0,
      totalBet: 0,
      folded: false,
      allIn: false,
    });
  }

  // Blinds — SB no seat 1, BB no seat 2
  const sbIdx = 1 % config.numSeats;
  const bbIdx = 2 % config.numSeats;
  const sbAmt = Math.min(config.sb, seats[sbIdx].stack);
  seats[sbIdx].bet = sbAmt;
  seats[sbIdx].stack -= sbAmt;
  const bbAmt = Math.min(config.bb, seats[bbIdx].stack);
  seats[bbIdx].bet = bbAmt;
  seats[bbIdx].stack -= bbAmt;

  return {
    seats,
    btn: 0,
    phase: "bet1",
    pot: sbAmt + bbAmt,
    sb: config.sb,
    bb: config.bb,
    currentBet: config.bb,
    actingSeat: 3 % config.numSeats,
    handOver: false,
    result: null,
    deck,
    roundBets: new Array(config.numSeats).fill(0),
  };
}

/** Processa o descarte de um jogador (troca cartas do deck). */
export function draw5Discard(state: Draw5State, seatIdx: number, indices: number[]): Draw5State {
  const seat = state.seats[seatIdx];
  const newCards: Card[] = [];
  for (let i = 0; i < 5; i++) {
    if (!indices.includes(i)) {
      newCards.push(seat.cards[i]);
    }
  }
  // Preenche com cartas novas do deck
  while (newCards.length < 5 && state.deck.length > 0) {
    newCards.push(state.deck.pop()!);
  }
  seat.cards = newCards;
  return state;
}

/** Aplica uma ação (fold/call/check/raise) ao jogador ativo. */
export function draw5ApplyAction(
  state: Draw5State,
  action: "fold" | "call" | "check" | "raise",
  raiseAmount: number = 0
): Draw5State {
  const seat = state.seats[state.actingSeat];
  const toCall = state.currentBet - seat.bet;

  switch (action) {
    case "fold":
      seat.folded = true;
      break;
    case "call":
    case "check": {
      const amount = Math.min(toCall, seat.stack);
      seat.bet += amount;
      seat.stack -= amount;
      seat.totalBet += amount;
      state.pot += amount;
      if (seat.stack === 0) seat.allIn = true;
      break;
    }
    case "raise": {
      const targetBet = state.currentBet + raiseAmount;
      const add = Math.min(targetBet - seat.bet, seat.stack);
      seat.bet += add;
      seat.stack -= add;
      seat.totalBet += add;
      state.pot += add;
      state.currentBet = seat.bet;
      if (seat.stack === 0) seat.allIn = true;
      break;
    }
  }

  return state;
}

/** Avança para a próxima fase. */
export function draw5AdvancePhase(state: Draw5State): Draw5State {
  const aliveSeats = state.seats.filter((s) => !s.folded);

  if (aliveSeats.length <= 1) {
    state.handOver = true;
    state.result = {
      winnerSeat: aliveSeats.length === 1 ? aliveSeats[0].id : -1,
      handValue: 0,
      categoryName: aliveSeats.length === 1 ? "Todos foldaram" : "Empate",
    };
    state.pot = 0;
    return state;
  }

  switch (state.phase) {
    case "bet1": {
      state.phase = "draw";
      state.actingSeat = 0;
      for (const s of state.seats) s.bet = 0;
      state.currentBet = 0;
      break;
    }
    case "draw": {
      state.phase = "bet2";
      for (const s of state.seats) s.bet = 0;
      state.currentBet = 0;
      state.actingSeat = 1 % state.seats.length;
      break;
    }
    case "bet2": {
      state.phase = "showdown";
      // Avalia mãos
      let bestValue = -1;
      let winnerSeat = -1;
      let winnerCat = "";
      for (const s of aliveSeats) {
        const v = evaluate(s.cards);
        if (v > bestValue) {
          bestValue = v;
          winnerSeat = s.id;
          const cat = categoryOf(v);
          winnerCat = CATEGORY_NAMES_PT[cat] ?? `Cat ${cat}`;
        }
      }
      state.handOver = true;
      state.result = { winnerSeat, handValue: bestValue, categoryName: winnerCat };
      state.pot = 0;
      break;
    }
  }

  return state;
}

/** Retorna as ações legais para o jogador ativo. */
export function draw5LegalActions(state: Draw5State): string[] {
  if (state.handOver) return [];
  const seat = state.seats[state.actingSeat];
  const toCall = state.currentBet - seat.bet;
  const actions: string[] = [];
  if (toCall > 0) actions.push("fold");
  if (toCall > 0) actions.push("call");
  if (toCall === 0) actions.push("check");
  if (seat.stack > toCall && seat.stack > 0) actions.push("raise");
  return actions;
}

/** Processa um turno do bot (descarte ou aposta). */
export function draw5BotStep(state: Draw5State): Draw5State {
  const seat = state.seats[state.actingSeat];
  if (!seat.isBot || state.handOver) return state;

  if (state.phase === "draw") {
    const discard = botDiscardDecision(seat.cards);
    draw5Discard(state, state.actingSeat, discard);
  } else if (state.phase === "bet1" || state.phase === "bet2") {
    const toCall = state.currentBet - seat.bet;
    const canCheck = toCall === 0;
    const decision = botBetDecision(seat.cards, toCall, canCheck);
    draw5ApplyAction(state, decision.action, decision.raiseAmount ?? 0);
  }

  return state;
}

/**
 * Simula uma mão completa com bots auto-jogando.
 * Retorna o estado final.
 */
export function draw5SimulateHand(config: Draw5Config = DEFAULT_DRAW5_CONFIG): Draw5State {
  const state = createDraw5Table(config);

  // Fase 1: aposta inicial (todos agem como bots na simulação)
  let maxSteps1 = state.seats.length * 3;
  while (state.phase === "bet1" && !state.handOver && maxSteps1-- > 0) {
    const seat = state.seats[state.actingSeat];
    if (seat.folded) {
      state.actingSeat = (state.actingSeat + 1) % state.seats.length;
      continue;
    }
    // Todos agem como bot na simulação (incluindo o hero)
    const toCall = state.currentBet - seat.bet;
    const canCheck = toCall === 0;
    const decision = botBetDecision(seat.cards, toCall, canCheck);
    draw5ApplyAction(state, decision.action, decision.raiseAmount ?? 0);
    state.actingSeat = (state.actingSeat + 1) % state.seats.length;
    const alive = state.seats.filter((s) => !s.folded);
    const allMatched = alive.every((s) => s.bet >= state.currentBet || s.allIn);
    if (allMatched && alive.length > 0) {
      draw5AdvancePhase(state);
    }
  }

  // Fase 2: descarte (todos descartam na simulação)
  if (state.phase === "draw") {
    for (let i = 0; i < state.seats.length; i++) {
      if (!state.seats[i].folded) {
        const discard = botDiscardDecision(state.seats[i].cards);
        draw5Discard(state, i, discard);
      }
    }
    draw5AdvancePhase(state);
  }

  // Fase 3: 2ª aposta (todos agem como bots na simulação)
  let maxSteps2 = state.seats.length * 3;
  while (state.phase === "bet2" && !state.handOver && maxSteps2-- > 0) {
    const seat = state.seats[state.actingSeat];
    if (seat.folded) {
      state.actingSeat = (state.actingSeat + 1) % state.seats.length;
      continue;
    }
    const toCall = state.currentBet - seat.bet;
    const canCheck = toCall === 0;
    const decision = botBetDecision(seat.cards, toCall, canCheck);
    draw5ApplyAction(state, decision.action, decision.raiseAmount ?? 0);
    state.actingSeat = (state.actingSeat + 1) % state.seats.length;
    const alive = state.seats.filter((s) => !s.folded);
    const allMatched = alive.every((s) => s.bet >= state.currentBet || s.allIn);
    if (allMatched && alive.length > 0) {
      draw5AdvancePhase(state);
    }
  }

  return state;
}

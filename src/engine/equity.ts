// ---------------------------------------------------------------------------
// Motor de equity por Monte Carlo.
//
// "Equity" é a fatia do pote que uma mão ganha em média se a mão fosse até o
// showdown. Não existe fórmula fechada prática para isso com ranges, então
// simulamos milhares de runouts aleatórios e contamos quem ganha.
//
// Todas as funções aceitam um RNG injetável para que os testes sejam
// determinísticos (mesma semente → mesmo resultado).
// ---------------------------------------------------------------------------

import { NUM_CARDS, type Card } from "./cards";
import { evaluate } from "./evaluator";

export interface EquityResult {
  /** Equity de cada jogador (0..1). A soma dá ≈ 1. */
  equity: number[];
  /** Fração de vitórias limpas (sem empate) de cada jogador. */
  win: number[];
  /** Fração de empates de cada jogador. */
  tie: number[];
  iterations: number;
}

/** Marca as cartas usadas num vetor booleano de 52 posições. */
function markUsed(used: boolean[], cards: Card[]): void {
  for (const c of cards) used[c] = true;
}

/** Constrói a lista de cartas ainda disponíveis (não usadas). */
function availableFrom(used: boolean[]): Card[] {
  const out: Card[] = [];
  for (let c = 0; c < NUM_CARDS; c++) if (!used[c]) out.push(c);
  return out;
}

/**
 * Sorteia `need` cartas distintas de `available` via Fisher-Yates parcial.
 * Reordena `available` mas mantém todos os elementos, então pode ser reusado
 * na próxima iteração sem realocar o baralho.
 */
function drawInto(available: Card[], need: number, out: Card[], rng: () => number): void {
  const len = available.length;
  for (let k = 0; k < need; k++) {
    const j = k + Math.floor(rng() * (len - k));
    const tmp = available[k];
    available[k] = available[j];
    available[j] = tmp;
    out[k] = available[k];
  }
}

/**
 * Equity all-in entre N mãos fixas (cada uma com 2 cartas) sobre um board
 * parcial (0 a 5 cartas). Completa o board aleatoriamente muitas vezes.
 */
export function equityMultiway(
  hands: Card[][],
  board: Card[],
  iterations: number,
  rng: () => number = Math.random,
): EquityResult {
  const n = hands.length;
  const used = new Array(NUM_CARDS).fill(false);
  for (const h of hands) markUsed(used, h);
  markUsed(used, board);

  const available = availableFrom(used);
  const need = 5 - board.length;

  const win = new Array(n).fill(0);
  const tie = new Array(n).fill(0);
  const equity = new Array(n).fill(0);

  const drawn: Card[] = new Array(need);
  const fullBoard: Card[] = new Array(5);
  for (let i = 0; i < board.length; i++) fullBoard[i] = board[i];

  for (let iter = 0; iter < iterations; iter++) {
    drawInto(available, need, drawn, rng);
    for (let i = 0; i < need; i++) fullBoard[board.length + i] = drawn[i];

    // Guarda quais mãos empatam no melhor valor desta rodada.
    let bestValue = -1;
    const winners: number[] = [];
    for (let i = 0; i < n; i++) {
      const h = hands[i];
      const v = evaluate([h[0], h[1], fullBoard[0], fullBoard[1], fullBoard[2], fullBoard[3], fullBoard[4]]);
      if (v > bestValue) {
        bestValue = v;
        winners.length = 0;
        winners.push(i);
      } else if (v === bestValue) {
        winners.push(i);
      }
    }

    if (winners.length === 1) {
      win[winners[0]]++;
      equity[winners[0]] += 1;
    } else {
      const share = 1 / winners.length;
      for (const w of winners) {
        tie[w]++;
        equity[w] += share;
      }
    }
  }

  for (let i = 0; i < n; i++) {
    win[i] /= iterations;
    tie[i] /= iterations;
    equity[i] /= iterations;
  }
  return { equity, win, tie, iterations };
}

/**
 * Equity de uma mão contra outra mão específica (heads-up all-in).
 * Devolve os números do ponto de vista do herói (primeira mão).
 */
export function equityHandVsHand(
  hero: Card[],
  villain: Card[],
  board: Card[],
  iterations: number,
  rng: () => number = Math.random,
): { equity: number; win: number; tie: number; loss: number } {
  const r = equityMultiway([hero, villain], board, iterations, rng);
  return {
    equity: r.equity[0],
    win: r.win[0],
    tie: r.tie[0],
    loss: 1 - r.win[0] - r.tie[0],
  };
}

/**
 * Equity de uma mão contra um range de vilão. O range é uma lista de combos
 * específicos (cada combo = 2 cartas). A cada iteração sorteamos um combo do
 * range que não conflite com as cartas conhecidas.
 */
export function equityHandVsRange(
  hero: Card[],
  villainRange: Card[][],
  board: Card[],
  iterations: number,
  rng: () => number = Math.random,
): { equity: number; win: number; tie: number; loss: number; sampled: number } {
  const deadBase = new Array(NUM_CARDS).fill(false);
  markUsed(deadBase, hero);
  markUsed(deadBase, board);

  let eq = 0;
  let win = 0;
  let tie = 0;
  let sampled = 0;

  const need = 5 - board.length;
  const drawn: Card[] = new Array(need);
  const fullBoard: Card[] = new Array(5);
  for (let i = 0; i < board.length; i++) fullBoard[i] = board[i];

  for (let iter = 0; iter < iterations; iter++) {
    // Escolhe um combo do range compatível com as cartas conhecidas.
    let villain: Card[] | null = null;
    for (let tries = 0; tries < 8; tries++) {
      const cand = villainRange[Math.floor(rng() * villainRange.length)];
      if (!deadBase[cand[0]] && !deadBase[cand[1]] && cand[0] !== cand[1]) {
        villain = cand;
        break;
      }
    }
    if (!villain) continue; // range praticamente todo bloqueado — pula
    sampled++;

    const used = deadBase.slice();
    used[villain[0]] = true;
    used[villain[1]] = true;
    const available = availableFrom(used);
    drawInto(available, need, drawn, rng);
    for (let i = 0; i < need; i++) fullBoard[board.length + i] = drawn[i];

    const vh = evaluate([hero[0], hero[1], fullBoard[0], fullBoard[1], fullBoard[2], fullBoard[3], fullBoard[4]]);
    const vv = evaluate([villain[0], villain[1], fullBoard[0], fullBoard[1], fullBoard[2], fullBoard[3], fullBoard[4]]);
    if (vh > vv) {
      win++;
      eq += 1;
    } else if (vh === vv) {
      tie++;
      eq += 0.5;
    }
  }

  const denom = sampled || 1;
  return {
    equity: eq / denom,
    win: win / denom,
    tie: tie / denom,
    loss: (sampled - win - tie) / denom,
    sampled,
  };
}

/** Equity de uma mão contra um oponente com mão totalmente aleatória. */
export function equityVsRandom(
  hero: Card[],
  board: Card[],
  iterations: number,
  rng: () => number = Math.random,
): { equity: number; win: number; tie: number; loss: number } {
  const used = new Array(NUM_CARDS).fill(false);
  markUsed(used, hero);
  markUsed(used, board);
  const available = availableFrom(used);

  let eq = 0;
  let win = 0;
  let tie = 0;
  const villain: Card[] = new Array(2);
  const need = 5 - board.length;
  const drawn: Card[] = new Array(need + 2);
  const fullBoard: Card[] = new Array(5);
  for (let i = 0; i < board.length; i++) fullBoard[i] = board[i];

  for (let iter = 0; iter < iterations; iter++) {
    // Sorteia as 2 cartas do vilão + o restante do board de uma vez.
    drawInto(available, need + 2, drawn, rng);
    villain[0] = drawn[0];
    villain[1] = drawn[1];
    for (let i = 0; i < need; i++) fullBoard[board.length + i] = drawn[2 + i];

    const vh = evaluate([hero[0], hero[1], fullBoard[0], fullBoard[1], fullBoard[2], fullBoard[3], fullBoard[4]]);
    const vv = evaluate([villain[0], villain[1], fullBoard[0], fullBoard[1], fullBoard[2], fullBoard[3], fullBoard[4]]);
    if (vh > vv) {
      win++;
      eq += 1;
    } else if (vh === vv) {
      tie++;
      eq += 0.5;
    }
  }

  return {
    equity: eq / iterations,
    win: win / iterations,
    tie: tie / iterations,
    loss: (iterations - win - tie) / iterations,
  };
}

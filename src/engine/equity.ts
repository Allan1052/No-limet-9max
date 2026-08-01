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

import { NUM_CARDS, type Card, cardToString } from "./cards";
import { evaluate } from "./evaluator";
import { evaluateOmahaHand, type HandRanking } from "../game/omahaEvaluator";

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

/**
 * Equity de uma mão contra VÁRIOS oponentes, cada um com uma mão sorteada do
 * mesmo range. A cada iteração sorteamos `numOpp` combos distintos (sem
 * conflito) e o herói só marca a rodada se BATER TODOS — que é a equity
 * multiway correta. Muito melhor que elevar a equity heads-up à potência do
 * número de oponentes (que subestima os projetos, pois um flush que completa
 * ganha de todos ao mesmo tempo).
 */
export function equityHandVsRangeMulti(
  hero: Card[],
  villainRange: Card[][],
  numOpp: number,
  board: Card[],
  iterations: number,
  rng: () => number = Math.random,
): { equity: number; sampled: number } {
  if (numOpp <= 1) {
    const r = equityHandVsRange(hero, villainRange, board, iterations, rng);
    return { equity: r.equity, sampled: r.sampled };
  }
  const deadBase = new Array(NUM_CARDS).fill(false);
  markUsed(deadBase, hero);
  markUsed(deadBase, board);

  const need = 5 - board.length;
  const drawn: Card[] = new Array(need);
  const fullBoard: Card[] = new Array(5);
  for (let i = 0; i < board.length; i++) fullBoard[i] = board[i];

  let eq = 0;
  let sampled = 0;

  for (let iter = 0; iter < iterations; iter++) {
    const used = deadBase.slice();
    const villains: Card[][] = [];
    for (let k = 0; k < numOpp; k++) {
      let picked: Card[] | null = null;
      for (let tries = 0; tries < 12; tries++) {
        const cand = villainRange[Math.floor(rng() * villainRange.length)];
        if (cand[0] !== cand[1] && !used[cand[0]] && !used[cand[1]]) {
          picked = cand;
          break;
        }
      }
      if (!picked) break; // range muito bloqueado neste sorteio
      used[picked[0]] = true;
      used[picked[1]] = true;
      villains.push(picked);
    }
    if (villains.length === 0) continue;
    sampled++;

    const available = availableFrom(used);
    drawInto(available, need, drawn, rng);
    for (let i = 0; i < need; i++) fullBoard[board.length + i] = drawn[i];

    const vh = evaluate([hero[0], hero[1], fullBoard[0], fullBoard[1], fullBoard[2], fullBoard[3], fullBoard[4]]);
    let best = vh;
    let ties = 1; // conta o herói
    let heroBeaten = false;
    for (const v of villains) {
      const vv = evaluate([v[0], v[1], fullBoard[0], fullBoard[1], fullBoard[2], fullBoard[3], fullBoard[4]]);
      if (vv > vh) {
        heroBeaten = true;
        break;
      }
      if (vv === best) ties++;
    }
    if (!heroBeaten) eq += 1 / ties; // ganha (ou divide o pote nos empates)
  }

  return { equity: eq / (sampled || 1), sampled };
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
// =========================================================================
// Equidade Omaha (PLO) — 4 cartas na mão, usa exatamente 2 + 3 do board.
// =========================================================================


/** Compara dois HandRanking do avaliador Omaha (retorna >0 se a > b). */
function compareOmahaRanking(a: HandRanking, b: HandRanking): number {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.max(a.kickers.length, b.kickers.length); i++) {
    const ak = a.kickers[i] ?? 0;
    const bk = b.kickers[i] ?? 0;
    if (ak !== bk) return ak - bk;
  }
  return 0;
}

/**
 * Equity Omaha: herói (4 cartas) vs range de vilão (combos de 4 cartas).
 * Usa Monte Carlo com o avaliador Omaha (2 da mão + 3 do board).
 */
export function equityOmahaHandVsRange(
  hero: Card[],          // 4 cartas do herói
  villainRange: Card[][], // combos de 4 cartas do range do vilão
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
    // Escolhe um combo do range compatível (4 cartas sem conflito).
    let villain: Card[] | null = null;
    for (let tries = 0; tries < 16; tries++) {
      const cand = villainRange[Math.floor(rng() * villainRange.length)];
      if (cand.length !== 4) continue;
      if (!deadBase[cand[0]] && !deadBase[cand[1]] && !deadBase[cand[2]] && !deadBase[cand[3]]) {
        villain = cand;
        break;
      }
    }
    if (!villain) continue;
    sampled++;

    const used = deadBase.slice();
    for (const v of villain) used[v] = true;
    const available = availableFrom(used);
    drawInto(available, need, drawn, rng);
    for (let i = 0; i < need; i++) fullBoard[board.length + i] = drawn[i];

    // Monta as strings para o avaliador Omaha.
    const heroStrs = hero.map(cardToString);
    const villainStrs = villain.map(cardToString);
    const boardStrs = fullBoard.map(cardToString);

    const heroRank = evaluateOmahaHand(heroStrs as any, boardStrs);
    const villainRank = evaluateOmahaHand(villainStrs as any, boardStrs);

    const cmp = compareOmahaRanking(heroRank, villainRank);
    if (cmp > 0) {
      win++;
      eq += 1;
    } else if (cmp === 0) {
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

/**
 * Equity Omaha multiway: herói (4 cartas) vs N vilões (cada um com 4 cartas).
 */
export function equityOmahaMultiway(
  hands: Card[][],      // cada hand tem 4 cartas
  board: Card[],
  iterations: number,
  rng: () => number = Math.random,
): { equity: number; sampled: number } {
  const allUsed = new Set<Card>();
  for (const hand of hands) for (const c of hand) allUsed.add(c);
  for (const c of board) allUsed.add(c);

  let eq = 0;
  let sampled = 0;
  const need = 5 - board.length;
  const fullBoard: Card[] = new Array(5);
  for (let i = 0; i < board.length; i++) fullBoard[i] = board[i];

  const numVillains = hands.length - 1;
  const villainHoles: Card[][] = hands.slice(1).map(() => new Array<Card>(4));

  for (let iter = 0; iter < iterations; iter++) {
    // Cria array de booleanos com as cartas usadas.
    const used = new Array(NUM_CARDS).fill(false);
    for (const c of allUsed) used[c] = true;

    // Sorteia board restante + mãos dos vilões.
    const needCards = need + numVillains * 4;
    const available = availableFrom(used);
    const bigDraw: Card[] = new Array(needCards);
    drawInto(available, needCards, bigDraw, rng);

    // Marca as cartas sorteadas como usadas.
    for (const c of bigDraw) used[c] = true;

    // Distribui board.
    for (let i = 0; i < need; i++) fullBoard[board.length + i] = bigDraw[i];

    // Distribui mãos dos vilões.
    let idx = need;
    for (const vh of villainHoles) {
      for (let j = 0; j < 4; j++) vh[j] = bigDraw[idx++];
    }

    // Avalia.
    const boardStrs = fullBoard.map(cardToString);
    const ranks: HandRanking[] = hands.map((h, hi) => {
      const holeStrs = (hi === 0 ? h : villainHoles[hi - 1]).map(cardToString);
      return evaluateOmahaHand(holeStrs as any, boardStrs);
    });

    const heroRank = ranks[0];
    let heroBeaten = false;
    let ties = 1;
    for (let i = 1; i < ranks.length; i++) {
      const cmp = compareOmahaRanking(heroRank, ranks[i]);
      if (cmp < 0) heroBeaten = true;
      else if (cmp === 0) ties++;
    }
    if (!heroBeaten) eq += 1 / ties;
    sampled++;
  }

  return { equity: eq / (sampled || 1), sampled };
}

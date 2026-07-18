// ---------------------------------------------------------------------------
// Avaliador de mãos.
//
// Recebe de 5 a 7 cartas e devolve um número inteiro comparável: quanto maior,
// melhor a mão. Assim, para saber quem ganha, basta comparar os números.
//
// Codificação do valor (base 15):
//   valor = categoria * 15^5 + t1*15^4 + t2*15^3 + t3*15^2 + t4*15 + t5
// onde `categoria` vai de 0 (carta alta) a 8 (straight flush) e t1..t5 são os
// ranks de desempate (2..14). Como a categoria fica nos "dígitos" mais altos,
// uma categoria melhor sempre vence, e dentro da mesma categoria os desempates
// decidem — exatamente as regras do poker.
// ---------------------------------------------------------------------------

import { rankOf, suitOf, type Card } from "./cards";

export const Category = {
  HighCard: 0,
  Pair: 1,
  TwoPair: 2,
  Trips: 3,
  Straight: 4,
  Flush: 5,
  FullHouse: 6,
  Quads: 7,
  StraightFlush: 8,
} as const;

export const CATEGORY_NAMES_PT = [
  "Carta alta",
  "Par",
  "Dois pares",
  "Trinca",
  "Sequência",
  "Flush",
  "Full house",
  "Quadra",
  "Straight flush",
];

const BASE = 15;

function encode(category: number, tiebreaks: number[]): number {
  let v = category;
  for (let i = 0; i < 5; i++) {
    v = v * BASE + (tiebreaks[i] ?? 0);
  }
  return v;
}

/** Extrai a categoria (0..8) de um valor codificado — útil para o feedback. */
export function categoryOf(value: number): number {
  return Math.floor(value / (BASE * BASE * BASE * BASE * BASE));
}

/**
 * Dado um vetor `present[rank]` (2..14), devolve o rank mais alto que fecha uma
 * sequência de 5, ou 0 se não houver. Trata o Ás-baixo (A-2-3-4-5, a "roda").
 */
function straightHigh(present: boolean[]): number {
  for (let top = 14; top >= 6; top--) {
    if (
      present[top] &&
      present[top - 1] &&
      present[top - 2] &&
      present[top - 3] &&
      present[top - 4]
    ) {
      return top;
    }
  }
  if (present[14] && present[5] && present[4] && present[3] && present[2]) {
    return 5; // a roda: o Ás vale como 1, sequência até o 5
  }
  return 0;
}

/** Os `n` ranks mais altos com pelo menos uma carta, ignorando os `exclude`. */
function bestKickers(rankCount: number[], exclude: number[], n: number): number[] {
  const out: number[] = [];
  for (let r = 14; r >= 2 && out.length < n; r--) {
    if (exclude.includes(r)) continue;
    if (rankCount[r] > 0) out.push(r);
  }
  return out;
}

/**
 * Avalia de 5 a 7 cartas e devolve o valor codificado da melhor mão de 5.
 */
export function evaluate(cards: Card[]): number {
  const rankCount = new Array(15).fill(0);
  const suitCount = [0, 0, 0, 0];
  const suitRankMask = [0, 0, 0, 0]; // bit `r` ligado se o rank r existe no naipe

  for (const c of cards) {
    const r = rankOf(c);
    const s = suitOf(c);
    rankCount[r]++;
    suitCount[s]++;
    suitRankMask[s] |= 1 << r;
  }

  // Existe flush? (5+ cartas do mesmo naipe)
  let flushSuit = -1;
  for (let s = 0; s < 4; s++) if (suitCount[s] >= 5) flushSuit = s;

  // Straight flush tem prioridade máxima.
  if (flushSuit >= 0) {
    const present = new Array(15).fill(false);
    const mask = suitRankMask[flushSuit];
    for (let r = 2; r <= 14; r++) if (mask & (1 << r)) present[r] = true;
    const sf = straightHigh(present);
    if (sf) return encode(Category.StraightFlush, [sf]);
  }

  // Agrupa as contagens: quadra, trincas e pares (do maior para o menor).
  let quad = 0;
  const tripsList: number[] = [];
  const pairsList: number[] = [];
  const singles: number[] = [];
  for (let r = 14; r >= 2; r--) {
    const cnt = rankCount[r];
    if (cnt === 4) quad = r;
    else if (cnt === 3) tripsList.push(r);
    else if (cnt === 2) pairsList.push(r);
    else if (cnt === 1) singles.push(r);
  }

  if (quad) {
    const kicker = bestKickers(rankCount, [quad], 1)[0] ?? 0;
    return encode(Category.Quads, [quad, kicker]);
  }

  // Full house: uma trinca + um par (ou duas trincas, usando a menor como par).
  if (tripsList.length >= 1 && (tripsList.length >= 2 || pairsList.length >= 1)) {
    const three = tripsList[0];
    const pair = tripsList.length >= 2 ? tripsList[1] : pairsList[0];
    return encode(Category.FullHouse, [three, pair]);
  }

  if (flushSuit >= 0) {
    const mask = suitRankMask[flushSuit];
    const ranks: number[] = [];
    for (let r = 14; r >= 2 && ranks.length < 5; r--) if (mask & (1 << r)) ranks.push(r);
    return encode(Category.Flush, ranks);
  }

  const present = new Array(15).fill(false);
  for (let r = 2; r <= 14; r++) present[r] = rankCount[r] > 0;
  const st = straightHigh(present);
  if (st) return encode(Category.Straight, [st]);

  if (tripsList.length >= 1) {
    const three = tripsList[0];
    const kickers = bestKickers(rankCount, [three], 2);
    return encode(Category.Trips, [three, ...kickers]);
  }

  if (pairsList.length >= 2) {
    const hi = pairsList[0];
    const lo = pairsList[1];
    const kicker = bestKickers(rankCount, [hi, lo], 1)[0] ?? 0;
    return encode(Category.TwoPair, [hi, lo, kicker]);
  }

  if (pairsList.length === 1) {
    const p = pairsList[0];
    const kickers = bestKickers(rankCount, [p], 3);
    return encode(Category.Pair, [p, ...kickers]);
  }

  return encode(Category.HighCard, singles.slice(0, 5));
}

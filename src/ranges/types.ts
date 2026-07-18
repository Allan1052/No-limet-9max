// ---------------------------------------------------------------------------
// Representação de ranges pré-flop.
//
// Uma "mão inicial" no poker se resume a 169 tipos: 13 pares (AA..22), 78
// suited (AKs..) e 78 offsuit (AKo..). Trabalhamos com a NOTAÇÃO desses tipos
// ("AA", "AKs", "T9o") e sabemos expandir cada um nos combos concretos de
// cartas para o motor de equity.
//
// Um Range é um mapa tipo-de-mão → frequência (0..1): com que frequência a mão
// é jogada daquela forma. Isso permite ranges "mistas" (ex.: 3-betar AQo 50%).
// ---------------------------------------------------------------------------

import { RANKS, makeCard, type Card } from "../engine/cards";

/** Posições em uma mesa 9-max, do início (UTG) ao big blind. */
export const POSITIONS = [
  "UTG",
  "UTG1",
  "MP",
  "LJ",
  "HJ",
  "CO",
  "BTN",
  "SB",
  "BB",
] as const;
export type Position = (typeof POSITIONS)[number];

/** Um range: frequência (0..1) por tipo de mão. Ausente = 0 (não joga). */
export type Range = Record<string, number>;

/** rank 2..14 → letra ("A","K",...,"2"). */
function rankLetter(rank: number): string {
  return RANKS[rank - 2];
}

/** Índice 0..12 na grade (0 = Ás, 12 = dois). Convenção usual das grades 13x13. */
export function gridIndex(rank: number): number {
  return 14 - rank;
}

/** Todos os 169 tipos de mão, em ordem canônica. */
export function allHandTypes(): string[] {
  const out: string[] = [];
  for (let hi = 14; hi >= 2; hi--) {
    // pares
    out.push(rankLetter(hi) + rankLetter(hi));
  }
  for (let hi = 14; hi >= 3; hi--) {
    for (let lo = hi - 1; lo >= 2; lo--) {
      out.push(rankLetter(hi) + rankLetter(lo) + "s");
      out.push(rankLetter(hi) + rankLetter(lo) + "o");
    }
  }
  return out;
}

export function isPair(handType: string): boolean {
  return handType.length === 2;
}
export function isSuited(handType: string): boolean {
  return handType.endsWith("s");
}

/** Ranks (2..14) das duas cartas de um tipo, sempre o maior primeiro. */
export function handTypeRanks(handType: string): [number, number] {
  const hi = 2 + RANKS.indexOf(handType[0]);
  const lo = 2 + RANKS.indexOf(handType[1]);
  return [hi, lo];
}

/** Distância entre as cartas (0 = conectada, ex. 98s tem gap 0). */
export function gap(handType: string): number {
  const [hi, lo] = handTypeRanks(handType);
  return hi - lo - 1;
}

/**
 * Expande um tipo de mão em todos os combos concretos de cartas.
 *  - par      → 6 combos
 *  - suited   → 4 combos
 *  - offsuit  → 12 combos
 */
export function handTypeCombos(handType: string): Card[][] {
  const [hi, lo] = handTypeRanks(handType);
  const out: Card[][] = [];
  if (isPair(handType)) {
    for (let s1 = 0; s1 < 4; s1++) {
      for (let s2 = s1 + 1; s2 < 4; s2++) {
        out.push([makeCard(hi, s1), makeCard(hi, s2)]);
      }
    }
  } else if (isSuited(handType)) {
    for (let s = 0; s < 4; s++) out.push([makeCard(hi, s), makeCard(lo, s)]);
  } else {
    for (let s1 = 0; s1 < 4; s1++) {
      for (let s2 = 0; s2 < 4; s2++) {
        if (s1 !== s2) out.push([makeCard(hi, s1), makeCard(lo, s2)]);
      }
    }
  }
  return out;
}

/** Nº de combos que um tipo representa (par=6, suited=4, offsuit=12). */
export function comboCount(handType: string): number {
  if (isPair(handType)) return 6;
  return isSuited(handType) ? 4 : 12;
}

/** Descobre o tipo canônico ("AA","AKs","AKo") a partir de 2 cartas. */
export function comboToHandType(a: Card, b: Card): string {
  const ra = 2 + (a >> 2);
  const rb = 2 + (b >> 2);
  const sa = a & 3;
  const sb = b & 3;
  const hi = Math.max(ra, rb);
  const lo = Math.min(ra, rb);
  if (ra === rb) return rankLetter(hi) + rankLetter(hi);
  const suited = sa === sb;
  return rankLetter(hi) + rankLetter(lo) + (suited ? "s" : "o");
}

/** Todos os combos de um range inteiro (respeitando frequência > 0). */
export function rangeCombos(range: Range): Card[][] {
  const out: Card[][] = [];
  for (const [ht, freq] of Object.entries(range)) {
    if (freq > 0) out.push(...handTypeCombos(ht));
  }
  return out;
}

/** Total de combos "de peso" em um range (somando freq × combos). */
export function rangeWeightedCombos(range: Range): number {
  let total = 0;
  for (const [ht, freq] of Object.entries(range)) {
    total += freq * comboCount(ht);
  }
  return total;
}

/** Percentual do total de 1326 combos que o range representa. */
export function rangePercent(range: Range): number {
  return rangeWeightedCombos(range) / 1326;
}

// ---------------------------------------------------------------------------
// Cartas e baralho.
//
// Para o Monte Carlo ser rápido, cada carta é apenas um número inteiro de 0 a 51.
//   - índice 0..51
//   - rank  = 2 + floor(índice / 4)  → valor de 2 (dois) a 14 (Ás)
//   - suit  = índice % 4             → 0=paus, 1=ouros, 2=copas, 3=espadas
//
// Também oferecemos conversão de/para texto ("As", "Kh", "Td", "2c") para
// testes, para os ranges pré-flop e para a interface.
// ---------------------------------------------------------------------------

export type Card = number; // 0..51

export const RANKS = "23456789TJQKA"; // índice 0 => rank 2, índice 12 => rank 14 (Ás)
export const SUITS = "cdhs"; // paus, ouros, copas, espadas

export const NUM_CARDS = 52;

/** Valor numérico do rank (2..14) de uma carta. */
export function rankOf(card: Card): number {
  return 2 + (card >> 2); // equivale a 2 + floor(card / 4)
}

/** Naipe (0..3) de uma carta. */
export function suitOf(card: Card): number {
  return card & 3; // equivale a card % 4
}

/** Cria uma carta a partir de rank (2..14) e suit (0..3). */
export function makeCard(rank: number, suit: number): Card {
  return (rank - 2) * 4 + suit;
}

/** Converte "As", "Kh", "Td", "2c" em uma Card (0..51). */
export function cardFromString(s: string): Card {
  if (s.length !== 2) throw new Error(`Carta inválida: "${s}"`);
  const rankIdx = RANKS.indexOf(s[0].toUpperCase());
  const suitIdx = SUITS.indexOf(s[1].toLowerCase());
  if (rankIdx < 0 || suitIdx < 0) throw new Error(`Carta inválida: "${s}"`);
  return rankIdx * 4 + suitIdx;
}

/** Converte uma Card de volta para texto, ex. 51 => "As". */
export function cardToString(card: Card): string {
  return RANKS[card >> 2] + SUITS[card & 3];
}

/** Interpreta uma mão em texto ("AsKh" ou "As Kh") como lista de Cards. */
export function cardsFromString(s: string): Card[] {
  const clean = s.replace(/\s+/g, "");
  const out: Card[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    out.push(cardFromString(clean.slice(i, i + 2)));
  }
  return out;
}

export function cardsToString(cards: Card[]): string {
  return cards.map(cardToString).join("");
}

/** Baralho completo, ordenado (0..51). */
export function fullDeck(): Card[] {
  const deck: Card[] = [];
  for (let i = 0; i < NUM_CARDS; i++) deck.push(i);
  return deck;
}

/**
 * Embaralhamento Fisher-Yates in-place. Recebe uma função de aleatoriedade
 * para permitir testes determinísticos (injetar um RNG com semente).
 */
export function shuffle(deck: Card[], rng: () => number = Math.random): Card[] {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
  return deck;
}

/**
 * Gerador de números pseudo-aleatórios com semente (mulberry32).
 * Usado no Monte Carlo para resultados reproduzíveis nos testes.
 */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

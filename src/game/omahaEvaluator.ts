/**
 * Avaliador de Mãos para Omaha (PLO)
 * 
 * Diferença crítica: Em Omaha, você DEVE usar exatamente 2 cartas da sua mão
 * e exatamente 3 cartas do board. Não pode usar 1, 3 ou 4 cartas da sua mão.
 */

import type { OmahaHole } from "./omaha";

// Valores das cartas para cálculo de mão
const cardRanks: Record<string, number> = {
  "A": 14, "K": 13, "Q": 12, "J": 11, "T": 10,
  "9": 9, "8": 8, "7": 7, "6": 6, "5": 5, "4": 4, "3": 3, "2": 2
};

const cardSuits: Record<string, number> = {
  "♠": 0, "♥": 1, "♦": 2, "♣": 3,
  "s": 0, "h": 1, "d": 2, "c": 3
};

export interface HandRanking {
  rank: number; // 0-8 (high card até royal flush)
  kickers: number[]; // Para desempate
  description: string; // Ex: "Pair of Kings"
}

/**
 * Extrai rank e suit de uma string de carta (ex: "As", "Kh", "2d")
 */
function parseCard(card: string): [number, number] {
  const rank = cardRanks[card[0]];
  const suit = cardSuits[card[1]];
  if (rank === undefined || suit === undefined) {
    throw new Error(`Invalid card: ${card}`);
  }
  return [rank, suit];
}

/**
 * Avalia a melhor mão possível usando exatamente 2 cartas da mão + 3 do board
 * Retorna o ranking e kickers para comparação
 */
export function evaluateOmahaHand(
  holeCards: OmahaHole,
  boardCards: string[]
): HandRanking {
  if (boardCards.length < 3) {
    throw new Error("Board must have at least 3 cards");
  }

  let bestRanking: HandRanking = { rank: 0, kickers: [], description: "High Card" };

  // Gera todas as combinações de 2 cartas da mão (6 combinações)
  const holeCombos = [
    [holeCards[0], holeCards[1]],
    [holeCards[0], holeCards[2]],
    [holeCards[0], holeCards[3]],
    [holeCards[1], holeCards[2]],
    [holeCards[1], holeCards[3]],
    [holeCards[2], holeCards[3]],
  ];

  // Gera todas as combinações de 3 cartas do board
  const boardCombos = generateBoardCombinations(boardCards);

  // Testa cada combinação 2+3
  for (const holeCombo of holeCombos) {
    for (const boardCombo of boardCombos) {
      const allCards = [...holeCombo, ...boardCombo];
      const ranking = evaluateTexasHand(allCards);
      
      if (isBetterRanking(ranking, bestRanking)) {
        bestRanking = ranking;
      }
    }
  }

  return bestRanking;
}

/**
 * Gera todas as combinações de 3 cartas do board
 */
function generateBoardCombinations(board: string[]): string[][] {
  const combos: string[][] = [];
  
  if (board.length === 3) {
    combos.push(board);
  } else if (board.length === 4) {
    // Turn: escolhe 3 de 4
    combos.push([board[0], board[1], board[2]]);
    combos.push([board[0], board[1], board[3]]);
    combos.push([board[0], board[2], board[3]]);
    combos.push([board[1], board[2], board[3]]);
  } else if (board.length === 5) {
    // River: escolhe 3 de 5 (10 combinações)
    for (let i = 0; i < 5; i++) {
      for (let j = i + 1; j < 5; j++) {
        for (let k = j + 1; k < 5; k++) {
          combos.push([board[i], board[j], board[k]]);
        }
      }
    }
  }

  return combos;
}

/**
 * Avalia uma mão de 5 cartas (padrão Texas Hold'em)
 */
function evaluateTexasHand(cards: string[]): HandRanking {
  if (cards.length !== 5) {
    throw new Error("Must evaluate exactly 5 cards");
  }

  const parsed = cards.map(parseCard);
  const ranks = parsed.map(([r]) => r).sort((a, b) => b - a);
  const suits = parsed.map(([, s]) => s);

  // Verifica flush
  const isFlush = suits.every((s) => s === suits[0]);

  // Verifica straight
  const isStraight = checkStraight(ranks);

  // Conta pares, trios, etc
  const rankCounts = countRanks(ranks);
  const counts = Object.values(rankCounts).sort((a, b) => b - a);

  // Royal Flush (A-K-Q-J-T flush)
  if (isFlush && isStraight && ranks[0] === 14) {
    return { rank: 8, kickers: [], description: "Royal Flush" };
  }

  // Straight Flush
  if (isFlush && isStraight) {
    return { rank: 7, kickers: [ranks[0]], description: "Straight Flush" };
  }

  // Four of a Kind
  if (counts[0] === 4) {
    const quad = Object.entries(rankCounts).find(([, c]) => c === 4)?.[0];
    const kicker = ranks.find((r) => r !== Number(quad));
    return { rank: 6, kickers: [Number(quad), kicker || 0], description: "Four of a Kind" };
  }

  // Full House
  if (counts[0] === 3 && counts[1] === 2) {
    const trip = Object.entries(rankCounts).find(([, c]) => c === 3)?.[0];
    const pair = Object.entries(rankCounts).find(([, c]) => c === 2)?.[0];
    return { rank: 5, kickers: [Number(trip), Number(pair)], description: "Full House" };
  }

  // Flush
  if (isFlush) {
    return { rank: 4, kickers: ranks, description: "Flush" };
  }

  // Straight
  if (isStraight) {
    return { rank: 3, kickers: [ranks[0]], description: "Straight" };
  }

  // Three of a Kind
  if (counts[0] === 3) {
    const trip = Object.entries(rankCounts).find(([, c]) => c === 3)?.[0];
    const kickers = ranks.filter((r) => r !== Number(trip));
    return { rank: 2, kickers: [Number(trip), ...kickers], description: "Three of a Kind" };
  }

  // Two Pair
  if (counts[0] === 2 && counts[1] === 2) {
    const pairs = Object.entries(rankCounts)
      .filter(([, c]) => c === 2)
      .map(([r]) => Number(r))
      .sort((a, b) => b - a);
    const kicker = ranks.find((r) => !pairs.includes(r));
    return { rank: 1, kickers: [...pairs, kicker || 0], description: "Two Pair" };
  }

  // One Pair
  if (counts[0] === 2) {
    const pair = Object.entries(rankCounts).find(([, c]) => c === 2)?.[0];
    const kickers = ranks.filter((r) => r !== Number(pair));
    return { rank: 1, kickers: [Number(pair), ...kickers], description: "Pair" };
  }

  // High Card
  return { rank: 0, kickers: ranks, description: "High Card" };
}

/**
 * Verifica se 5 cartas formam um straight
 */
function checkStraight(ranks: number[]): boolean {
  const sorted = [...ranks].sort((a, b) => b - a);
  
  // Straight normal
  if (sorted[0] - sorted[4] === 4 && new Set(sorted).size === 5) {
    return true;
  }

  // Wheel (A-2-3-4-5)
  if (sorted[0] === 14 && sorted[1] === 5 && sorted[2] === 4 && sorted[3] === 3 && sorted[4] === 2) {
    return true;
  }

  return false;
}

/**
 * Conta quantas cartas de cada rank
 */
function countRanks(ranks: number[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const r of ranks) {
    counts[r] = (counts[r] || 0) + 1;
  }
  return counts;
}

/**
 * Compara dois rankings (retorna true se ranking1 é melhor)
 */
function isBetterRanking(ranking1: HandRanking, ranking2: HandRanking): boolean {
  if (ranking1.rank !== ranking2.rank) {
    return ranking1.rank > ranking2.rank;
  }

  // Mesmo rank, compara kickers
  for (let i = 0; i < Math.max(ranking1.kickers.length, ranking2.kickers.length); i++) {
    const k1 = ranking1.kickers[i] || 0;
    const k2 = ranking2.kickers[i] || 0;
    if (k1 !== k2) return k1 > k2;
  }

  return false;
}

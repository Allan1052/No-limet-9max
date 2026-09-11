// ---------------------------------------------------------------------------
// Bloqueadores (blockers).
//
// "Bloquear" é quando as SUAS cartas removem combos fortes da mão do vilão —
// deixando menos mãos boas pra ele ter. É um conceito de jogador avançado, mas
// dá pra ensinar simples: "você tem o A♠, então o vilão quase não tem o flush
// máximo". Aqui detectamos os bloqueadores mais claros e úteis, sempre com o
// cuidado de só chamar de "bloqueador" quando você NÃO completou a própria mão.
// ---------------------------------------------------------------------------

import { rankOf, suitOf, RANKS, type Card } from "../engine/cards";

const SUIT_SYM = ["♣", "♦", "♥", "♠"]; // ordem de SUITS = "cdhs"

export type BlockerKind = "nutFlush" | "nutFlushDraw" | "boardPair" | "aceBlocker" | "topRank";

export interface BlockerNote {
  kind: BlockerKind;
  /** Rótulo da carta relevante, ex.: "A♠" ou "K". */
  label: string;
}

/**
 * Encontra os bloqueadores das cartas do herói no board atual.
 * - nutFlush:     3 do naipe no board + você tem o Ás desse naipe (e não fez flush)
 * - nutFlushDraw: 2 do naipe no board + você tem o Ás desse naipe (bloqueia o projeto)
 * - boardPair:    você tem uma carta de um rank que está no board (reduz trips/2 pares)
 * - topRank:      idem, mas do rank MAIS ALTO do board — é o bloqueador que mais
 *                 importa, porque top par é a mão que o vilão mais tem
 * - aceBlocker:   você tem um Ás e NÃO há Ás no board — reduz os AA e todos os
 *                 AX dele. Era o bloqueador mais comum do poker e faltava
 *                 (auditoria das dicas, 11/09)
 */
export function findBlockers(hand: Card[], board: Card[]): BlockerNote[] {
  if (!hand || hand.length < 2 || board.length < 3) return [];

  const boardSuit = [0, 0, 0, 0];
  const boardRankCount = new Map<number, number>();
  for (const c of board) {
    boardSuit[suitOf(c)]++;
    boardRankCount.set(rankOf(c), (boardRankCount.get(rankOf(c)) ?? 0) + 1);
  }

  // Carta mais alta do board — separa "bloqueia o top par" de "bloqueia um par
  // qualquer", que têm pesos bem diferentes na leitura.
  const topBoardRank = Math.max(...board.map(rankOf));

  // Quantas cartas de cada naipe o herói tem (pra saber se ele mesmo fez o flush).
  const heroSuit = [0, 0, 0, 0];
  for (const c of hand) heroSuit[suitOf(c)]++;

  const notes: BlockerNote[] = [];
  const seen = new Set<string>();
  const add = (kind: BlockerKind, label: string) => {
    const key = `${kind}:${label}`;
    if (!seen.has(key)) {
      seen.add(key);
      notes.push({ kind, label });
    }
  };

  for (const c of hand) {
    const r = rankOf(c);
    const s = suitOf(c);
    const isAce = r === 14;

    // Bloqueador de flush máximo: precisa ter o Ás do naipe e NÃO ter completado
    // o próprio flush (só 1 carta desse naipe na mão).
    if (isAce && heroSuit[s] === 1) {
      if (boardSuit[s] === 3) add("nutFlush", `A${SUIT_SYM[s]}`);
      else if (boardSuit[s] === 2) add("nutFlushDraw", `A${SUIT_SYM[s]}`);
    }

    // Bloqueador de rank do board: herói tem 1 carta de um rank que está no board
    // (reduz os trips e os dois-pares do vilão com esse rank). Ignora par de bolso
    // que pareou o board (aí o herói TEM o set — outra conversa).
    const heroHasRankTwice = hand.filter((x) => rankOf(x) === r).length >= 2;
    if (boardRankCount.has(r) && !heroHasRankTwice) {
      // Se o rank é o MAIS ALTO do board, o bloqueio é bem mais relevante: top
      // par é a mão que o vilão mais costuma ter. Por isso tem nota própria.
      add(r === topBoardRank ? "topRank" : "boardPair", RANKS[r - 2]);
    }

    // Bloqueador de Ás: você tem um Ás e NÃO há Ás no board. Reduz o AA dele e
    // todos os AX — é o bloqueador mais comum do jogo. Só conta quando o Ás não
    // está no board (se estiver, o caso certo é o de rank do board, acima).
    if (isAce && !boardRankCount.has(14)) {
      add("aceBlocker", `A${SUIT_SYM[s]}`);
    }
  }

  return notes;
}

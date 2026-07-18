// ---------------------------------------------------------------------------
// Leitura da textura do board.
//
// A textura muda tudo no pós-flop: em board "seco" (ex.: K♠ 7♦ 2♣) quem abriu
// o pote aposta com muita frequência e barato; em board "molhado" (conectado ou
// com duas/três cartas do mesmo naipe) há muitos projetos, então se aposta
// maior e se blefa com menos frequência.
//
// Aqui resumimos o board em métricas simples e num índice de "wetness" (0 = bem
// seco, 1 = bem molhado) que o módulo de decisão usa para calibrar aposta,
// tamanho e frequência de blefe. São heurísticas transparentes, não um solver.
// ---------------------------------------------------------------------------

import { rankOf, suitOf, type Card } from "../engine/cards";

export interface BoardTexture {
  cards: number;
  paired: boolean;
  /** Maior quantidade de cartas do mesmo naipe no board. */
  maxSuitCount: number;
  /** Há 3+ do mesmo naipe (flush já possível)? */
  flushPossible: boolean;
  /** 0..1 — o quão conectadas (potencial de sequência) são as cartas. */
  connectedness: number;
  /** Maior carta do board (2..14). */
  highCard: number;
  /** 0 = bem seco, 1 = bem molhado. */
  wetness: number;
}

/** Quantas cartas do board caem na janela de 5 ranks mais "cheia". */
function bestFiveWindow(ranks: number[]): number {
  const uniq = Array.from(new Set(ranks));
  // inclui o Ás como 1 para considerar a sequência baixa (A-2-3-4-5)
  if (uniq.includes(14)) uniq.push(1);
  let best = 1;
  for (const low of uniq) {
    let count = 0;
    for (const r of uniq) if (r >= low && r <= low + 4) count++;
    best = Math.max(best, count);
  }
  return best;
}

export function classifyBoard(board: Card[]): BoardTexture {
  const ranks = board.map(rankOf);
  const suits = board.map(suitOf);
  const n = board.length;

  const rankCounts = new Map<number, number>();
  for (const r of ranks) rankCounts.set(r, (rankCounts.get(r) ?? 0) + 1);
  const paired = Array.from(rankCounts.values()).some((c) => c >= 2);

  const suitCounts = [0, 0, 0, 0];
  for (const s of suits) suitCounts[s]++;
  const maxSuitCount = Math.max(...suitCounts);
  const flushPossible = maxSuitCount >= 3;

  const window = bestFiveWindow(ranks);
  // Conecta em relação ao nº de cartas: 3 numa janela de 5 = totalmente conectado.
  const connectedness = n >= 2 ? (window - 1) / (n - 1) : 0;

  const highCard = ranks.length ? Math.max(...ranks) : 0;

  // Componentes de "molhado".
  const flushComponent = maxSuitCount >= 3 ? 0.9 : maxSuitCount === 2 ? 0.4 : 0;
  const connComponent = connectedness;
  let wetness = 0.5 * flushComponent + 0.5 * connComponent;
  if (paired) wetness *= 0.8; // pareado tem menos projetos vivos
  wetness = Math.max(0, Math.min(1, wetness));

  return {
    cards: n,
    paired,
    maxSuitCount,
    flushPossible,
    connectedness,
    highCard,
    wetness,
  };
}

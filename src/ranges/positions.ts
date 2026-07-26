// ---------------------------------------------------------------------------
// Atribuição de POSIÇÕES a partir do botão.
//
// Dada a lista de assentos ocupados (em qualquer ordem) e o assento do botão,
// devolve a posição (UTG..CO/BTN/SB/BB) de cada assento. A ação pré-flop começa
// no SB→BB→UTG; os nomes "late" (CO, HJ…) são atribuídos de trás pra frente,
// que é o que mais importa para a decisão. Heads-up: o botão é o SB.
// ---------------------------------------------------------------------------

import type { Position } from "./types";

const EARLY_TO_LATE: Position[] = ["UTG", "UTG1", "MP", "LJ", "HJ", "CO"];

/** Mapa assento → posição. Assentos sem posição (entrada inválida) ficam de fora. */
export function tablePositions(seatNumbers: number[], buttonSeat: number): Record<number, Position> {
  const order = [...seatNumbers].sort((a, b) => a - b);
  const n = order.length;
  const out: Record<number, Position> = {};
  if (n === 0) return out;
  const btnIdx = order.indexOf(buttonSeat);
  if (btnIdx < 0) return out;

  if (n === 2) {
    out[order[btnIdx]] = "SB";
    out[order[(btnIdx + 1) % 2]] = "BB";
    return out;
  }

  // Anel a partir do botão: ring[0]=SB, ring[1]=BB, …, ring[n-1]=BTN.
  const ring: number[] = [];
  for (let i = 1; i <= n; i++) ring.push(order[(btnIdx + i) % n]);
  out[ring[0]] = "SB";
  out[ring[1]] = "BB";
  out[ring[n - 1]] = "BTN";

  const middleCount = n - 3; // assentos ring[2..n-2]
  const names = EARLY_TO_LATE.slice(EARLY_TO_LATE.length - middleCount);
  for (let i = 0; i < middleCount; i++) out[ring[2 + i]] = names[i];
  return out;
}

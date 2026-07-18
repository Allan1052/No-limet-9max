// ---------------------------------------------------------------------------
// Mapeia assento → posição (UTG, CO, BTN...) em função de onde está o botão.
//
// Relativo ao botão, os assentos ocupados recebem, do botão para trás:
//   BTN, CO, HJ, LJ, MP, UTG1, UTG   (e SB, BB logo após o botão).
// Assim funciona para qualquer número de jogadores (2 a 9): com menos gente,
// as posições "do meio" simplesmente não existem.
// ---------------------------------------------------------------------------

import type { Position } from "../ranges/types";
import type { TableState } from "../game/state";

// Ordem das posições "não-blind", do botão para os primeiros a agir.
const FROM_BUTTON: Position[] = ["BTN", "CO", "HJ", "LJ", "MP", "UTG1", "UTG"];

/** Assentos ocupados (não "out") em ordem horária a partir do botão (inclui o botão). */
function occupiedFromButton(t: TableState): number[] {
  const n = t.players.length;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const s = (t.buttonSeat + i) % n;
    if (t.players[s].status !== "out") out.push(s);
  }
  return out;
}

/** Devolve a posição de cada assento ocupado. */
export function seatPositions(t: TableState): Map<number, Position> {
  const occ = occupiedFromButton(t); // [BTN, SB, BB, ...]
  const map = new Map<number, Position>();
  const count = occ.length;

  if (count === 2) {
    // Heads-up: botão = SB, o outro = BB.
    map.set(occ[0], "SB");
    map.set(occ[1], "BB");
    return map;
  }

  // occ[0] = botão, occ[1] = SB, occ[2] = BB. O resto, de trás para frente
  // a partir do botão, recebe CO, HJ, LJ, ...
  map.set(occ[0], "BTN");
  map.set(occ[1], "SB");
  map.set(occ[2], "BB");
  // Assentos entre BB e o botão (os "abridores"), do último (CO) ao primeiro (UTG).
  const middle = occ.slice(3); // ordem: primeiro a agir ... último antes do botão
  // middle está em ordem de ação (UTG primeiro). O último do middle é CO.
  for (let i = 0; i < middle.length; i++) {
    // do fim para o começo: CO, HJ, LJ...
    const posFromBtn = FROM_BUTTON[1 + (middle.length - 1 - i)];
    map.set(middle[i], posFromBtn ?? "UTG");
  }
  return map;
}

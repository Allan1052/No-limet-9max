// ---------------------------------------------------------------------------
// Identifica todos os jogadores que participaram da mão (colocaram fichas).
// Usado para destacar os assentos após a mão terminar, facilitando a análise.
// ---------------------------------------------------------------------------

import type { HandHistory } from "./replay";

/**
 * Retorna uma lista de assentos de jogadores que COLOCARAM FICHAS na mão.
 * Isso inclui:
 * - Jogadores que foldaram APÓS colocar fichas
 * - Jogadores que chegaram ao showdown
 * - Jogadores que foram all-in
 * - Jogadores que ganharam sem showdown
 * 
 * NÃO inclui:
 * - Jogadores que deram fold imediatamente (sem colocar fichas)
 * - Jogadores que não tiveram ação na mão
 */
export function getParticipantSeats(h: HandHistory): number[] {
  const participants = new Set<number>();

  // Itera sobre todos os eventos da mão
  for (const e of h.events) {
    // Qualquer ação que não seja "fold" imediato significa que o jogador colocou fichas
    if (e.actionType !== "fold") {
      participants.add(e.seat);
    }
  }

  // Adiciona jogadores que tiveram cartas (mesmo que tenham foldado)
  // pois isso significa que receberam cartas e estavam na mão
  for (const seat of Object.keys(h.holeCards)) {
    participants.add(Number(seat));
  }

  // Filtra apenas jogadores que realmente colocaram fichas (VPIP)
  // Um jogador "participou" se:
  // 1. Teve uma ação voluntária (check, bet, call, raise, allin) OU
  // 2. Teve cartas e não foldou pré-flop imediatamente
  const actualParticipants = new Set<number>();
  
  for (const seat of participants) {
    let hasVoluntaryAction = false;
    let foldedPreflop = false;
    let hadCardsPreflop = false;

    for (const e of h.events) {
      if (e.seat !== seat) continue;

      if (e.street === "Pré-flop" || e.street.toLowerCase() === "preflop") {
        hadCardsPreflop = true;
        if (e.actionType === "fold") {
          foldedPreflop = true;
        }
      }

      if (e.actionType !== "fold") {
        hasVoluntaryAction = true;
      }


    }

    // Participa se:
    // - Teve ação voluntária (check, bet, call, raise, allin) OU
    // - Teve cartas e não foldou pré-flop (significa que entrou na mão)
    if (hasVoluntaryAction || (hadCardsPreflop && !foldedPreflop)) {
      actualParticipants.add(seat);
    }
  }

  return Array.from(actualParticipants).sort((a, b) => a - b);
}

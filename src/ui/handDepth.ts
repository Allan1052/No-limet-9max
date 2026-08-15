// ---------------------------------------------------------------------------
// Profundidade de stack do herói (em big blinds) no momento de uma decisão.
// UI layer — só LÊ eventos do replay, não muda nada.
//
// O ReplayEvent não carrega `amount`; o valor da aposta vem do actionLabel
// em big blinds (ex.: "Raise 115", "Call 40", "Aposta 60"). All-in é estimado
// pelo pote do evento seguinte quando disponível.
// ---------------------------------------------------------------------------
import type { HandHistory } from "../app/replay";

const BB_TAG = /(?:Raise|Call|Aposta)\s+([\d.]+)bb/i;

function bbFromLabel(actionLabel: string): number | null {
  const m = BB_TAG.exec(actionLabel ?? "");
  if (!m) return null;
  const v = parseFloat(m[1]);
  return Number.isFinite(v) && v >= 0 ? v : null;
}

/**
 * Estima o stack do herói (em big blinds) ANTES do evento de índice i.
 * Parte do startingStacks do assento e deduz cada colocação no pote.
 */
export function heroBBBefore(hand: HandHistory, eventIndex: number): number | null {
  const seat = hand.heroSeat;
  const start = hand.startingStacks?.[seat];
  if (start === undefined || start <= 0) return null;
  const bb = hand.bigBlind ?? 1;
  let chips = start;
  let allInCovered = false;
  for (let i = 0; i < Math.min(eventIndex, hand.events.length); i++) {
    const ev = hand.events[i];
    if (ev.seat !== seat) continue;
    const v = bbFromLabel(ev.actionLabel);
    if (v !== null) {
      chips -= v * bb;
    } else if (!allInCovered && /all-?in/i.test(ev.actionType)) {
      // All-in sem valor no rótulo: usar o pote daquele evento como teto do gasto.
      chips = Math.max(0, chips - ev.pot);
      allInCovered = true;
    }
  }
  // Resultado da mão (ganhos líquidos) aplicado só após todos os eventos.
  if (hand.result && eventIndex >= hand.events.length) {
    chips += hand.result.winningsBySeat?.[seat] ?? 0;
  }
  return Math.max(0, chips) / bb;
}

/** Posição do herói, quando disponível no HandHistory. */
export function heroPositionOf(hand: HandHistory): string | undefined {
  return hand.heroPosition || undefined;
}

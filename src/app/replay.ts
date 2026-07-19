// ---------------------------------------------------------------------------
// Histórico de mão para o replayer.
//
// Durante a mão, gravamos cada ação com o board e o pote daquele momento, mais
// a "decisão ótima" (recomendação da linha de base) para aquele spot. Ao final,
// congelamos tudo num HandHistory que o replayer percorre passo a passo — ideal
// para revisar onde a jogada (sua ou do bot) divergiu do padrão.
// ---------------------------------------------------------------------------

import type { Card } from "../engine/cards";
import type { HandResult } from "../game/state";

export interface ReplayAdvice {
  action: string;
  reason: string;
  equity?: number;
  potOdds?: number;
}

export interface ReplayEvent {
  street: string;
  seat: number;
  name: string;
  isHero: boolean;
  /** Rótulo do que o jogador fez (ex.: "Raise 115"). */
  actionLabel: string;
  /** Tipo cru da ação (fold/check/call/raise/allin) para comparar com o ótimo. */
  actionType: string;
  /** Board no momento da ação. */
  board: Card[];
  /** Pote antes desta ação. */
  pot: number;
  /** Recomendação da linha de base para este spot. */
  advice?: ReplayAdvice;
}

export interface HandHistory {
  events: ReplayEvent[];
  holeCards: Record<number, Card[]>;
  names: Record<number, string>;
  heroSeat: number;
  finalBoard: Card[];
  buttonSeat: number;
  bigBlind: number;
  result?: HandResult;
}

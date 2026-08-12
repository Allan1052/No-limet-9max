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
import type { FeedbackItem } from "../feedback/analyzer";

export interface ReplayAdvice {
  action: string;
  reason: string;
  equity?: number;
  potOdds?: number;
  /** Rótulo do raise pelo nível ("3-bet"/"4-bet"/"5-bet"), quando aplicável. */
  nBet?: string;
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
  /** Stack (em fichas) de cada assento no INÍCIO da mão — para o range por profundidade. */
  startingStacks?: Record<number, number>;
  result?: HandResult;
  /** FeedbackItems gerados durante esta mão (para filtros de histórico). */
  handFeedback?: FeedbackItem[];
  /** POSIÇÃO do herói (ex.: "UTG", "BTN", "CO") — sempre visível no card. */
  heroPosition?: string;
  /** ESTÁGIO do torneio no momento da mão (ex.: "Início", "Bolha"). */
  tournamentStage?: string;
}

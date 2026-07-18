// ---------------------------------------------------------------------------
// Estatísticas por sessão (as três principais do poker de estudo):
//
//   VPIP  — Voluntarily Put $ In Pot: % de mãos em que o jogador colocou fichas
//           voluntariamente no pré-flop (call ou raise; blind forçado e check
//           não contam).
//   PFR   — PreFlop Raise: % de mãos em que aumentou no pré-flop.
//   3-bet — % de vezes que deu 3-bet quando teve a chance (enfrentou uma
//           abertura sem ainda ter aumentado). Denominador = oportunidades.
//
// A lógica de contagem fica aqui, isolada e testável. Cada mão conta no máximo
// uma vez por métrica (um jogador pode agir várias vezes no pré-flop).
// ---------------------------------------------------------------------------

export interface PlayerStats {
  handsDealt: number;
  vpip: number;
  pfr: number;
  threeBet: number;
  threeBetOpp: number;
}

/** Flags de "já contei nesta mão" para não contar em duplicidade. */
export interface PerHandFlags {
  vpipDone: boolean;
  pfrDone: boolean;
  threeBetOppDone: boolean;
}

export function emptyStats(): PlayerStats {
  return { handsDealt: 0, vpip: 0, pfr: 0, threeBet: 0, threeBetOpp: 0 };
}

export function emptyFlags(): PerHandFlags {
  return { vpipDone: false, pfrDone: false, threeBetOppDone: false };
}

/** Começa uma mão para um jogador: conta a mão e devolve flags zeradas. */
export function beginHand(stats: PlayerStats): PerHandFlags {
  stats.handsDealt++;
  return emptyFlags();
}

/**
 * Registra uma ação de PRÉ-FLOP.
 * @param actionType tipo da ação do motor (fold/check/call/raise/allin)
 * @param facingRaise já havia uma abertura (aposta acima do BB) quando decidiu?
 */
export function recordPreflopAction(
  stats: PlayerStats,
  flags: PerHandFlags,
  actionType: string,
  facingRaise: boolean,
): void {
  const voluntary = actionType === "call" || actionType === "raise" || actionType === "allin";
  const isRaise = actionType === "raise" || actionType === "allin";
  // Já tinha aumentado ANTES desta ação? (define se é spot de 3-bet ou 4-bet)
  const hadRaisedBefore = flags.pfrDone;

  if (voluntary && !flags.vpipDone) {
    stats.vpip++;
    flags.vpipDone = true;
  }
  if (isRaise && !flags.pfrDone) {
    stats.pfr++;
    flags.pfrDone = true;
  }
  // Oportunidade de 3-bet: enfrentou uma abertura e ainda não tinha aumentado
  // (senão seria spot de 4-bet, não de 3-bet).
  if (facingRaise && !flags.threeBetOppDone && !hadRaisedBefore) {
    stats.threeBetOpp++;
    flags.threeBetOppDone = true;
    if (isRaise) stats.threeBet++;
  }
}

export interface StatRow {
  seat: number;
  name: string;
  isHero: boolean;
  hands: number;
  vpip: number; // %
  pfr: number; // %
  threeBet: number; // %
}

function pctOf(n: number, d: number): number {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

export function toRow(seat: number, name: string, isHero: boolean, s: PlayerStats): StatRow {
  return {
    seat,
    name,
    isHero,
    hands: s.handsDealt,
    vpip: pctOf(s.vpip, s.handsDealt),
    pfr: pctOf(s.pfr, s.handsDealt),
    threeBet: pctOf(s.threeBet, s.threeBetOpp),
  };
}

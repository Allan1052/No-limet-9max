/**
 * Gerenciador de Pot Limit para Omaha (PLO)
 * 
 * Em Pot Limit, a aposta máxima permitida é igual ao tamanho atual do pote.
 * Fórmula: Máximo de aposta = Pote atual + (2 × Big Blind)
 */

export interface PotLimitState {
  potSize: number;
  currentBet: number;
  playerStack: number;
  bigBlind: number;
}

/**
 * Calcula a aposta máxima permitida em Pot Limit
 * Fórmula: Pote + (2 × Big Blind) ou o stack do jogador, o que for menor
 */
export function calculateMaxBet(state: PotLimitState): number {
  const maxAllowed = state.potSize + 2 * state.bigBlind;
  return Math.min(maxAllowed, state.playerStack);
}

/**
 * Valida se uma aposta é legal em Pot Limit
 */
export function isValidBet(state: PotLimitState, betAmount: number): boolean {
  if (betAmount <= 0) return false;
  if (betAmount > state.playerStack) return false;
  if (betAmount > calculateMaxBet(state)) return false;
  return true;
}

/**
 * Calcula o novo estado do pote após uma aposta
 */
export function updatePotAfterBet(
  state: PotLimitState,
  betAmount: number
): PotLimitState {
  if (!isValidBet(state, betAmount)) {
    throw new Error(`Invalid bet: ${betAmount}`);
  }

  return {
    potSize: state.potSize + betAmount,
    currentBet: betAmount,
    playerStack: state.playerStack - betAmount,
    bigBlind: state.bigBlind,
  };
}

/**
 * Retorna uma string descritiva da situação de Pot Limit
 */
export function describePotLimitSituation(state: PotLimitState): string {
  const maxBet = calculateMaxBet(state);
  return `Pote: ${state.potSize} | Máx. Aposta: ${maxBet} | Stack: ${state.playerStack}`;
}

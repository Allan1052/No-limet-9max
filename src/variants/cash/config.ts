// ---------------------------------------------------------------------------
// CASH GAME — configuração específica.
//
// Reusa TODO o motor de Hold'em. Só muda:
//   1. Blinds FIXAS (não sobem como no torneio)
//   2. Sem eliminação — jogador pode rebuy quando quiser
//   3. Payout: ganha/perde fichas (não tem premiação, é cash real)
//   4. Mesa de 6-max (padrão cash online) ou 9-max
//
// Nada do motor Hold'em é alterado. Este módulo é 100% aditivo.
// ---------------------------------------------------------------------------

/** Número máximo de jogadores num cash game (6-max padrão). */
export const CASH_MAX_PLAYERS = 6;

/** Blinds fixas (nunca sobem — é a diferença principal do torneio). */
export interface CashBlindLevel {
  level: number;
  sb: number;
  bb: number;
  ante: number;
}

/** Estruturas de cash disponíveis (SB/BB). */
export const CASH_BLIND_STRUCTURES: CashBlindLevel[] = [
  { level: 1, sb: 5, bb: 10, ante: 0 },
  { level: 1, sb: 10, bb: 20, ante: 0 },
  { level: 1, sb: 25, bb: 50, ante: 0 },
  { level: 1, sb: 50, bb: 100, ante: 0 },
  { level: 1, sb: 100, bb: 200, ante: 0 },
];

/** Stack inicial em big blinds (padrão cash: 100bb). */
export const CASH_STARTING_BB = 100;

/** Stack mínimo pra rebuy (se cair abaixo disso, pode recomprar). */
export const CASH_MIN_REBUY_BB = 50;

/** Stack máximo — se rebuy ultrapassar, é limitado. */
export const CASH_MAX_STACK_BB = 100;

/** Tipo de mesa cash. */
export type CashTableType = "6max" | "9max";

/**
 * Calcula o stack inicial em fichas baseado nas blinds.
 */
export function cashStartingStack(blindLevel: CashBlindLevel): number {
  return blindLevel.bb * CASH_STARTING_BB;
}

/**
 * Calcula o stack de rebuy (volto com 100bb ou o stack atual, o que for maior).
 */
export function cashRebuyStack(currentBB: number, blindLevel: CashBlindLevel): number {
  if (currentBB >= CASH_MAX_STACK_BB) return currentBB * blindLevel.bb;
  return CASH_MAX_STACK_BB * blindLevel.bb;
}

/** Dev-unlock key no localStorage. */
export const CASH_DEV_UNLOCK_KEY = "cash_dev_unlock";

/** Código de desbloqueio. */
export const CASH_DEV_UNLOCK_CODE = "cash2026";

/**
 * Verifica se o Cash Game está desbloqueado.
 */
export function isCashUnlocked(): boolean {
  return localStorage.getItem(CASH_DEV_UNLOCK_KEY) === "true";
}

/**
 * Tenta desbloquear o Cash Game com o código correto.
 * Retorna true se desbloqueou.
 */
export function tryUnlockCash(code: string): boolean {
  if (code === CASH_DEV_UNLOCK_CODE) {
    localStorage.setItem(CASH_DEV_UNLOCK_KEY, "true");
    return true;
  }
  return false;
}

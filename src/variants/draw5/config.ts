// ---------------------------------------------------------------------------
// 5-Card Draw — configuração e dev-unlock
// ---------------------------------------------------------------------------

export const DRAW5_UNLOCK_KEY = "draw5_dev_unlock";

export interface Draw5Config {
  numSeats: number;
  sb: number;
  bb: number;
  startingStack: number;
}

export const DEFAULT_DRAW5_CONFIG: Draw5Config = {
  numSeats: 4,
  sb: 10,
  bb: 20,
  startingStack: 1000,
};

/** Retorna true se o Draw5 está desbloqueado via localStorage. */
export function isDraw5Unlocked(): boolean {
  return localStorage.getItem(DRAW5_UNLOCK_KEY) === "true";
}

/** Desbloqueia o Draw5. */
export function unlockDraw5(): void {
  localStorage.setItem(DRAW5_UNLOCK_KEY, "true");
}

/** Bloqueia o Draw5. */
export function lockDraw5(): void {
  localStorage.removeItem(DRAW5_UNLOCK_KEY);
}

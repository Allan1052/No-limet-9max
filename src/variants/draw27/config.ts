// ---------------------------------------------------------------------------
// 2-7 Triple Draw — configuração e dev-unlock
// ---------------------------------------------------------------------------

export const DRAW27_UNLOCK_KEY = "draw27_dev_unlock";

export interface Draw27Config {
  numSeats: number;
  sb: number;
  bb: number;
  startingStack: number;
}

export const DEFAULT_DRAW27_CONFIG: Draw27Config = {
  numSeats: 4,
  sb: 10,
  bb: 20,
  startingStack: 1000,
};

/** Retorna true se o 2-7 Triple Draw está desbloqueado via localStorage. */
export function isDraw27Unlocked(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(DRAW27_UNLOCK_KEY) === "true";
}

/** Desbloqueia o 2-7 Triple Draw. */
export function unlockDraw27(): void {
  localStorage.setItem(DRAW27_UNLOCK_KEY, "true");
}

/** Bloqueia o 2-7 Triple Draw. */
export function lockDraw27(): void {
  localStorage.removeItem(DRAW27_UNLOCK_KEY);
}

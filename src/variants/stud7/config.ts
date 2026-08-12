// ---------------------------------------------------------------------------
// 7-Card Stud — configuração e dev-unlock
// ---------------------------------------------------------------------------

export const STUD7_UNLOCK_KEY = "stud_dev_unlock";

export interface Stud7Config {
  numSeats: number;
  ante: number;
  bringIn: number;
  smallBet: number;
  bigBet: number;
  startingStack: number;
}

export const DEFAULT_STUD7_CONFIG: Stud7Config = {
  numSeats: 6,
  ante: 1,
  bringIn: 2,
  smallBet: 10,
  bigBet: 20,
  startingStack: 1000,
};

/** Retorna true se o 7-Card Stud está desbloqueado via localStorage. */
export function isStud7Unlocked(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(STUD7_UNLOCK_KEY) === "true";
}

/** Desbloqueia o 7-Card Stud. */
export function unlockStud7(): void {
  localStorage.setItem(STUD7_UNLOCK_KEY, "true");
}

/** Bloqueia o 7-Card Stud. */
export function lockStud7(): void {
  localStorage.removeItem(STUD7_UNLOCK_KEY);
}

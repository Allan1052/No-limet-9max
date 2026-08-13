// ---------------------------------------------------------------------------
// Torneios de ELITE ($1.000 e $10.300) — desbloqueio por conquista.
//
// A "nata" não se compra: se conquista.
//   • $1.000  ← ganhar um torneio de $109 com 100+ jogadores (do início).
//   • $10.300 ← ganhar um torneio de $1.000 com 100+ jogadores (do início).
//
// Só conta vitória REAL: torneio jogado desde o "início" (não pulando pra bolha)
// e com campo cheio (100+). Fica registrado pra sempre no aparelho.
// ---------------------------------------------------------------------------

const KEY = "cof-elite-wins";

/** Mínimo de inscritos para uma vitória valer o desbloqueio. */
export const ELITE_MIN_ENTRANTS = 100;

/** Buy-ins de elite (para a UI marcar/ordenar). */
export const ELITE_BUYINS = [1000, 10300];

type EliteWins = Record<string, boolean>;

export function loadEliteWins(): EliteWins {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") as EliteWins;
  } catch {
    return {};
  }
}

function save(w: EliteWins): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(w));
  } catch {
    /* storage indisponível — silencioso */
  }
}

/**
 * Registra uma vitória. Só grava se foi do "início" e com 100+ inscritos.
 * Devolve `true` se ISSO desbloqueou algo novo (para celebrar na UI).
 */
export function recordTournamentWin(buyIn: number, entrants: number, stage: string): boolean {
  if (stage !== "inicio" || entrants < ELITE_MIN_ENTRANTS) return false;
  const w = loadEliteWins();
  const key = String(Math.round(buyIn));
  if (w[key]) return false; // já tinha
  w[key] = true;
  save(w);
  // Só é "novidade" se destrava um buy-in de elite ainda travado.
  return (buyIn >= 109 && buyIn < 1000) || (buyIn >= 1000 && buyIn < 10000);
}

/** Texto do requisito de um buy-in travado (null = liberado). */
export function unlockRequirement(buyIn: number): string | null {
  if (buyIn >= 10000) return "Ganhe um torneio de $1.000 com 100+ jogadores";
  if (buyIn >= 1000) return "Ganhe um torneio de $109 com 100+ jogadores";
  return null;
}

/** Um buy-in está liberado para jogar? (tudo até $109 sempre liberado). */
export function isBuyInUnlocked(buyIn: number, wins: EliteWins = loadEliteWins()): boolean {
  if (buyIn >= 10000) return !!wins["1000"];
  if (buyIn >= 1000) return !!wins["109"];
  return true;
}

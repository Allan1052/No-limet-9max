// ---------------------------------------------------------------------------
// Sit & Go 3-max — configuração específica.
//
// Reusa TODO o motor de Hold'em. Só muda:
//   1. Mesa de 3 jogadores (hero + 2 bots)
//   2. Blinds subindo rápido (estrutura turbo SNG)
//   3. Payout: winner-take-all OU top-2 65/35
//   4. Ranges de abertura MUITO mais largas (short-handed)
//
// Nada do motor Hold'em é alterado. Este módulo é 100% aditivo.
// ---------------------------------------------------------------------------

/** Número de jogadores num SNG 3-max. */
export const SNG3_MAX_PLAYERS = 3;

/** Níveis de blind turbo SNG (sobem a cada ~10 mãos). */
export interface Sng3BlindLevel {
  level: number;
  sb: number;
  bb: number;
  ante: number;
}

export const SNG3_BLIND_LEVELS: Sng3BlindLevel[] = [
  { level: 1, sb: 25, bb: 50, ante: 0 },
  { level: 2, sb: 50, bb: 100, ante: 0 },
  { level: 3, sb: 75, bb: 150, ante: 0 },
  { level: 4, sb: 100, bb: 200, ante: 0 },
  { level: 5, sb: 150, bb: 300, ante: 0 },
  { level: 6, sb: 200, bb: 400, ante: 0 },
  { level: 7, sb: 300, bb: 600, ante: 0 },
  { level: 8, sb: 400, bb: 800, ante: 0 },
  { level: 9, sb: 600, bb: 1200, ante: 0 },
  { level: 10, sb: 800, bb: 1600, ante: 0 },
  { level: 11, sb: 1000, bb: 2000, ante: 0 },
  { level: 12, sb: 1500, bb: 3000, ante: 0 },
];

/** Mãos por nível antes de subir as blinds (turbo). */
export const SNG3_HANDS_PER_LEVEL = 10;

/** Stack inicial em big blinds (mais raso que MTT — SNG típico). */
export const SNG3_STARTING_BB = 25;

/** Tipo de payout SNG. */
export type Sng3PayoutMode = "winner-take-all" | "top2-65-35";

/**
 * Calcula a escada de prêmios para SNG 3-max.
 * - winner-take-all: 1º lugar leva tudo.
 * - top2-65-35: 1º = 65%, 2º = 35%.
 */
export function sng3PayoutLadder(pool: number, mode: Sng3PayoutMode = "winner-take-all"): number[] {
  if (mode === "winner-take-all") {
    return [pool];
  }
  // top2-65-35
  const first = Math.round(pool * 0.65);
  const second = pool - first;
  return [first, second];
}

/**
 * Multiplicador de largura de range para 3-max (vs 9-max).
 * Em 3-max, o herói está em BTN ou SB na maioria das mãos → range MUITO mais larga.
 * Aplicado sobre a widthFactor padrão.
 */
export const SNG3_RANGE_WIDTH_MULTIPLIER = 2.5;

/**
 * Fator de shove (push/fold) para 3-max — mais agressivo.
 * Em 3-max, shoveia-se com stacks maiores porque há menos gente pra pagar.
 */
export const SNG3_SHOVE_DEPTH_BB = 20; // shove considera até 20bb (vs 15bb no 9-max)

/** Dev-unlock key no localStorage. */
export const SNG3_DEV_UNLOCK_KEY = "sng3_dev_unlock";

/** Código de desbloqueio. */
export const SNG3_DEV_UNLOCK_CODE = "sng32026";

/**
 * Verifica se o SNG 3-max está desbloqueado.
 */
export function isSng3Unlocked(): boolean {
  return localStorage.getItem(SNG3_DEV_UNLOCK_KEY) === "true";
}

/**
 * Tenta desbloquear o SNG 3-max com o código correto.
 * Retorna true se desbloqueou.
 */
export function tryUnlockSng3(code: string): boolean {
  if (code === SNG3_DEV_UNLOCK_CODE) {
    localStorage.setItem(SNG3_DEV_UNLOCK_KEY, "true");
    return true;
  }
  return false;
}

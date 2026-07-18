// ---------------------------------------------------------------------------
// Ranges de abertura (RFI = Raise First In): quando ninguém entrou no pote
// antes, quais mãos abrir por posição.
//
// As porcentagens-base seguem o consenso de solvers para 9-max ~100bb (open
// ~2.2-2.5bb): abre-se pouco cedo (UTG) e cada vez mais perto do botão. A
// partir desse alvo, `buildTopRange` monta a range concreta pelo ranking de
// força. Perfil, profundidade de stack e ICM depois esticam ou apertam o alvo.
// ---------------------------------------------------------------------------

import { buildTopRange } from "../build";
import type { Position, Range } from "../types";

// Percentual-base de abertura por posição (fração de 1326 combos).
// O big blind não "abre" (já está no pote); trata-se à parte.
export const RFI_BASE_PERCENT: Record<Position, number> = {
  UTG: 0.11,
  UTG1: 0.13,
  MP: 0.15,
  LJ: 0.18,
  HJ: 0.22,
  CO: 0.28,
  BTN: 0.45,
  SB: 0.42, // SB abre-ou-desiste mais largo (só um oponente para passar)
  BB: 0.0,
};

export interface RfiAdjust {
  /** Multiplicador de largura do perfil do bot (rfiWidth). */
  widthFactor?: number;
  /** Fator de profundidade de stack (1.0 = ~100bb). */
  stackFactor?: number;
  /** Fator de aperto por ICM (0..1; 1 = sem aperto, <1 aperta). */
  icmFactor?: number;
}

/** Alvo de % de abertura já ajustado, com limites de segurança. */
export function rfiTargetPercent(position: Position, adj: RfiAdjust = {}): number {
  const base = RFI_BASE_PERCENT[position];
  const width = adj.widthFactor ?? 1;
  const stack = adj.stackFactor ?? 1;
  const icm = adj.icmFactor ?? 1;
  const pct = base * width * stack * icm;
  // Nunca abrir mais que 65% nem menos que 3% (evita extremos absurdos).
  return Math.max(0.03, Math.min(0.65, pct));
}

/** Range de abertura concreta para a posição, já ajustada. */
export function rfiRange(position: Position, adj: RfiAdjust = {}): Range {
  if (position === "BB") return {};
  return buildTopRange(rfiTargetPercent(position, adj));
}

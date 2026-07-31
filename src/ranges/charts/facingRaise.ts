import { buildTopRange } from "../build";
import type { Position, Range } from "../types";

export interface FacingRaiseAdjust {
  /** Multiplicador de largura do perfil do bot (rfiWidth). */
  widthFactor?: number;
  /** Fator de call do perfil do bot (coldCallFactor). */
  callFactor?: number;
  /** Fator de profundidade de stack (1.0 = ~100bb). */
  stackFactor?: number;
  /** Fator de aperto por ICM (0..1; 1 = sem aperto, <1 aperta). */
  icmFactor?: number;
}

/**
 * Retorna a range de mãos que o herói deve jogar (call/3bet) ao enfrentar um raise.
 * Esta é uma versão simplificada e precisa ser expandida com a lógica de João Simão.
 */
export function facingRaiseRange(
  _heroPosition: Position,
  _raiserPosition: Position,
  _openSizeBB: number,
  adj: FacingRaiseAdjust = {},
): Range {
  // Implementação temporária: retorna uma range baseada em um percentual de defesa.
  // A lógica real de João Simão para facing raise será implementada aqui.
  const baseDefendPct = 0.15; // Valor placeholder
  const adjustedDefendPct = baseDefendPct * (adj.widthFactor ?? 1) * (adj.stackFactor ?? 1) * (adj.icmFactor ?? 1);
  return buildTopRange(adjustedDefendPct);
}

// ---------------------------------------------------------------------------
// Ranges de abertura (RFI = Raise First In): quando ninguém entrou no pote
// antes, quais mãos abrir por posição.
//
// As porcentagens-base seguem o consenso de solvers para 9-max ~100bb (open
// ~2.2-2.5bb): abre-se pouco cedo (UTG) e cada vez mais perto do botão. A
// partir desse alvo, `buildTopRange` monta a range concreta pelo ranking de
// força. Perfil, profundidade de stack e ICM depois esticam ou apertam o alvo.
// ---------------------------------------------------------------------------

import { buildTopRangeWithBonus } from "../build";
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
  /** Bônus de shove para pares/suited connectors (push/fold mode). */
  shoveBonus?: number;
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

// Bônus LEVE de pares/suited connectors na abertura funda — APENAS em posição
// LARGA (CO/BTN/SB). O ranking de força cru subvaloriza essas mãos: o valor
// delas vem de jogabilidade/set-mine e da equity que REALIZAM pós-flop, não da
// equity crua. Sem isso o botão FOLDAVA 22/33/54s/65s/76s, mãos que o GTO abre
// (leak achado pela calibração GTO em _calibration/gtoBenchmark).
//
// Por que SÓ em posição larga: mãos especulativas ganham valor EM POSIÇÃO e com
// mais gente já foldada atrás — exatamente CO/BTN/SB. Em posição CEDO (UTG/MP) a
// abertura é sobre força bruta/dominação (broadways), então aplicar o bônus lá
// trocaria erradamente KQo por 98s. O corte por base >= 0.25 mantém as posições
// cedo com o ranking puro (KQo segue abrindo em UTG) e só corrige as largas.
export const RFI_SPECULATIVE_BONUS = 0.06;
const RFI_SPECULATIVE_MIN_BASE = 0.25;

/** Range de abertura concreta para a posição, já ajustada. */
export function rfiRange(position: Position, adj: RfiAdjust = {}): Range {
  if (position === "BB") return {};
  const pct = rfiTargetPercent(position, adj);
  if (adj.shoveBonus && adj.shoveBonus > 0) {
    return buildTopRangeWithBonus(pct, adj.shoveBonus);
  }
  const speculative = RFI_BASE_PERCENT[position] >= RFI_SPECULATIVE_MIN_BASE ? RFI_SPECULATIVE_BONUS : 0;
  return buildTopRangeWithBonus(pct, speculative);
}

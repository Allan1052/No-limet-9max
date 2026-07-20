// ---------------------------------------------------------------------------
// Perfis de bot — v3 (arquétipos realistas de MTT online 9-max).
//
// Substituem os perfis "inspirados em famosos" por 8 arquétipos naturais de
// mesa de torneio: do recreativo solto ao nit, do TAG ao LAG, calling station,
// short-stack shover, etc. Cada perfil traz metas de estatística (VPIP/PFR/
// 3-bet), ajuste por posição, frequências de c-bet/barrel, camada de ICM e
// tendências — tudo derivado do documento de design v3.
//
// Os campos numéricos "*Factor" modulam, de forma principiada, as decisões que
// os outros módulos tomam (largura de abertura, defesa, c-bet, barrel...). Nada
// é aleatório: o mesmo perfil na mesma situação decide igual.
// ---------------------------------------------------------------------------

import type { Position } from "../ranges/types";

export type Archetype =
  | "recreativo"
  | "nit"
  | "tag"
  | "lag"
  | "abc"
  | "station"
  | "shover"
  | "spewy";

export interface BotProfile {
  id: string;
  name: string;
  archetype: Archetype;
  description: string;

  // Metas de estatística (referência e base para derivar larguras).
  targetVpip: number; // %
  targetPfr: number; // %
  target3bet: number; // %

  // Abertura e defesa pré-flop.
  rfiWidth: number; // largura de abertura (1.0 = base "sólida")
  limpFactor: number; // 0..1: limpa mãos especulativas (passivos veem mais flops)
  coldCallFactor: number; // quanto paga aberturas (flat) — infla o VPIP passivo
  threeBetFactor: number;
  defendFactor: number; // defesa do BB
  /** Multiplicador da largura de abertura por posição. */
  positional: Record<Position, number>;

  // Pós-flop.
  cbetFactor: number; // freq de c-bet no flop (relativa)
  barrelTurn: number; // 0..1 freq de barrel no turn
  barrelRiver: number; // 0..1 freq de barrel no river
  bluffFactor: number;
  aggression: number; // 0..1
  multiwayReduction: number; // 0..1: quanto reduz a continuação em pote multiway
  stickiness: number; // 0..1: quanto NÃO folda (1 - fold-to-cbet)

  // Meta / ajustes.
  adaptability: number; // 0..1: ajuste por profundidade de stack
  icmSensitivity: number; // 0..1
  skill: number; // 0..1
  /** Limite de stack (bb) abaixo do qual entra em modo shove; null = não usa. */
  shoveMaxBB: number | null;
}

// Converte o mapa de 6 posições do documento em um mapa de 8 posições da mesa.
function pos6to8(m: {
  UTG: number;
  MP: number;
  CO: number;
  BTN: number;
  SB: number;
}): Record<Position, number> {
  return {
    UTG: m.UTG,
    UTG1: m.UTG,
    MP: m.MP,
    LJ: m.MP,
    HJ: (m.MP + m.CO) / 2,
    CO: m.CO,
    BTN: m.BTN,
    SB: m.SB,
    BB: 1,
  };
}

export const PROFILES: BotProfile[] = [
  {
    id: "recreativo",
    name: "Recreativo Solto",
    archetype: "recreativo",
    description: "Casual: adora ver flops, superestima mãos médias, quase não blefa.",
    targetVpip: 46, targetPfr: 10, target3bet: 3,
    rfiWidth: 0.72, limpFactor: 0.6, coldCallFactor: 4.2, threeBetFactor: 0.5, defendFactor: 1.5,
    positional: pos6to8({ UTG: 0.55, MP: 0.7, CO: 1.0, BTN: 1.3, SB: 0.9 }),
    cbetFactor: 0.9, barrelTurn: 0.28, barrelRiver: 0.15, bluffFactor: 0.9, aggression: 0.35,
    multiwayReduction: 0.2, stickiness: 0.65,
    adaptability: 0.4, icmSensitivity: 0.35, skill: 0.5, shoveMaxBB: null,
  },
  {
    id: "nit",
    name: "Nit Conservador",
    archetype: "nit",
    description: "Ultra-seletivo: joga pouquíssimas mãos, evita confronto sem premium.",
    targetVpip: 14, targetPfr: 11.5, target3bet: 3.5,
    rfiWidth: 0.92, limpFactor: 0, coldCallFactor: 0.3, threeBetFactor: 0.6, defendFactor: 0.75,
    positional: pos6to8({ UTG: 0.5, MP: 0.65, CO: 0.9, BTN: 1.2, SB: 0.7 }),
    cbetFactor: 1.06, barrelTurn: 0.32, barrelRiver: 0.17, bluffFactor: 0.8, aggression: 0.4,
    multiwayReduction: 0.4, stickiness: 0.4,
    adaptability: 0.9, icmSensitivity: 0.85, skill: 0.8, shoveMaxBB: 10,
  },
  {
    id: "tag",
    name: "TAG Regular",
    archetype: "tag",
    description: "Reg padrão de grinder: equilibrado, sólido e previsível dentro do razoável.",
    targetVpip: 22, targetPfr: 18, target3bet: 7,
    rfiWidth: 1.28, limpFactor: 0, coldCallFactor: 0.5, threeBetFactor: 1.17, defendFactor: 1.0,
    positional: pos6to8({ UTG: 0.6, MP: 0.8, CO: 1.0, BTN: 1.4, SB: 0.8 }),
    cbetFactor: 1.06, barrelTurn: 0.385, barrelRiver: 0.23, bluffFactor: 1.0, aggression: 0.6,
    multiwayReduction: 0.3, stickiness: 0.525,
    adaptability: 0.9, icmSensitivity: 0.6, skill: 0.88, shoveMaxBB: 12,
  },
  {
    id: "lag",
    name: "LAG Moderno",
    archetype: "lag",
    description: "Agressivo com fundamento: pressão pós-flop, mas ranges coerentes.",
    targetVpip: 29.5, targetPfr: 23.5, target3bet: 10,
    rfiWidth: 1.86, limpFactor: 0, coldCallFactor: 1.0, threeBetFactor: 1.67, defendFactor: 1.13,
    positional: pos6to8({ UTG: 0.65, MP: 0.85, CO: 1.15, BTN: 1.5, SB: 0.9 }),
    cbetFactor: 1.25, barrelTurn: 0.485, barrelRiver: 0.315, bluffFactor: 1.3, aggression: 0.85,
    multiwayReduction: 0.25, stickiness: 0.585,
    adaptability: 0.9, icmSensitivity: 0.6, skill: 0.9, shoveMaxBB: 14,
  },
  {
    id: "abc",
    name: "ABC Careful",
    archetype: "abc",
    description: "Direto e previsível, 'por cima da mesa', sem muita camada de blefe.",
    targetVpip: 19, targetPfr: 15.5, target3bet: 4.5,
    rfiWidth: 1.36, limpFactor: 0, coldCallFactor: 0.55, threeBetFactor: 0.78, defendFactor: 0.85,
    positional: pos6to8({ UTG: 0.6, MP: 0.75, CO: 0.95, BTN: 1.2, SB: 0.75 }),
    cbetFactor: 0.94, barrelTurn: 0.25, barrelRiver: 0.125, bluffFactor: 0.8, aggression: 0.45,
    multiwayReduction: 0.35, stickiness: 0.46,
    adaptability: 0.9, icmSensitivity: 0.85, skill: 0.75, shoveMaxBB: 10,
  },
  {
    id: "station",
    name: "Calling Station",
    archetype: "station",
    description: "Quase nunca desiste depois de entrar; paga até o showdown com frequência.",
    targetVpip: 51, targetPfr: 6.5, target3bet: 2,
    rfiWidth: 0.46, limpFactor: 0.72, coldCallFactor: 5.5, threeBetFactor: 0.33, defendFactor: 1.75,
    positional: pos6to8({ UTG: 0.85, MP: 0.9, CO: 1.0, BTN: 1.1, SB: 1.0 }),
    cbetFactor: 0.7, barrelTurn: 0.21, barrelRiver: 0.1, bluffFactor: 0.6, aggression: 0.25,
    multiwayReduction: 0.05, stickiness: 0.8,
    adaptability: 0.35, icmSensitivity: 0.1, skill: 0.4, shoveMaxBB: null,
  },
  {
    id: "shover",
    name: "Curto-stack Shover",
    archetype: "shover",
    description: "Ajusta puramente por ICM e profundidade — típico de fase final.",
    targetVpip: 20, targetPfr: 16, target3bet: 6,
    rfiWidth: 1.14, limpFactor: 0, coldCallFactor: 0.4, threeBetFactor: 1.0, defendFactor: 1.3,
    positional: pos6to8({ UTG: 0.5, MP: 0.7, CO: 1.0, BTN: 1.6, SB: 1.2 }),
    cbetFactor: 0.82, barrelTurn: 0.24, barrelRiver: 0.13, bluffFactor: 1.0, aggression: 0.7,
    multiwayReduction: 0.2, stickiness: 0.45,
    adaptability: 1.0, icmSensitivity: 1.0, skill: 0.85, shoveMaxBB: 15,
  },
  {
    id: "spewy",
    name: "Spewy Recreativo",
    archetype: "spewy",
    description: "Solto e impulsivo, mas humano: overbluffa às vezes, sem ser aleatório.",
    targetVpip: 37.5, targetPfr: 20, target3bet: 11.5,
    rfiWidth: 1.43, limpFactor: 0.3, coldCallFactor: 2.2, threeBetFactor: 1.92, defendFactor: 1.38,
    positional: pos6to8({ UTG: 0.75, MP: 0.9, CO: 1.1, BTN: 1.4, SB: 1.1 }),
    cbetFactor: 1.18, barrelTurn: 0.45, barrelRiver: 0.34, bluffFactor: 1.6, aggression: 0.9,
    multiwayReduction: 0.1, stickiness: 0.615,
    adaptability: 0.45, icmSensitivity: 0.35, skill: 0.55, shoveMaxBB: 8,
  },
];

export function profileById(id: string): BotProfile {
  const p = PROFILES.find((x) => x.id === id);
  if (!p) throw new Error(`Perfil desconhecido: ${id}`);
  return p;
}

/** Perfil "neutro" (base) — referência de quase-GTO e conselho do herói. */
export const BASELINE_PROFILE: BotProfile = {
  id: "baseline",
  name: "Base (quase-GTO)",
  archetype: "tag",
  description: "Perfil neutro usado como linha de base de comparação.",
  targetVpip: 22, targetPfr: 16, target3bet: 6,
  rfiWidth: 1.0, limpFactor: 0, coldCallFactor: 0.6, threeBetFactor: 1.0, defendFactor: 1.0,
  positional: pos6to8({ UTG: 1, MP: 1, CO: 1, BTN: 1, SB: 1 }),
  cbetFactor: 1.0, barrelTurn: 0.4, barrelRiver: 0.24, bluffFactor: 1.0, aggression: 0.7,
  multiwayReduction: 0.3, stickiness: 0.5,
  adaptability: 0.85, icmSensitivity: 0.85, skill: 1.0, shoveMaxBB: 12,
};

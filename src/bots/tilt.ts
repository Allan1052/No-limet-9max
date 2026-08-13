// ---------------------------------------------------------------------------
// CAMADA 2 — Tilt / estado emocional do bot.
//
// Gente de verdade steama. Depois de perder um pote grande (ou tomar bad beat),
// muitos jogadores soltam a mão (agressão/blefe pra cima); outros, mais
// cautelosos, ENCOLHEM ("scared money"). Aqui cada bot carrega um `tilt` em
// [-1, 1] que muda entre as mãos e DECAI de volta pro zero (a calma volta).
//
//   tilt > 0  → steam: joga mais largo e agressivo (spew).
//   tilt < 0  → medo: aperta, blefa menos, paga menos.
//
// A "proneness" por arquétipo decide a direção e a força: o Doidão steama feio;
// o nit, ao perder grande, fica AINDA mais travado (proneness negativa).
//
// Módulo PURO. O controller guarda o estado por assento e chama estas funções.
// ---------------------------------------------------------------------------

import type { BotProfile } from "./profiles";
import type { Archetype } from "./profiles";

export interface TiltState {
  /** -1 (apavorado) … 0 (calmo) … 1 (steaming). */
  level: number;
}

export function freshTilt(): TiltState {
  return { level: 0 };
}

/** Quão sujeito ao tilt cada arquétipo é (negativo = encolhe ao perder). */
const PRONENESS: Record<Archetype, number> = {
  spewy: 1.0,
  station: 0.7,
  recreativo: 0.6,
  shover: 0.45,
  lag: 0.4,
  abc: 0.25,
  tag: 0.18,
  nit: -0.35,
};

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/**
 * Atualiza o tilt após uma mão. `lossFrac` é a fração do stack perdida no pote
 * (0..1+; negativo = ganhou). `bigPot` marca um pote realmente grande (dá mais
 * carga emocional). Perder grande empurra na direção da proneness do arquétipo.
 */
export function updateTilt(
  state: TiltState,
  archetype: Archetype,
  lossFrac: number,
  bigPot: boolean,
): TiltState {
  const prone = PRONENESS[archetype] ?? 0.3;
  let level = state.level;
  if (lossFrac > 0.15) {
    // Perdeu uma fatia relevante: carrega o tilt na direção do arquétipo.
    const charge = Math.min(1, lossFrac) * (bigPot ? 1 : 0.6);
    level += prone * charge;
  } else if (lossFrac < -0.25) {
    // Ganhou um pote gordo: a maioria "assenta" (volta pro zero); alguns soltam.
    level += prone * 0.15; // efeito pequeno
  }
  return { level: clamp(level, -1, 1) };
}

/** Decai o tilt de volta pro zero a cada mão (a calma volta). */
export function decayTilt(state: TiltState, rate = 0.5): TiltState {
  const level = Math.abs(state.level) < 0.02 ? 0 : state.level * rate;
  return { level };
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Aplica o efeito do tilt no perfil (steam solta; medo aperta). */
export function tiltAdjust(p: BotProfile, tilt: TiltState): BotProfile {
  const f = tilt.level;
  if (f === 0) return p;
  return {
    ...p,
    bluffFactor: Math.max(0, p.bluffFactor * (1 + 0.7 * f)),
    aggression: clamp01(p.aggression * (1 + 0.5 * f)),
    rfiWidth: p.rfiWidth * (1 + 0.35 * f),
    threeBetFactor: p.threeBetFactor * (1 + 0.5 * f),
    coldCallFactor: p.coldCallFactor * (1 + 0.3 * f),
    stickiness: clamp01(p.stickiness * (1 + 0.4 * f)),
  };
}

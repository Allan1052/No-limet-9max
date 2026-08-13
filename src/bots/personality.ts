// ---------------------------------------------------------------------------
// CAMADA 1 — Personalidade única por bot.
//
// Antes, todo bot de um arquétipo usava o MESMO objeto de perfil → dois
// "Furacão" na mesa eram clones perfeitos, e o recreativo decorava o padrão em
// 2-3 mãos. Aqui cada bot recebe uma "impressão digital": o perfil-base é
// perturbado por um jitter SEMEADO pelo bot (estável na sessão), então cada um
// vira um ponto distinto no espaço de estilo.
//
// O jitter é CONSCIENTE DA DUREZA DO CAMPO (toughness 0..1):
//   • micro  → o SKILL varia muito (uns peixes totais, uns semi-regs).
//   • elite  → o skill fica num cluster ALTO, mas o ESTILO varia mais (cada
//     regular joga diferente: um mais 3-bet, outro mais passivo-armadilha).
//
// Módulo PURO: recebe perfil + semente + dureza, devolve um perfil novo. A
// ligação (semear cada assento) é feita em field.ts / gameController.
// ---------------------------------------------------------------------------

import type { BotProfile } from "./profiles";
import { seededRng } from "../engine/cards";

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Semente estável derivada do nome + assento — usada quando o bot não tem
 *  `personalitySeed` (ex.: torneio restaurado de um save antigo). */
export function seedFromName(name: string, seat: number): number {
  let h = (2166136261 ^ (seat + 1)) >>> 0;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  return (h >>> 0) || 1;
}

/**
 * Devolve uma cópia PERSONALIZADA do perfil. `seed` identifica o bot (estável
 * na sessão); `toughness` (0..1) é a dureza do campo, que molda o quanto o
 * skill varia (muito no micro, pouco na elite) e o quanto o estilo varia (mais
 * na elite). Sem semente (0/undefined) devolve o perfil intacto.
 */
export function personalize(base: BotProfile, seed: number, toughness = 0): BotProfile {
  if (!seed) return base;
  const t = clamp01(toughness);
  const rng = seededRng(seed >>> 0);
  // jitter simétrico ~ Uniforme(1-spread, 1+spread).
  const j = (spread: number) => 1 + (rng() * 2 - 1) * spread;

  // Campo mole: skill dispersa (peixe↔semi-reg). Campo duro: skill em cluster.
  const skillSpread = 0.3 * (1 - t) + 0.05 * t;
  // Estilo varia SEMPRE, e um pouco MAIS na elite (regs distintos entre si).
  const styleSpread = 0.18 + 0.1 * t;

  return {
    ...base,
    rfiWidth: base.rfiWidth * j(styleSpread),
    threeBetFactor: base.threeBetFactor * j(styleSpread),
    coldCallFactor: base.coldCallFactor * j(styleSpread),
    defendFactor: base.defendFactor * j(styleSpread * 0.7),
    cbetFactor: base.cbetFactor * j(styleSpread * 0.8),
    barrelTurn: clamp01(base.barrelTurn * j(styleSpread)),
    barrelRiver: clamp01(base.barrelRiver * j(styleSpread)),
    bluffFactor: base.bluffFactor * j(styleSpread),
    aggression: clamp01(base.aggression * j(styleSpread)),
    stickiness: clamp01(base.stickiness * j(styleSpread * 0.7)),
    skill: clamp01(base.skill * j(skillSpread)),
  };
}

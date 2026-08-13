// ---------------------------------------------------------------------------
// CAMADA 3 — Adaptação ao herói (o oponente te estuda).
//
// Um regular de verdade te observa e te EXPLORA. Aqui o bot lê as suas
// estatísticas acumuladas (VPIP, PFR, 3-bet) e ajusta o estilo pra cima de você:
//   • Você folda demais / joga apertado (VPIP baixo)  → ele rouba e 3-beta MAIS.
//   • Você paga demais / joga solto (VPIP alto)        → ele blefa MENOS, valoriza.
//   • Você é passivo (VPIP≫PFR, quase não aumenta)     → ele aposta/barrela MAIS.
//   • Você quase não 3-beta                            → ele abre MAIS largo.
//
// A força da adaptação escala pelo SKILL do bot (peixe não adapta; reg adapta
// rápido) e pelo TAMANHO DA AMOSTRA (precisa de mãos pra ter uma leitura).
//
// Módulo PURO. As frequências vêm de feedback/stats (this.stats[heroSeat]).
// ---------------------------------------------------------------------------

import type { BotProfile } from "./profiles";

export interface HeroRead {
  /** Mãos observadas (tamanho da amostra). */
  hands: number;
  /** VPIP do herói (0..1). */
  vpip: number;
  /** PFR do herói (0..1). */
  pfr: number;
  /** 3-bet do herói (0..1). */
  threeBet: number;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/**
 * Ajusta o perfil para EXPLORAR o herói. Sem amostra suficiente (ou skill
 * baixo), devolve o perfil intacto — peixe não lê ninguém.
 */
export function adaptToHero(p: BotProfile, read: HeroRead, skill: number): BotProfile {
  // Peso da adaptação: skill × confiança na amostra (satura ~28 mãos).
  const confidence = Math.min(1, Math.max(0, (read.hands - 8) / 20));
  const w = clamp01(skill) * confidence;
  if (w <= 0.02) return p;

  let bluffMul = 1;
  let stealMul = 1;
  let threeBetMul = 1;

  // Solto/paga-tudo: não adianta blefar — reduz blefe, mantém valor.
  if (read.vpip > 0.34) bluffMul *= 1 - 0.45 * w;
  // Apertado/nit: pune com roubo e 3-bet.
  if (read.vpip < 0.16) {
    stealMul *= 1 + 0.5 * w;
    threeBetMul *= 1 + 0.5 * w;
  }
  // Passivo (entra mas quase não aumenta): barrela mais, ele desiste.
  if (read.vpip - read.pfr > 0.18) bluffMul *= 1 + 0.35 * w;
  // Não defende com 3-bet: abre mais largo contra ele.
  if (read.threeBet < 0.04) stealMul *= 1 + 0.3 * w;

  const positional = { ...p.positional };
  for (const pos of Object.keys(positional) as (keyof typeof positional)[]) {
    positional[pos] = positional[pos] * stealMul;
  }

  return {
    ...p,
    positional,
    rfiWidth: p.rfiWidth * stealMul,
    threeBetFactor: p.threeBetFactor * threeBetMul,
    bluffFactor: Math.max(0, p.bluffFactor * bluffMul),
    cbetFactor: p.cbetFactor * (bluffMul > 1 ? 1 + 0.5 * (bluffMul - 1) : 1),
  };
}

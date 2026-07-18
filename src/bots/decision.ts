// ---------------------------------------------------------------------------
// Cérebro pós-flop.
//
// Toda decisão nasce de uma comparação honesta entre DUAS coisas:
//   1) a equity da mão do herói contra o range estimado do vilão (via Monte
//      Carlo, no board atual);
//   2) o preço que o pote oferece (pot odds) e/ou o valor de apostar.
//
// A partir daí, calibramos com:
//   - textura do board (seco → aposta barata e frequente; molhado → maior e
//     menos blefe);
//   - posição (em posição realiza-se mais equity);
//   - perfil (agressão, frequência de c-bet e de blefe distinguem os 8 bots).
//
// Nada de regras soltas: se a equity não paga o preço, não se paga; blefes têm
// frequência controlada e só com alguma equity/projeto. É forte e explicável,
// não um solver — as frequências são heurísticas transparentes.
// ---------------------------------------------------------------------------

import type { Card } from "../engine/cards";
import { equityHandVsRange } from "../engine/equity";
import type { BotProfile } from "./profiles";
import { buildTopRange } from "../ranges/build";
import { rangeCombos } from "../ranges/types";
import { classifyBoard, type BoardTexture } from "./boardTexture";

export type PostflopAct = "check" | "bet" | "call" | "raise" | "fold";

export interface PostflopContext {
  hand: Card[];
  board: Card[];
  potSize: number;
  /** Fichas para pagar (0 quando a ação está passada até o herói). */
  toCall: number;
  heroStack: number;
  inPosition: boolean;
  numOpponents: number;
  profile: BotProfile;
  /** O herói foi o agressor do pré-flop (leva iniciativa de c-bet)? */
  wasPreflopAggressor: boolean;
  /** Largura estimada do range do vilão (0..1). Default 0.45. */
  villainRangePct?: number;
  rng?: () => number;
  equityIterations?: number;
}

export interface PostflopDecision {
  action: PostflopAct;
  /** Para bet/raise: tamanho como fração do pote. */
  sizeToPot?: number;
  equity: number;
  requiredEquity: number;
  texture: BoardTexture;
  reason: string;
}

/** Tamanho de aposta por textura: seco aposta pequeno, molhado aposta grande. */
function sizeForTexture(texture: BoardTexture): number {
  return Math.round((0.33 + 0.4 * texture.wetness) * 100) / 100; // 0.33..0.73 do pote
}

export function postflopDecision(ctx: PostflopContext): PostflopDecision {
  const rng = ctx.rng ?? Math.random;
  const iters = ctx.equityIterations ?? 1500;
  const numOpp = Math.max(1, ctx.numOpponents);
  const texture = classifyBoard(ctx.board);

  // Equity do herói contra o range do vilão, no board atual.
  const villainPct = ctx.villainRangePct ?? 0.45;
  const villainRange = rangeCombos(buildTopRange(villainPct));
  const eqHU = equityHandVsRange(ctx.hand, villainRange, ctx.board, iters, rng).equity;
  // Aproximação multiway: precisa bater todos → potência pelo nº de oponentes.
  const equity = Math.pow(eqHU, numOpp);

  // Em posição realiza-se mais equity (controla o tamanho do pote, vê mais showdowns).
  const realization = ctx.inPosition ? 1.05 : 0.9;
  const effEquity = Math.min(1, equity * realization);

  const size = sizeForTexture(texture);

  // ---------- Caso A: há uma aposta para pagar ----------
  if (ctx.toCall > 0) {
    const potOdds = ctx.toCall / (ctx.potSize + ctx.toCall);

    if (equity >= 0.78) {
      return decision("raise", size, equity, potOdds, texture,
        `Mão muito forte (equity ${pct(equity)} vs range): aumenta por valor.`);
    }

    if (effEquity >= potOdds) {
      // Preço compensa. Mão forte às vezes aumenta (valor/proteção); senão paga.
      const raiseProb = 0.25 + 0.4 * ctx.profile.aggression;
      if (equity >= 0.66 && rng() < raiseProb) {
        return decision("raise", size, equity, potOdds, texture,
          `Mão forte (equity ${pct(equity)} ≥ odds ${pct(potOdds)}): aumenta por valor/proteção.`);
      }
      return decision("call", undefined, equity, potOdds, texture,
        `Equity ${pct(equity)} paga as odds de ${pct(potOdds)}: paga.`);
    }

    // Sem preço direto: considerar aumento de blefe/semi-blefe (só com projeto).
    const semibluffProb = ctx.profile.bluffFactor * 0.18 * texture.wetness;
    if (effEquity >= potOdds * 0.7 && rng() < semibluffProb) {
      return decision("raise", size, equity, potOdds, texture,
        `Semi-blefe: equity ${pct(equity)} com projeto em board molhado (perfil ${ctx.profile.archetype}).`);
    }
    return decision("fold", undefined, equity, potOdds, texture,
      `Equity ${pct(equity)} não paga as odds de ${pct(potOdds)}: fold.`);
  }

  // ---------- Caso B: ação passada até o herói (pode apostar ou dar check) ----------
  if (equity >= 0.6) {
    return decision("bet", size, equity, 0, texture,
      `Mão de valor (equity ${pct(equity)} vs range): aposta ${Math.round(size * 100)}% do pote.`);
  }

  // C-bet de blefe: mais frequente em board seco e com iniciativa; menos molhado.
  const dryness = 1 - texture.wetness;
  let baseCbet = 0.35 + 0.35 * dryness; // 0.35 (molhado) .. 0.70 (seco)
  if (ctx.wasPreflopAggressor) baseCbet += 0.1;
  if (!ctx.inPosition) baseCbet -= 0.05;
  const cbetProb = Math.max(0, Math.min(0.9, baseCbet * ctx.profile.cbetFactor));

  if (equity >= 0.25 && rng() < cbetProb) {
    return decision("bet", size, equity, 0, texture,
      `Blefe/semi-blefe: c-bet ${Math.round(size * 100)}% em board ${texture.wetness < 0.4 ? "seco" : "molhado"} (perfil ${ctx.profile.archetype}).`);
  }

  return decision("check", undefined, equity, 0, texture,
    `Equity ${pct(equity)} insuficiente para valor e não blefa aqui: check.`);
}

function decision(
  action: PostflopAct,
  sizeToPot: number | undefined,
  equity: number,
  requiredEquity: number,
  texture: BoardTexture,
  reason: string,
): PostflopDecision {
  return { action, sizeToPot, equity, requiredEquity, texture, reason };
}

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

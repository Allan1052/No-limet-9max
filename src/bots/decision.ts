// ---------------------------------------------------------------------------
// Cérebro pós-flop.
// ---------------------------------------------------------------------------

import type { Card } from "../engine/cards";
import {
  equityHandVsRange,
  equityHandVsRangeMulti,
  equityOmahaHandVsRange,
  equityOmahaMultiway,
} from "../engine/equity";
import { detectDraw } from "../engine/draws";
import type { BotProfile } from "./profiles";
import { buildTopRange } from "../ranges/build";
import { omahaPreflopScore } from "../ranges/omahaPreflop";
import { rangeCombos } from "../ranges/types";
import { requiredEquityToCall, type IcmSpot } from "../ranges/icm";
import { postflopRequiredEquity } from "../ranges/postflopMath";
import { classifyBoard, type BoardTexture } from "./boardTexture";
import { sizingV2 } from "./sizingV2";

export type PostflopAct = "check" | "bet" | "call" | "raise" | "fold";

export interface ActionFreq { action: PostflopAct; freq: number; }

export interface PostflopContext {
  hand: Card[];
  board: Card[];
  potSize: number;
  toCall: number;
  heroStack: number;
  inPosition: boolean;
  numOpponents: number;
  profile: BotProfile;
  wasPreflopAggressor: boolean;
  hasInitiative?: boolean;
  villainRangePct?: number;
  icmSpot?: IcmSpot;
  rng?: () => number;
  equityIterations?: number;
  variant?: "holdem" | "omaha";
}

export interface PostflopDecision {
  action: PostflopAct;
  sizeToPot?: number;
  equity: number;
  requiredEquity: number;
  texture: BoardTexture;
  reason: string;
  villainRangePct: number;
  mix: ActionFreq[];
}

function clamp(x: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, x)); }

function cleanMix(entries: ActionFreq[]): ActionFreq[] {
  const kept = entries.filter((e) => e.freq > 0.005);
  const sum = kept.reduce((s, e) => s + e.freq, 0) || 1;
  return kept.map((e) => ({ action: e.action, freq: Math.round((e.freq / sum) * 100) / 100 })).sort((a, b) => b.freq - a.freq);
}

export function postflopDecision(ctx: PostflopContext): PostflopDecision {
  const rng = ctx.rng ?? Math.random;
  const iters = ctx.equityIterations ?? 1500;
  const numOpp = Math.max(1, ctx.numOpponents);
  const texture = classifyBoard(ctx.board);
  const streetIdx: 0 | 1 | 2 = ctx.board.length >= 5 ? 2 : ctx.board.length === 4 ? 1 : 0;
  let villainPct = ctx.villainRangePct ?? 0.45;
  const isAllInCallHero = ctx.toCall > 0 && ctx.toCall >= ctx.heroStack;
  if (isAllInCallHero && ctx.heroStack > 0 && ctx.heroStack <= 1500) villainPct = Math.min(0.6, villainPct * 1.4);
  const isOmaha = ctx.variant === "omaha";

  let equity: number;
  if (isOmaha) {
    if (numOpp <= 1) {
      const omahaRange = buildOmahaRange(villainPct, rng, ctx.hand, ctx.board);
      equity = equityOmahaHandVsRange(ctx.hand, omahaRange, ctx.board, iters, rng).equity;
    } else {
      const hands = [ctx.hand, ...Array.from({ length: numOpp }, () => randomOmahaHand(ctx.hand, ctx.board, rng))];
      equity = equityOmahaMultiway(hands, ctx.board, iters, rng).equity;
    }
  } else {
    const villainRange = rangeCombos(buildTopRange(villainPct));
    equity = numOpp <= 1
      ? equityHandVsRange(ctx.hand, villainRange, ctx.board, iters, rng).equity
      : equityHandVsRangeMulti(ctx.hand, villainRange, numOpp, ctx.board, iters, rng).equity;
  }

  const isAllInSpot = ctx.toCall >= ctx.heroStack || (ctx.potSize > 0 && ctx.toCall > 0 && ctx.heroStack <= ctx.toCall * 1.5);
  const realization = isAllInSpot ? 1.0 : (ctx.inPosition ? 1.05 : 0.9);
  const effEquity = Math.min(1, equity * realization);
  const spr = ctx.potSize > 0 ? ctx.heroStack / ctx.potSize : 20;
  const rangeAdvantage = clamp(0.45 - villainPct, -0.3, 0.3);
  const nutAdvantage = clamp((equity - 0.5) * 0.5, -0.4, 0.4);
  const size = sizingV2({ wetness: texture.wetness, streetIdx, equity, spr, rangeAdvantage, nutAdvantage });

  if (ctx.toCall > 0) {
    const potOdds = ctx.toCall / (ctx.potSize + ctx.toCall);
    const isAllInCall = ctx.toCall >= ctx.heroStack;
    let required = potOdds;
    let icmNote = "";
    if (isAllInCall && ctx.icmSpot) {
      const icmReq = requiredEquityToCall(ctx.icmSpot);
      if (icmReq > required) { required = icmReq; icmNote = ` [ICM exige ${pct(icmReq)}]`; }
    }
    if (!isAllInCall) {
      const draw = streetIdx < 2 && ctx.variant !== "omaha" ? detectDraw(ctx.hand, ctx.board) : { strength: 0 };
      required = postflopRequiredEquity({ potBB: ctx.potSize, toCall: ctx.toCall, streetIdx, stickiness: ctx.profile.stickiness, numOpp, drawStrength: draw.strength, heroStackBehind: Math.max(0, ctx.heroStack - ctx.toCall) });
    }
    const margin = effEquity - required;
    const continueP = clamp(0.5 + margin * 3.2, 0, 1);
    let raiseShare = 0;
    if (equity >= 0.78) raiseShare = 0.85;
    else if (equity >= 0.62 && !isAllInCall) raiseShare = 0.2 + 0.4 * ctx.profile.aggression;
    else if (!isAllInCall && texture.wetness > 0.45 && effEquity >= required * 0.7) raiseShare = 0.1 + 0.25 * ctx.profile.bluffFactor * texture.wetness;
    const raiseP = isAllInCall ? 0 : continueP * raiseShare;
    const mix = cleanMix([{ action: "fold", freq: 1 - continueP }, { action: "call", freq: continueP - raiseP }, { action: "raise", freq: raiseP }]);
    if (equity >= Math.max(0.78, required + 0.12)) return decision("raise", size, equity, required, texture, villainPct, mix, `Mão muito forte (equity ${pct(equity)} vs range): aumenta por valor.${icmNote}`);
    if (effEquity >= required) {
      const raiseProb = 0.25 + 0.4 * ctx.profile.aggression;
      if (equity >= 0.66 && !isAllInCall && rng() < raiseProb) return decision("raise", size, equity, required, texture, villainPct, mix, `Mão forte (equity ${pct(equity)} ≥ ${pct(required)}): aumenta por valor/proteção.${icmNote}`);
      return decision("call", undefined, equity, required, texture, villainPct, mix, `Equity ${pct(equity)} paga o preço de ${pct(required)}: paga.${icmNote}`);
    }
    const drawForBluff = streetIdx < 2 && ctx.variant !== "omaha" ? detectDraw(ctx.hand, ctx.board) : { strength: 0 };
    const hasRealDraw = drawForBluff.strength > 0.5;
    const semibluffProb = ctx.profile.bluffFactor * 0.18 * texture.wetness;
    if (!isAllInCall && hasRealDraw && effEquity >= required * 0.7 && rng() < semibluffProb) return decision("raise", size, equity, required, texture, villainPct, mix, `Semi-blefe: equity ${pct(equity)} com projeto em board molhado (perfil ${ctx.profile.archetype}).`);
    return decision("fold", undefined, equity, required, texture, villainPct, mix, `Equity ${pct(equity)} abaixo do preço ${pct(required)}: fold.${icmNote}`);
  }

  const valueThreshold = 0.57 - 0.08 * ctx.profile.aggression;
  const valueMargin = equity - valueThreshold;
  let betP: number;
  if (valueMargin >= 0) betP = clamp(0.65 + valueMargin * 1.5, 0.55, 0.98);
  else {
    const initiative = ctx.wasPreflopAggressor || ctx.hasInitiative;
    const baseBluff = initiative ? ctx.profile.cbetFreq : ctx.profile.bluffFactor * 0.18;
    const dryBonus = 1.15 - 0.55 * texture.wetness;
    betP = clamp(baseBluff * dryBonus, 0, 0.65);
  }
  const mix = cleanMix([{ action: "bet", freq: betP }, { action: "check", freq: 1 - betP }]);
  if (equity >= valueThreshold) {
    if (rng() < betP) return decision("bet", size, equity, 0, texture, villainPct, mix, `Equity ${pct(equity)} suficiente para apostar por valor/proteção.`);
    return decision("check", undefined, equity, 0, texture, villainPct, mix, `Mix de valor: controla parte do range com check.`);
  }
  if (rng() < betP) return decision("bet", size, equity, 0, texture, villainPct, mix, `Blefe/semi-blefe coerente com iniciativa, perfil e textura.`);
  return decision("check", undefined, equity, 0, texture, villainPct, mix, `Equity ${pct(equity)} insuficiente para valor e sem blefe rentável aqui: check.`);
}

function decision(action: PostflopAct, sizeToPot: number | undefined, equity: number, requiredEquity: number, texture: BoardTexture, villainRangePct: number, mix: ActionFreq[], reason: string): PostflopDecision {
  return { action, sizeToPot, equity, requiredEquity, texture, villainRangePct, mix, reason };
}
function pct(x: number): string { return `${Math.round(x * 100)}%`; }
function randomOmahaHand(hero: Card[], board: Card[], rng: () => number): Card[] {
  const suits = ["s", "h", "d", "c"] as const; const ranks = ["2","3","4","5","6","7","8","9","T","J","Q","K","A"] as const;
  const used = new Set([...hero, ...board].map(c => `${c.rank}${c.suit}`)); const deck: Card[] = [];
  for (const r of ranks) for (const s of suits) if (!used.has(`${r}${s}`)) deck.push({ rank: r, suit: s });
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  return deck.slice(0, 4);
}
function buildOmahaRange(pctRange: number, rng: () => number, hero: Card[], board: Card[]): Card[][] {
  const count = Math.max(20, Math.floor(pctRange * 200)); const hands: Card[][] = [];
  for (let i = 0; i < count; i++) { const h = randomOmahaHand(hero, board, rng); if (omahaPreflopScore(h) >= 0) hands.push(h); }
  return hands;
}

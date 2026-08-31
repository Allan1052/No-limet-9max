// ---------------------------------------------------------------------------
// Ponte entre a decisão de pré-flop (baseada em perfil) e o motor de jogo.
// ---------------------------------------------------------------------------

import { profileById, BASELINE_PROFILE, adjustProfileForBuyIn, buyInToughness, type BotProfile } from "./profiles";
import { personalize, seedFromName } from "./personality";
import { tiltAdjust, type TiltState } from "./tilt";
import { adaptToHero, type HeroRead } from "./adapt";
import { seatPositions } from "./seatPosition";
import { preflopDecision, type PreflopContext } from "../ranges/preflop";
import { legalActions } from "../game/betting";
import { totalPot } from "../game/engine";
import { seededRng } from "../engine/cards";
import type { Action } from "../game/engine";
import type { IcmSpot } from "../ranges/icm";
import type { TableState } from "../game/state";

export interface BotContext {
  payouts?: number[];
  buyIn?: number;
  tilt?: TiltState;
  heroRead?: HeroRead;
}

export function effectiveProfile(
  base: BotProfile,
  seat: number,
  p: { profileId?: string; name: string; personalitySeed?: number },
  ctx: BotContext,
): BotProfile {
  const adjusted = adjustProfileForBuyIn(base, ctx.buyIn);
  if (!p.profileId) return adjusted;
  let prof = personalize(adjusted, p.personalitySeed ?? seedFromName(p.name, seat), buyInToughness(ctx.buyIn));
  if (ctx.tilt) prof = tiltAdjust(prof, ctx.tilt);
  if (ctx.heroRead) prof = adaptToHero(prof, ctx.heroRead, prof.skill);
  return prof;
}

function effectiveBB(t: TableState, seat: number): number {
  const me = t.players[seat];
  let maxOpp = 0;
  for (const p of t.players) {
    if (p.seat === seat) continue;
    if (p.status === "active" || p.status === "allin") maxOpp = Math.max(maxOpp, p.stack + p.committed);
  }
  const eff = Math.min(me.stack + me.committed, maxOpp || me.stack + me.committed);
  return eff / t.bigBlind;
}

function buildIcmSpot(t: TableState, seat: number, payouts?: number[]): IcmSpot | undefined {
  if (!payouts || payouts.length === 0) return undefined;
  const live = t.players.filter((p) => p.status !== "out");
  const filteredSeats = live.map((p) => p.seat);
  const heroIdx = filteredSeats.indexOf(seat);
  if (heroIdx < 0) return undefined;

  // Estado de fold: só as fichas que ainda estão atrás. O que já foi investido
  // é custo afundado e não volta para o stack do Hero.
  const stacks = live.map((p) => p.stack);

  // O vilão do ICM é o agressor real dentro da mesma lista filtrada.
  let villainIdx = t.lastAggressor >= 0 ? filteredSeats.indexOf(t.lastAggressor) : -1;
  if (villainIdx < 0 || villainIdx === heroIdx) {
    villainIdx = live.findIndex((p, i) => i !== heroIdx && (p.status === "active" || p.status === "allin"));
  }
  if (villainIdx < 0) return undefined;

  const hero = live[heroIdx];
  const villain = live[villainIdx];
  // Risco do confronto Hero-vilão, nunca o menor stack de um terceiro alheio.
  const heroAvailable = hero.stack;
  const villainAvailable = villain.stack + villain.committed;
  const chips = Math.max(0, Math.min(heroAvailable, villainAvailable));

  return { stacks, payouts, hero: heroIdx, villain: villainIdx, chips };
}

export function preflopContextFor(
  t: TableState,
  seat: number,
  profile: BotProfile,
  ctx: BotContext = {},
): PreflopContext {
  const p = t.players[seat];
  const positions = seatPositions(t);
  const heroPosition = positions.get(seat) ?? "MP";
  const facingRaise = t.currentBet > t.bigBlind && t.lastAggressor >= 0;
  const raiserPosition = facingRaise ? positions.get(t.lastAggressor) : undefined;
  const limpers = facingRaise ? 0 : t.players.filter((o) => o.seat !== seat && (o.status === "active" || o.status === "allin") && o.committed === t.bigBlind && positions.get(o.seat) !== "BB").length;
  const allInsAhead = t.players.filter((o) => o.seat !== seat && o.status === "allin").length;
  const betLevelFaced = t.preflopRaises;
  const bb = t.bigBlind || 1;
  const toCall = Math.max(0, t.currentBet - p.committed);
  const callAmt = Math.min(toCall, p.stack);
  const heroTotal = p.totalCommitted + callAmt;
  let contestable = p.totalCommitted;
  let numContesting = 0;
  for (const o of t.players) {
    if (o.seat === seat) continue;
    contestable += Math.min(o.totalCommitted, heroTotal);
    const contests = o.status === "allin" || (o.status === "active" && o.committed >= t.currentBet && o.committed > t.bigBlind);
    if (contests) numContesting++;
  }
  if (numContesting === 0 && toCall > 0) numContesting = 1;
  const seed = (((p.holeCards[0] ?? 0) + 1) * 2654435761 + ((p.holeCards[1] ?? 0) + 1) * 40503 + Math.round(t.currentBet) * 2246822519) >>> 0;

  return {
    heroPosition,
    hand: p.holeCards,
    effectiveBB: effectiveBB(t, seat),
    profile,
    raiserPosition,
    openSizeBB: facingRaise ? t.currentBet / t.bigBlind : undefined,
    limpers,
    allInsAhead,
    betLevelFaced,
    threeBet: betLevelFaced >= 2,
    contestablePotBB: contestable / bb,
    callAmountBB: callAmt / bb,
    numContesting,
    potBB: totalPot(t) / bb,
    anteBB: t.ante > 0 ? (t.ante * t.players.filter((o) => o.status !== "out").length) / bb : undefined,
    rng: seededRng(seed),
    // Fichas que o herói já investiu nesta mão (custo afundado se foldar) — o ICM
    // incremental usa isto pra avaliar foldar-agora × pagar-agora do ponto atual.
    heroCommittedBB: p.totalCommitted / bb,
    icmSpot: buildIcmSpot(t, seat, ctx.payouts),
    variant: t.variant ?? "holdem",
  };
}

export function botPreflopAction(t: TableState, seat: number, ctx: BotContext = {}): Action {
  const p = t.players[seat];
  const base: BotProfile = p.profileId ? profileById(p.profileId) : BASELINE_PROFILE;
  const profile = effectiveProfile(base, seat, p, ctx);
  const la = legalActions(t);
  const decision = preflopDecision(preflopContextFor(t, seat, profile, ctx));
  return toEngineAction(t, decision.action, decision.sizeBB, la);
}

function toEngineAction(t: TableState, action: string, sizeBB: number, la: ReturnType<typeof legalActions>): Action {
  switch (action) {
    case "fold": return la.canCheck ? { type: "check" } : { type: "fold" };
    case "call":
      if (la.canCheck) return { type: "check" };
      return la.canCall ? { type: "call" } : { type: "fold" };
    case "jam": return { type: "allin" };
    case "raise":
    case "3bet": {
      if (!la.canRaise) return la.canCall ? { type: "call" } : { type: "check" };
      let to = Math.round(sizeBB * t.bigBlind);
      to = Math.max(to, la.minRaiseTo);
      to = Math.min(to, la.maxRaiseTo);
      if (to >= la.maxRaiseTo) return { type: "allin" };
      return { type: "raise", to };
    }
    default: return la.canCheck ? { type: "check" } : { type: "fold" };
  }
}

// ---------------------------------------------------------------------------
// Ponte entre o cérebro pós-flop e o motor de jogo.
//
// Monta o contexto pós-flop a partir do estado da mesa (posição, pote, preço,
// nº de oponentes, agressor do pré-flop), chama `postflopDecision` e traduz o
// resultado numa ação válida do motor, respeitando `legalActions`.
// ---------------------------------------------------------------------------

import { profileById, BASELINE_PROFILE, type BotProfile } from "./profiles";
import { postflopDecision, type PostflopContext } from "./decision";
import { estimateVillainRangePct } from "./villainRange";
import { legalActions } from "../game/betting";
import { totalPot } from "../game/engine";
import type { Action } from "../game/engine";
import { inHandSeats, type TableState } from "../game/state";
import type { IcmSpot } from "../ranges/icm";

/** Monta um IcmSpot do confronto herói×vilão a partir do estado, se houver prêmios. */
function buildPostflopIcmSpot(
  t: TableState,
  seat: number,
  payouts?: number[],
): IcmSpot | undefined {
  if (!payouts || payouts.length === 0) return undefined;
  const inPlay = t.players.filter((p) => p.status !== "out");
  const stacks = inPlay.map((p) => p.stack + p.committed);
  const seatsList = inPlay.map((p) => p.seat);
  const heroIdx = seatsList.indexOf(seat);
  if (heroIdx < 0) return undefined;
  // Vilão: o último agressor (quem nos coloca em all-in), senão o maior stack.
  let villainSeat = t.lastAggressor >= 0 && t.lastAggressor !== seat ? t.lastAggressor : -1;
  if (villainSeat < 0) {
    let best = -1;
    for (const p of inPlay) if (p.seat !== seat && p.stack + p.committed > best) {
      best = p.stack + p.committed;
      villainSeat = p.seat;
    }
  }
  const villainIdx = seatsList.indexOf(villainSeat);
  if (villainIdx < 0 || villainIdx === heroIdx) return undefined;
  const hero = t.players[seat];
  return {
    stacks,
    payouts,
    hero: heroIdx,
    villain: villainIdx,
    chips: Math.min(stacks[heroIdx], stacks[villainIdx], hero.stack + hero.committed),
  };
}

/** Assentos ainda na mão (com cartas), na ordem de ação pós-flop (SB→BTN). */
function postflopOrderIndex(seat: number, buttonSeat: number, n: number): number {
  return (seat - buttonSeat - 1 + n) % n; // 0 = primeiro a agir (SB), maior = age por último
}

/** O herói age por último entre os que ainda estão na mão? (em posição) */
function isInPosition(t: TableState, seat: number): boolean {
  const n = t.players.length;
  const mine = postflopOrderIndex(seat, t.buttonSeat, n);
  for (const s of inHandSeats(t)) {
    if (s === seat) continue;
    if (postflopOrderIndex(s, t.buttonSeat, n) > mine) return false;
  }
  return true;
}

/** Monta o contexto pós-flop de um assento (reaproveitado pelo feedback). */
export function postflopContextFor(
  t: TableState,
  seat: number,
  profile: BotProfile,
  rng: () => number = Math.random,
  equityIterations?: number,
  payouts?: number[],
): PostflopContext {
  const p = t.players[seat];
  const la = legalActions(t);
  const inHand = inHandSeats(t);
  return {
    hand: p.holeCards,
    board: t.board,
    potSize: totalPot(t),
    toCall: la.callAmount,
    heroStack: p.stack,
    inPosition: isInPosition(t, seat),
    numOpponents: Math.max(1, inHand.length - 1),
    profile,
    wasPreflopAggressor: t.preflopAggressor === seat,
    // Iniciativa: apostou na rua anterior → dá barrel coerente.
    hasInitiative: t.lastStreetAggressor === seat,
    // Range do vilão que estreita rua a rua conforme a linha avança.
    villainRangePct: estimateVillainRangePct(t, seat),
    icmSpot: buildPostflopIcmSpot(t, seat, payouts),
    rng,
    equityIterations,
  };
}

export function botPostflopAction(
  t: TableState,
  seat: number,
  rng: () => number = Math.random,
  equityIterations?: number,
  payouts?: number[],
): Action {
  const p = t.players[seat];
  const profile: BotProfile = p.profileId ? profileById(p.profileId) : BASELINE_PROFILE;
  const la = legalActions(t);
  const decision = postflopDecision(
    postflopContextFor(t, seat, profile, rng, equityIterations, payouts),
  );
  return toEngineAction(t, decision, la);
}

function toEngineAction(
  t: TableState,
  decision: ReturnType<typeof postflopDecision>,
  la: ReturnType<typeof legalActions>,
): Action {
  const pot = totalPot(t);
  switch (decision.action) {
    case "check":
      return la.canCheck ? { type: "check" } : { type: "fold" };
    case "fold":
      return la.canCheck ? { type: "check" } : { type: "fold" };
    case "call":
      if (la.canCheck) return { type: "check" };
      return la.canCall ? { type: "call" } : { type: "fold" };
    case "bet": {
      // Aposta quando a ação está passada (currentBet 0): é um raise a partir de 0.
      if (!la.canRaise) return la.canCheck ? { type: "check" } : { type: "call" };
      let to = Math.round((decision.sizeToPot ?? 0.5) * pot);
      to = Math.max(to, la.minRaiseTo);
      to = Math.min(to, la.maxRaiseTo);
      if (to >= la.maxRaiseTo) return { type: "allin" };
      return { type: "raise", to };
    }
    case "raise": {
      if (!la.canRaise) return la.canCall ? { type: "call" } : { type: "check" };
      // Aumento dimensionado sobre o pote (incluindo o call).
      const potAfterCall = pot + la.callAmount;
      let to = t.currentBet + Math.round((decision.sizeToPot ?? 0.6) * potAfterCall);
      to = Math.max(to, la.minRaiseTo);
      to = Math.min(to, la.maxRaiseTo);
      if (to >= la.maxRaiseTo) return { type: "allin" };
      return { type: "raise", to };
    }
    default:
      return la.canCheck ? { type: "check" } : { type: "fold" };
  }
}

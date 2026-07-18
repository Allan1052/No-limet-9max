// ---------------------------------------------------------------------------
// Ponte entre a decisão de pré-flop (baseada em perfil) e o motor de jogo.
//
// Na vez de um bot, montamos o contexto a partir do estado da mesa, chamamos
// `preflopDecision` (que já considera perfil, posição, profundidade e ICM) e
// traduzimos o resultado numa ação válida do motor (fold/check/call/raise/allin),
// respeitando os limites de `legalActions`.
//
// Enquanto o cérebro pós-flop não existe (próximo bloco), no pós-flop os bots
// usam um comportamento provisório conservador: check quando possível, senão
// pagam apostas pequenas e desistem de apostas grandes.
// ---------------------------------------------------------------------------

import { profileById, BASELINE_PROFILE, type BotProfile } from "./profiles";
import { seatPositions } from "./seatPosition";
import { preflopDecision, type PreflopContext } from "../ranges/preflop";
import { legalActions } from "../game/betting";
import { totalPot } from "../game/engine";
import type { Action } from "../game/engine";
import type { IcmSpot } from "../ranges/icm";
import type { TableState } from "../game/state";

export interface BotContext {
  /** Prêmios do torneio (para ICM), se aplicável. */
  payouts?: number[];
}

/** Profundidade efetiva (em BB) do assento contra o maior adversário na mão. */
function effectiveBB(t: TableState, seat: number): number {
  const me = t.players[seat];
  let maxOpp = 0;
  for (const p of t.players) {
    if (p.seat === seat) continue;
    if (p.status === "active" || p.status === "allin") {
      maxOpp = Math.max(maxOpp, p.stack + p.committed);
    }
  }
  const eff = Math.min(me.stack + me.committed, maxOpp || me.stack + me.committed);
  return eff / t.bigBlind;
}

function buildIcmSpot(t: TableState, seat: number, payouts?: number[]): IcmSpot | undefined {
  if (!payouts || payouts.length === 0) return undefined;
  const stacks = t.players.filter((p) => p.status !== "out").map((p) => p.stack + p.committed);
  const villain = t.lastAggressor >= 0 && t.lastAggressor !== seat ? 1 : 0;
  // Índice do herói dentro da lista filtrada.
  const filteredSeats = t.players.filter((p) => p.status !== "out").map((p) => p.seat);
  const heroIdx = filteredSeats.indexOf(seat);
  return {
    stacks,
    payouts,
    hero: heroIdx,
    villain: villain === heroIdx ? (heroIdx + 1) % stacks.length : villain,
    chips: Math.min(...stacks),
  };
}

/** Monta o contexto pré-flop de um assento (reaproveitado pelo feedback). */
export function preflopContextFor(
  t: TableState,
  seat: number,
  profile: BotProfile,
  ctx: BotContext = {},
): PreflopContext {
  const p = t.players[seat];
  const positions = seatPositions(t);
  const heroPosition = positions.get(seat) ?? "MP";

  // Alguém abriu com raise? (currentBet acima do BB e há um agressor)
  const facingRaise = t.currentBet > t.bigBlind && t.lastAggressor >= 0;
  const raiserPosition = facingRaise ? positions.get(t.lastAggressor) : undefined;

  return {
    heroPosition,
    hand: p.holeCards,
    effectiveBB: effectiveBB(t, seat),
    profile,
    raiserPosition,
    openSizeBB: facingRaise ? t.currentBet / t.bigBlind : undefined,
    icmSpot: buildIcmSpot(t, seat, ctx.payouts),
  };
}

/** Decide a ação de um bot no PRÉ-FLOP. */
export function botPreflopAction(t: TableState, seat: number, ctx: BotContext = {}): Action {
  const p = t.players[seat];
  const profile: BotProfile = p.profileId ? profileById(p.profileId) : BASELINE_PROFILE;
  const la = legalActions(t);
  const decision = preflopDecision(preflopContextFor(t, seat, profile, ctx));
  return toEngineAction(t, decision.action, decision.sizeBB, la);
}

/** Converte a decisão abstrata em ação concreta, respeitando os limites. */
function toEngineAction(
  t: TableState,
  action: string,
  sizeBB: number,
  la: ReturnType<typeof legalActions>,
): Action {
  switch (action) {
    case "fold":
      // Se dá para dar check de graça, checar é sempre melhor que foldar.
      return la.canCheck ? { type: "check" } : { type: "fold" };
    case "call":
      if (la.canCheck) return { type: "check" };
      return la.canCall ? { type: "call" } : { type: "fold" };
    case "jam":
      return { type: "allin" };
    case "raise":
    case "3bet": {
      if (!la.canRaise) return la.canCall ? { type: "call" } : { type: "check" };
      let to = Math.round(sizeBB * t.bigBlind);
      to = Math.max(to, la.minRaiseTo);
      to = Math.min(to, la.maxRaiseTo);
      if (to >= la.maxRaiseTo) return { type: "allin" };
      return { type: "raise", to };
    }
    default:
      return la.canCheck ? { type: "check" } : { type: "fold" };
  }
}

/**
 * Comportamento pós-flop PROVISÓRIO (substituído pelo cérebro pós-flop no
 * próximo bloco): check livre; paga apostas de até ~1/3 do pote; desiste de
 * apostas maiores. Simples e sem pretensão de ser bom — só para as mãos
 * rodarem até o showdown enquanto a Etapa 5 não chega.
 */
export function botPostflopActionPlaceholder(t: TableState, _seat: number): Action {
  const la = legalActions(t);
  if (la.canCheck) return { type: "check" };
  if (la.canCall) {
    const pot = totalPot(t);
    if (la.callAmount <= pot / 3) return { type: "call" };
    return { type: "fold" };
  }
  return { type: "fold" };
}

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
  /** Prêmios do torneio (para ICM), se aplicável. */
  payouts?: number[];
  /** Buy-in do torneio: ajusta o campo (stakes altas jogam mais apertado-agressivo). */
  buyIn?: number;
  /** Estado emocional do bot (Camada 2 — tilt). */
  tilt?: TiltState;
  /** Leitura acumulada do herói (Camada 3 — adaptação). */
  heroRead?: HeroRead;
}

/** Aplica personalidade + tilt + adaptação sobre o perfil-base ajustado por buy-in. */
export function effectiveProfile(
  base: BotProfile,
  seat: number,
  p: { profileId?: string; name: string; personalitySeed?: number },
  ctx: BotContext,
): BotProfile {
  const adjusted = adjustProfileForBuyIn(base, ctx.buyIn);
  if (!p.profileId) return adjusted; // herói / baseline: sem personalidade
  let prof = personalize(adjusted, p.personalitySeed ?? seedFromName(p.name, seat), buyInToughness(ctx.buyIn));
  if (ctx.tilt) prof = tiltAdjust(prof, ctx.tilt); // Camada 2
  if (ctx.heroRead) prof = adaptToHero(prof, ctx.heroRead, prof.skill); // Camada 3
  return prof;
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

  // Pote não aberto: conta quem já limpou (pagou exatamente o BB, sem ser o BB).
  // Cada limper faz a abertura padrão subir +1bb (isolamento).
  const limpers = facingRaise
    ? 0
    : t.players.filter(
        (o) =>
          o.seat !== seat &&
          (o.status === "active" || o.status === "allin") &&
          o.committed === t.bigBlind &&
          positions.get(o.seat) !== "BB",
      ).length;

  // Quantos adversários já estão all-in na frente (confronto múltiplo aperta o call).
  const allInsAhead = t.players.filter((o) => o.seat !== seat && o.status === "allin").length;

  // Nível de aposta enfrentado: 0 sem raise, 1 = abertura, 2 = 3-bet (spot de
  // 4-bet), 3 = 4-bet (spot de 5-bet)... Com 2+, é re-agressão → range apertado.
  const betLevelFaced = t.preflopRaises;

  // ---- PILAR 1: dados para decidir all-in por EQUITY REAL + side pot ----
  const bb = t.bigBlind || 1;
  const toCall = Math.max(0, t.currentBet - p.committed);
  const callAmt = Math.min(toCall, p.stack); // fichas que o herói paga
  const heroTotal = p.totalCommitted + callAmt; // total do herói se pagar
  // Pote disputável (side pot): cada oponente contribui só até o total do herói;
  // o excedente vira pote lateral que o herói não pode ganhar. Fichas mortas de
  // quem foldou também entram (capadas). Nº de oponentes = quem vai ao showdown.
  let contestable = 0;
  let numContesting = 0;
  for (const o of t.players) {
    if (o.seat === seat) continue;
    contestable += Math.min(o.totalCommitted, heroTotal);
    if (o.status === "active" || o.status === "allin") numContesting++;
  }
  // Semente estável por spot: o coach não "pisca" entre renders; bots variam por mão.
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
    threeBet: betLevelFaced >= 2, // re-raise (open+3bet já ocorreram) → lógica de 4-bet

    contestablePotBB: contestable / bb,
    callAmountBB: callAmt / bb,
    numContesting,
    potBB: totalPot(t) / bb, // pote cheio (p/ o preço do flat numa re-agressão não-all-in)
    rng: seededRng(seed),

    icmSpot: buildIcmSpot(t, seat, ctx.payouts),
    variant: t.variant ?? "holdem",
  };
}

/** Decide a ação de um bot no PRÉ-FLOP. */
export function botPreflopAction(t: TableState, seat: number, ctx: BotContext = {}): Action {
  const p = t.players[seat];
  const base: BotProfile = p.profileId ? profileById(p.profileId) : BASELINE_PROFILE;
  // Camadas 1-3: personalidade única + tilt + adaptação ao herói.
  const profile = effectiveProfile(base, seat, p, ctx);
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

import type { FeedbackItem, Rating } from "../feedback/analyzer";
import type { HandHistory, ReplayEvent } from "./replay";
import type { ActionLogEntry, HandShareData } from "./handShareCard";

const RATING_WEIGHT: Record<Rating, number> = {
  boa: 0,
  ok: 1,
  imprecisa: 2,
  ruim: 3,
};

function focusScore(item: FeedbackItem): number {
  const evPenalty = item.evBB !== undefined && item.evBB < 0 ? Math.min(99, Math.abs(item.evBB)) : 0;
  return RATING_WEIGHT[item.rating] * 100 + evPenalty;
}

/** Seleciona o ponto que mais vale revisar. Se tudo foi bom, usa a última decisão. */
export function selectCoachV2Focus(feedback: FeedbackItem[]): { item: FeedbackItem; index: number } | null {
  if (feedback.length === 0) return null;
  let bestIndex = feedback.length - 1;
  let bestScore = focusScore(feedback[bestIndex]);
  for (let i = 0; i < feedback.length; i++) {
    const score = focusScore(feedback[i]);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return { item: feedback[bestIndex], index: bestIndex };
}

function metricSummary(item: FeedbackItem): string {
  const parts: string[] = [];
  if (item.equity !== undefined) parts.push(`Eq ${Math.round(item.equity * 100)}%`);
  if (item.potOdds !== undefined) parts.push(`precisa ${Math.round(item.potOdds * 100)}%`);
  if (item.evBB !== undefined) parts.push(`EV ${item.evBB >= 0 ? "+" : ""}${item.evBB.toFixed(1)}bb`);
  if (item.betSizeBB !== undefined) parts.push(`~${Math.round(item.betSizeBB * 10) / 10}bb`);
  return parts.join(" · ");
}

function coachLine(item: FeedbackItem): string {
  const metrics = metricSummary(item);
  return `${item.advice}${metrics ? ` · ${metrics}` : ""}`;
}

function buildActionLog(hand: HandHistory, feedback: FeedbackItem[]): ActionLogEntry[] {
  const out: ActionLogEntry[] = [];
  let heroDecision = 0;

  for (const ev of hand.events as ReplayEvent[]) {
    if (!ev.isHero) {
      out.push({
        who: ev.name ?? "Vilão",
        action: ev.actionLabel,
        street: ev.street,
        isHero: false,
      });
      continue;
    }

    const item = feedback[heroDecision++];
    out.push({
      who: "Você",
      action: ev.actionLabel,
      street: ev.street,
      isHero: true,
      correct: item ? item.rating === "boa" || item.rating === "ok" : undefined,
    });

    if (item) {
      out.push({
        who: "Coach V2",
        action: coachLine(item),
        street: ev.street,
        isHero: false,
      });
    }
  }

  return out;
}

function buildPotByStreet(hand: HandHistory): Record<string, number> {
  const pots: Record<string, number> = {};
  const bb = Math.max(1, hand.bigBlind);
  for (const ev of hand.events as ReplayEvent[]) {
    const value = Math.round((ev.pot / bb) * 10) / 10;
    pots[ev.street] = Math.max(pots[ev.street] ?? 0, value);
  }
  return pots;
}

function buildShowdown(hand: HandHistory): HandShareData["showdown"] {
  if (!hand.result?.showdown || !hand.result.winningsBySeat) return undefined;
  const shown = hand.result.handValueBySeat;
  const reachedShowdown = (seat: number) =>
    !shown || Object.keys(shown).length === 0 || shown[seat] !== undefined;

  return Object.entries(hand.holeCards)
    .filter(([seatStr]) => reachedShowdown(Number(seatStr)))
    .map(([seatStr, cards]) => {
      const seat = Number(seatStr);
      return {
        name: hand.names?.[seat] ?? (seat === hand.heroSeat ? "Você" : "Vilão"),
        cards,
        isHero: seat === hand.heroSeat,
        won: (hand.result?.winningsBySeat?.[seat] ?? 0) > 0,
      };
    })
    .filter((p) => p.cards.length > 0);
}

/**
 * Builder dos cards compartilháveis alinhado ao Motor V2.
 * Preserva cada decisão em ordem (inclusive várias na mesma street) e injeta
 * a recomendação que foi realmente registrada pelo analyzer naquele instante.
 */
export function buildCoachV2ShareData(hand: HandHistory, feedback: FeedbackItem[]): HandShareData | null {
  const focus = selectCoachV2Focus(feedback);
  if (!focus) return null;

  const focusItem = focus.item;
  const heroEvents = (hand.events as ReplayEvent[]).filter((ev) => ev.isHero);
  const focusEvent = heroEvents[focus.index];
  const heroCards = hand.holeCards[hand.heroSeat] ?? [];
  const effectiveBB = hand.startingStacks?.[hand.heroSeat]
    ? Math.round(hand.startingStacks[hand.heroSeat] / Math.max(1, hand.bigBlind))
    : undefined;

  const contextParts: string[] = [];
  if (focusItem.equity !== undefined) contextParts.push(`Equity: ${Math.round(focusItem.equity * 100)}%`);
  if (focusItem.potOdds !== undefined) contextParts.push(`Preço: ${Math.round(focusItem.potOdds * 100)}%`);
  if (focusItem.evBB !== undefined) contextParts.push(`EV: ${focusItem.evBB >= 0 ? "+" : ""}${focusItem.evBB.toFixed(1)}bb`);
  if (focusItem.betSizeBB !== undefined) contextParts.push(`Sizing Coach: ~${Math.round(focusItem.betSizeBB * 10) / 10}bb`);
  if (effectiveBB !== undefined) contextParts.push(`Stack: ${effectiveBB}bb`);

  const decisions = feedback.map((item, index) => ({
    street: item.street,
    action: heroEvents[index]?.actionLabel ?? item.heroAction,
    correct: item.rating === "boa" || item.rating === "ok",
  }));

  let finalPotBB: number | undefined;
  if (hand.result) {
    const total = hand.result.pots.reduce((sum, p) => sum + p.amount, 0);
    if (total > 0) finalPotBB = Math.round((total / Math.max(1, hand.bigBlind)) * 10) / 10;
  }

  const mistakeFixBB =
    (focusItem.rating === "ruim" || focusItem.rating === "imprecisa") && focusItem.betSizeBB !== undefined
      ? focusItem.betSizeBB
      : undefined;

  return {
    heroCards,
    board: hand.finalBoard,
    heroAction: (focusEvent?.actionLabel ?? focusItem.heroAction).toUpperCase(),
    coachAction: focusItem.advice.toUpperCase(),
    rating: focusItem.rating,
    coachTip: focusItem.text,
    street: focusItem.street,
    tournamentInfo: "Call ou Fold · Simulador grátis",
    context: contextParts.join(" · "),
    position: hand.heroPosition ?? "MP",
    stackBB: effectiveBB !== undefined ? `${effectiveBB}bb` : "100bb",
    stage: hand.tournamentStage,
    equity: focusItem.equity,
    potOdds: focusItem.potOdds,
    evBB: focusItem.evBB,
    decisions,
    actionLog: buildActionLog(hand, feedback),
    potByStreet: buildPotByStreet(hand),
    finalPotBB,
    showdown: buildShowdown(hand),
    mistakeFixBB,
  };
}

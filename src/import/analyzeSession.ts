// ---------------------------------------------------------------------------
// Analisa uma SESSÃO real importada (mãos do PokerStars/GGPoker).
//
// Para cada mão, reconstruímos a decisão PRÉ-FLOP do herói (abrir, pagar,
// 3-betar, foldar) e rodamos exatamente o mesmo motor do simulador
// (preflopDecision + gradeDecision). No fim, um resumo com VPIP/PFR e os
// principais vazamentos — como um treinador olhando seu histórico.
//
// v1: foco no pré-flop (onde está a maioria dos vazamentos do recreativo e onde
// a reconstrução é 100% confiável). O pós-flop reaproveitará o mesmo motor numa
// próxima fase.
// ---------------------------------------------------------------------------

import { preflopDecision } from "../ranges/preflop";
import { BASELINE_PROFILE } from "../bots/profiles";
import { gradeDecision, actionLabel, type FeedbackItem, type Rating } from "../feedback/analyzer";
import { cardsToString } from "../engine/cards";
import type { Position } from "../ranges/types";
import type { ParsedHand } from "./handHistory";

declare module "./handHistory" {
  interface ParsedHand {
    variant?: "holdem" | "omaha";
  }
}

export interface HandReport {
  handId: string;
  heroPosition?: Position;
  heroCardsText: string;
  effectiveBB: number;
  situation: string;
  heroActionLabel: string;
  feedback?: FeedbackItem;
  vpip: boolean;
  pfr: boolean;
  skipped?: string;
}

export interface SessionReport {
  totalHands: number;
  evaluated: number;
  vpip: number; // %
  pfr: number; // %
  counts: Record<Rating, number>;
  hands: HandReport[];
  leaks: string[];
}

/** Ação pré-flop do herói já reduzida à família que o motor entende. */
function mapHeroAction(type: string, facingRaise: boolean, allIn: boolean): { engine: string; label: string } {
  switch (type) {
    case "fold":
      return { engine: "fold", label: "Fold" };
    case "check":
      return { engine: "check", label: "Check" };
    case "call":
      // Pagar um all-in é um call de all-in; senão, call normal.
      return allIn ? { engine: "call", label: "Call (all-in)" } : { engine: "call", label: "Call" };
    case "raise":
      // Um raise ALL-IN é um jam (não um "3-bet" comum) — importante em stack
      // curto, onde re-shovar é o jogo certo. Sem all-in: 3-bet (vs abertura) ou
      // abertura (pote não aberto).
      if (allIn) return { engine: "allin", label: "All-in" };
      return facingRaise ? { engine: "3bet", label: "3-bet" } : { engine: "raise", label: "Raise/abertura" };
    default:
      return { engine: type, label: actionLabel(type) };
  }
}

/** Analisa uma única mão (decisão pré-flop do herói). */
export function analyzeHand(h: ParsedHand): HandReport {
  const hero = h.seats.find((s) => s.isHero);
  const base: HandReport = {
    handId: h.handId,
    heroPosition: hero?.position,
    heroCardsText: cardsToString(h.heroCards),
    effectiveBB: hero && h.bb ? Math.round((hero.stack / h.bb) * 10) / 10 : 0,
    situation: "",
    heroActionLabel: "",
    vpip: false,
    pfr: false,
  };

  if (!hero || !hero.position || h.heroCards.length < 2 || h.bb <= 0) {
    return { ...base, skipped: "Sem dados suficientes (herói/cartas/posição)." };
  }

  // Percorre o pré-flop até a PRIMEIRA ação voluntária do herói, rastreando a
  // última abertura (raise) enfrentada.
  let raiserPosition: Position | undefined;
  let openSizeBB: number | undefined;
  let heroActed: { type: string; allIn: boolean } | undefined;

  for (const a of h.actions) {
    if (a.street !== "preflop") break;
    if (a.type === "sb" || a.type === "bb" || a.type === "ante") continue;

    if (a.player === h.heroName) {
      if (a.type === "fold" || a.type === "check" || a.type === "call" || a.type === "raise") {
        heroActed = { type: a.type, allIn: !!a.allIn };
        break;
      }
      continue;
    }
    // Ação de vilão antes do herói: registra a abertura mais recente.
    if (a.type === "raise") {
      const seat = h.seats.find((s) => s.name === a.player);
      raiserPosition = seat?.position;
      openSizeBB = a.amount / h.bb;
    }
  }

  if (!heroActed) {
    return { ...base, skipped: "Herói não tomou decisão voluntária (blind/desistência automática)." };
  }

  const facingRaise = raiserPosition != null;
  const mapped = mapHeroAction(heroActed.type, facingRaise, heroActed.allIn);

  // BB sem abertura (pote limpado/andado): jogada padrão, fora do escopo v1.
  if (hero.position === "BB" && !facingRaise) {
    return {
      ...base,
      heroActionLabel: mapped.label,
      situation: "BB, pote não aberto",
      skipped: "Spot de BB em pote limpado — fora do escopo da análise pré-flop.",
      vpip: heroActed.type === "call" || heroActed.type === "raise",
      pfr: heroActed.type === "raise",
    };
  }

    const dec = preflopDecision({
      heroPosition: hero.position,
      hand: h.heroCards,
      effectiveBB: base.effectiveBB,
      profile: BASELINE_PROFILE,
      raiserPosition,
      openSizeBB,
      variant: h.variant ?? "holdem",
    });

  const feedback = gradeDecision("Pré-flop", 'free', mapped.engine, {
    kind: "preflop",
    action: dec.action,
    reason: dec.reason,
    effectiveBB: base.effectiveBB,
    mix: dec.mix?.map((m) => ({ action: m.action, freq: m.freq })),
  }, {
    heroPosition: hero.position,
    heroBB: base.effectiveBB,
  });

  const situation = facingRaise
    ? `${mapped.label} contra abertura de ${raiserPosition} (${openSizeBB!.toFixed(1)}bb) · ${base.effectiveBB}bb efetivos`
    : `${mapped.label} em ${hero.position} (pote não aberto) · ${base.effectiveBB}bb`;

  return {
    ...base,
    heroActionLabel: mapped.label,
    situation,
    feedback,
    vpip: heroActed.type === "call" || heroActed.type === "raise",
    pfr: heroActed.type === "raise",
  };
}

/** Gera os principais vazamentos a partir dos números agregados. */
function deriveLeaks(
  vpip: number,
  pfr: number,
  counts: Record<Rating, number>,
  loosePlays: number,
  tightFolds: number,
  evaluated: number,
): string[] {
  const leaks: string[] = [];
  if (evaluated < 5) {
    leaks.push("Poucas mãos para conclusões fortes — importe uma sessão maior para um raio-x melhor.");
    return leaks;
  }
  if (vpip > 32) {
    leaks.push(`VPIP alto (${vpip}%): você entra em mãos demais. Aperte as aberturas, principalmente fora de posição.`);
  } else if (vpip < 15) {
    leaks.push(`VPIP baixo (${vpip}%): jogo apertado demais — dá para roubar mais blinds abrindo o botão e o CO.`);
  }
  const gap = vpip - pfr;
  if (vpip >= 18 && gap > 12) {
    leaks.push(`Muito passivo (VPIP ${vpip}% / PFR ${pfr}%): você paga mais do que levanta. Calls passivos vazam fichas — prefira 3-bet ou fold.`);
  }
  if (loosePlays >= Math.max(3, evaluated * 0.12)) {
    leaks.push(`${loosePlays} jogada(s) solta(s): você continuou com mãos fora do range recomendado para a posição.`);
  }
  if (tightFolds >= Math.max(3, evaluated * 0.12)) {
    leaks.push(`${tightFolds} fold(s) apertado(s) demais: você largou mãos que davam para continuar com lucro.`);
  }
  const bad = counts.ruim;
  if (bad > 0) {
    leaks.push(`${bad} erro(s) claro(s) de EV pré-flop — veja as mãos marcadas em vermelho.`);
  }
  if (leaks.length === 0) {
    leaks.push("Pré-flop sólido nesta sessão: decisões majoritariamente alinhadas com o padrão. 👏");
  }
  return leaks;
}

/** Analisa uma sessão inteira (várias mãos). */
export function analyzeSession(hands: ParsedHand[]): SessionReport {
  const reports = hands.map(analyzeHand);
  const counts: Record<Rating, number> = { boa: 0, ok: 0, imprecisa: 0, ruim: 0 };
  let vpipCount = 0;
  let pfrCount = 0;
  let evaluated = 0;
  let loosePlays = 0;
  let tightFolds = 0;

  for (const r of reports) {
    if (r.vpip) vpipCount++;
    if (r.pfr) pfrCount++;
    if (r.feedback) {
      evaluated++;
      counts[r.feedback.rating]++;
      const heroFam = r.feedback.heroAction;
      const adv = r.feedback.advice;
      // Solto: jogou (não-Fold) quando o padrão era Fold.
      if (adv === "Fold" && heroFam !== "Fold" && r.feedback.rating !== "boa") loosePlays++;
      // Apertado: foldou quando o padrão não era Fold.
      if (heroFam === "Fold" && adv !== "Fold" && r.feedback.rating !== "boa") tightFolds++;
    }
  }

  const total = hands.length;
  const vpip = total ? Math.round((vpipCount / total) * 100) : 0;
  const pfr = total ? Math.round((pfrCount / total) * 100) : 0;

  return {
    totalHands: total,
    evaluated,
    vpip,
    pfr,
    counts,
    hands: reports,
    leaks: deriveLeaks(vpip, pfr, counts, loosePlays, tightFolds, evaluated),
  };
}

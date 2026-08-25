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
import { facingAllinDecision } from "../ranges/facingAllin";
import { BASELINE_PROFILE } from "../bots/profiles";
import { gradeDecision, actionLabel, type FeedbackItem, type Rating } from "../feedback/analyzer";
import { cardsToString } from "../engine/cards";
import { comboToHandType } from "../ranges/types";

// Range que CONTINUA (4-bet jam / call) quando o herói está COLD contra um 3-bet
// (abriram e re-3-betaram ANTES dele agir). Dois já mostraram força, então é bem
// mais apertado que "defender a própria abertura": fora daqui, folda.
const COLD_VS_3BET_CONTINUE = new Set(["AA", "KK", "QQ", "JJ", "TT", "AKs", "AKo", "AQs"]);
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
  let raiserAllIn = false; // a abertura/reraise que o herói enfrenta é all-in?
  let betLevel = 0;        // nº de raises antes do herói (1=open, 2=3-bet, …)
  let limpers = 0;         // nº de limps (call em pote não aberto) antes do herói
  let heroActed: { type: string; allIn: boolean } | undefined;
  // Fichas no pote e a pagar ANTES da ação voluntária do herói — para a conta de
  // all-in (preço × equity via facingAllinDecision).
  const committed: Record<string, number> = {};
  let potChipsBefore = 0;
  let heroBlindChips = 0;
  let heroCallChips = 0;

  for (const a of h.actions) {
    if (a.street !== "preflop") break;
    if (a.type === "sb" || a.type === "bb" || a.type === "ante") {
      potChipsBefore += a.amount;
      committed[a.player] = (committed[a.player] ?? 0) + a.amount;
      if (a.player === h.heroName && (a.type === "sb" || a.type === "bb")) heroBlindChips += a.amount;
      continue;
    }

    if (a.player === h.heroName) {
      if (a.type === "fold" || a.type === "check" || a.type === "call" || a.type === "raise") {
        heroActed = { type: a.type, allIn: !!a.allIn };
        if (a.type === "call") heroCallChips = a.amount;
        break;
      }
      continue;
    }
    // Ação de vilão antes do herói: registra a abertura mais recente e soma o pote.
    if (a.type === "raise") {
      const seat = h.seats.find((s) => s.name === a.player);
      raiserPosition = seat?.position;
      openSizeBB = a.amount / h.bb;
      raiserAllIn = !!a.allIn;
      betLevel += 1;
      potChipsBefore += Math.max(0, a.amount - (committed[a.player] ?? 0));
      committed[a.player] = a.amount;
    } else if (a.type === "call" || a.type === "bet") {
      // Call num pote AINDA não aberto (betLevel 0) = LIMP. Conta pra decisão do BB.
      if (betLevel === 0 && a.type === "call") limpers += 1;
      potChipsBefore += a.amount;
      committed[a.player] = (committed[a.player] ?? 0) + a.amount;
    }
  }

  if (!heroActed) {
    return { ...base, skipped: "Herói não tomou decisão voluntária (blind/desistência automática)." };
  }

  const facingRaise = raiserPosition != null;
  const mapped = mapHeroAction(heroActed.type, facingRaise, heroActed.allIn);

  // BB sem NINGUÉM aberto E sem limpers = WALK (todo mundo desistiu, você ganha o
  // blind). Aí não há decisão a avaliar — mas mostra uma nota, não fica vazio.
  if (hero.position === "BB" && !facingRaise && limpers === 0) {
    return {
      ...base,
      heroActionLabel: mapped.label,
      situation: "BB, todos desistiram (walk)",
      skipped: "Walk: todo mundo desistiu e você levou os blinds sem precisar decidir. Nada a corrigir.",
      vpip: heroActed.type === "call" || heroActed.type === "raise",
      pfr: heroActed.type === "raise",
    };
  }

    // Enfrentando um 3-BET+ (abrir + re-raise antes do herói), NÃO é "defesa vs
    // abertura" — é bem mais apertado. Sem avisar o motor, ele tratava um 3-bet
    // como open e mandava pagar mão dominada (ex.: A7s no BB vs 3-bet a 16bb).
    // betLevel>=2 = há reraise; passa threeBet + nível + pote pro caminho vs-3bet.
    // (O all-in é tratado à parte, logo abaixo, por preço × equity.)
    const facingReraise = !raiserAllIn && betLevel >= 2;
    const callAmtBB =
      openSizeBB != null ? Math.max(0, openSizeBB - heroBlindChips / h.bb) : undefined;
    const dec = preflopDecision({
      heroPosition: hero.position,
      hand: h.heroCards,
      effectiveBB: base.effectiveBB,
      profile: BASELINE_PROFILE,
      raiserPosition,
      openSizeBB,
      limpers,
      variant: h.variant ?? "holdem",
      ...(facingReraise
        ? {
            threeBet: true,
            betLevelFaced: betLevel,
            potBB: potChipsBefore / h.bb,
            callAmountBB: callAmtBB,
          }
        : {}),
    });

  let advAction = dec.action;
  let advReason = dec.reason;
  let advMix = dec.mix?.map((m) => ({ action: m.action, freq: m.freq }));

  // Enfrentando um ALL-IN no pré-flop, NÃO existe 3-bet/abertura — a decisão é
  // PAGAR ou FOLDAR, e por PREÇO × EQUITY (não pela range de "abertura normal",
  // que ignora o preço do pote e mandava foldar mãos que pagam pelo preço, ex.:
  // 65s no BB contra um shove curto). Recalcula com facingAllinDecision. O stack
  // do shover (≈ tamanho do all-in) estima a largura do range dele.
  if (raiserAllIn && openSizeBB != null && h.heroCards.length >= 2) {
    const callBB =
      heroCallChips > 0 ? heroCallChips / h.bb : Math.max(0, openSizeBB - heroBlindChips / h.bb);
    const fa = facingAllinDecision({
      hero: h.heroCards,
      betLevelFaced: Math.max(1, betLevel),
      numContesting: 1,
      contestablePotBB: potChipsBefore / h.bb,
      callBB,
      effectiveBB: openSizeBB,
    });
    advAction = fa.action;
    advReason =
      fa.action === "call"
        ? `Contra o all-in, a conta é preço × equity: ${fa.reason} Pagar pelo preço é o certo.`
        : `Contra o all-in, a conta é preço × equity: ${fa.reason}`;
    advMix = [{ action: fa.action, freq: 1 }];
  }

  // COLD contra um 3-BET (abriram e re-3-betaram antes de o herói agir — ex.: A7s
  // no BB depois de open + 3-bet). O motor "vs 3-bet" assume que o HERÓI abriu e
  // pode restealar (mandava jam A7s); cold é bem mais apertado. Fora das premium,
  // o padrão é FOLDAR. (Não vale pra all-in, tratado acima por preço × equity.)
  if (facingReraise && h.heroCards.length >= 2) {
    const ht = comboToHandType(h.heroCards[0], h.heroCards[1]);
    if (!COLD_VS_3BET_CONTINUE.has(ht)) {
      advAction = "fold";
      advReason =
        "Cold contra um 3-bet: abriram e re-3-betaram antes de você — dois já mostraram força. Fora das premium (QQ+/AK/AQs), o padrão é foldar; mãos como essa ficam dominadas.";
      advMix = [{ action: "fold", freq: 1 }];
    }
  }

  const feedback = gradeDecision("Pré-flop", 'free', mapped.engine, {
    kind: "preflop",
    action: advAction,
    reason: advReason,
    effectiveBB: base.effectiveBB,
    mix: advMix,
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

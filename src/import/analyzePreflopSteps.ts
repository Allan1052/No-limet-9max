// ---------------------------------------------------------------------------
// DICA PRÉ-FLOP POR DECISÃO (não por mão).
//
// Pedido do Allan: "o motor me recomenda raise, o vilão dá re-raise e a dica não
// atualiza". Até aqui o app avaliava só a PRIMEIRA decisão voluntária do herói
// no pré-flop (analyzeHand) — se ele abria, levava 3-bet e decidia de novo, a
// segunda decisão ficava sem veredito.
//
// Este módulo percorre o pré-flop inteiro e avalia CADA decisão do herói, com o
// estado do pote naquele instante (quem aumentou, quanto, qual o nível de
// aposta). Cada item traz o índice da ação no hand history, para o replay poder
// mostrar o veredito certo em cada passo.
// ---------------------------------------------------------------------------
import { preflopDecision } from "../ranges/preflop";
import { facingAllinDecision } from "../ranges/facingAllin";
import { BASELINE_PROFILE } from "../bots/profiles";
import { gradeDecision, type FeedbackItem } from "../feedback/analyzer";
import { comboToHandType, type Position } from "../ranges/types";
import type { ParsedHand } from "./handHistory";
import { COLD_VS_3BET_CONTINUE, mapHeroAction } from "./analyzeSession";
import type { UserSubscriptionLevel } from "../app/gameController";

export interface PreflopStepFeedback {
  /** Índice da ação dentro de hand.actions (liga o veredito ao passo do replay). */
  actionIdx: number;
  feedback: FeedbackItem;
}

const VOLUNTARY = new Set(["fold", "check", "call", "raise"]);

export function analyzePreflopSteps(
  h: ParsedHand,
  level: UserSubscriptionLevel = "free",
): PreflopStepFeedback[] {
  const out: PreflopStepFeedback[] = [];
  const hero = h.seats.find((s) => s.isHero);
  if (!hero || !hero.position || h.heroCards.length < 2 || h.bb <= 0) return out;

  const heroName = h.heroName ?? hero.name;
  const effectiveBB = Math.round((hero.stack / h.bb) * 10) / 10;

  // Estado do pote enquanto a rua anda.
  const committed: Record<string, number> = {};
  let potChips = 0;
  let heroBlindChips = 0;
  let raiserPosition: Position | undefined;
  let openSizeBB: number | undefined;
  let raiserAllIn = false;
  let betLevel = 0;   // 1 = abertura, 2 = 3-bet, 3 = 4-bet…
  let limpers = 0;
  let heroRaised = false; // o herói já aumentou nesta rua?

  const applyVillain = (a: (typeof h.actions)[number]) => {
    if (a.type === "raise") {
      raiserPosition = h.seats.find((s) => s.name === a.player)?.position;
      openSizeBB = a.amount / h.bb;
      raiserAllIn = !!a.allIn;
      betLevel += 1;
      potChips += Math.max(0, a.amount - (committed[a.player] ?? 0));
      committed[a.player] = a.amount;
    } else if (a.type === "call" || a.type === "bet") {
      if (betLevel === 0 && a.type === "call") limpers += 1;
      potChips += a.amount;
      committed[a.player] = (committed[a.player] ?? 0) + a.amount;
    }
  };

  for (let i = 0; i < h.actions.length; i++) {
    const a = h.actions[i];
    if (a.street !== "preflop") break;

    if (a.type === "sb" || a.type === "bb" || a.type === "ante") {
      potChips += a.amount;
      committed[a.player] = (committed[a.player] ?? 0) + a.amount;
      if (a.player === heroName && (a.type === "sb" || a.type === "bb")) heroBlindChips += a.amount;
      continue;
    }

    if (a.player !== heroName) {
      applyVillain(a);
      continue;
    }

    // ---- Decisão do HERÓI: avalia com o estado deste instante ----
    if (VOLUNTARY.has(a.type)) {
      const facingRaise = raiserPosition != null && betLevel > 0;
      const mapped = mapHeroAction(a.type, facingRaise, !!a.allIn);

      // Walk (BB, ninguém abriu, sem limpers) não é decisão — pula.
      const isWalk = hero.position === "BB" && !facingRaise && limpers === 0;
      if (!isWalk) {
        // O herói já aumentou e levou re-raise? Isso é o caminho "vs 3-bet" do
        // motor (ele assume que o herói abriu). Se ele NÃO aumentou e há 2+
        // raises, é COLD contra 3-bet — bem mais apertado.
        const facingReraise = !raiserAllIn && betLevel >= 2;
        const heroFacingOwn3bet = facingReraise && heroRaised;
        const callAmtBB =
          openSizeBB != null ? Math.max(0, openSizeBB - (committed[heroName] ?? 0) / h.bb) : undefined;

        const dec = preflopDecision({
          heroPosition: hero.position,
          hand: h.heroCards,
          effectiveBB,
          profile: BASELINE_PROFILE,
          raiserPosition,
          openSizeBB,
          limpers,
          variant: h.variant ?? "holdem",
          ...(facingReraise
            ? {
                threeBet: true,
                betLevelFaced: betLevel,
                potBB: potChips / h.bb,
                callAmountBB: callAmtBB,
              }
            : {}),
        });

        let advAction = dec.action as string;
        let advReason = dec.reason;
        let advMix = dec.mix?.map((m) => ({ action: m.action, freq: m.freq }));

        // Contra ALL-IN a decisão é preço × equity (pagar ou foldar).
        if (raiserAllIn && openSizeBB != null) {
          const callBB = Math.max(0, openSizeBB - (committed[heroName] ?? 0) / h.bb);
          const fa = facingAllinDecision({
            hero: h.heroCards,
            betLevelFaced: Math.max(1, betLevel),
            numContesting: 1,
            contestablePotBB: potChips / h.bb,
            callBB,
            effectiveBB: openSizeBB,
          });
          advAction = fa.action;
          advReason = `Contra o all-in, a conta é preço × equity: ${fa.reason}`;
          advMix = [{ action: fa.action, freq: 1 }];
        } else if (facingReraise && !heroFacingOwn3bet) {
          // COLD contra 3-bet (o herói ainda não tinha aumentado): fora das
          // premium, o padrão é foldar.
          const ht = comboToHandType(h.heroCards[0], h.heroCards[1]);
          if (!COLD_VS_3BET_CONTINUE.has(ht)) {
            advAction = "fold";
            advReason =
              "Cold contra um 3-bet: abriram e re-3-betaram antes de você — dois já mostraram força. Fora das premium (QQ+/AK/AQs), o padrão é foldar.";
            advMix = [{ action: "fold", freq: 1 }];
          }
        }

        out.push({
          actionIdx: i,
          feedback: gradeDecision(
            "Pré-flop",
            level,
            mapped.engine,
            {
              kind: "preflop",
              action: advAction,
              reason: advReason,
              effectiveBB,
              mix: advMix,
            },
            { heroPosition: hero.position, heroBB: effectiveBB },
          ),
        });
      }
    }

    // Aplica a ação do herói ao estado (ele também mexe no pote).
    if (a.type === "raise") {
      heroRaised = true;
      betLevel += 1;
      raiserPosition = undefined; // a última agressão passa a ser dele
      openSizeBB = a.amount / h.bb;
      raiserAllIn = false;
      potChips += Math.max(0, a.amount - (committed[heroName] ?? 0));
      committed[heroName] = a.amount;
    } else if (a.type === "call" || a.type === "bet") {
      potChips += a.amount;
      committed[heroName] = (committed[heroName] ?? 0) + a.amount;
    }
    if (a.type === "fold") break;
  }

  void heroBlindChips;
  return out;
}

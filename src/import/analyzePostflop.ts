// ---------------------------------------------------------------------------
// AVALIAÇÃO PÓS-FLOP das mãos importadas — a dica do coach rua a rua.
//
// Para cada rua (flop/turn/river) em que o herói tomou uma decisão, reconstrói
// o spot a partir do hand history (pote, aposta enfrentada) e roda o MESMO
// motor da "Rua por Rua" (heroBestAction = equity real vs range do vilão que
// aperta a cada rua). O resultado é gradeado pelo gradeDecision (kind postflop),
// então a barra de dica no replay pode mostrar "Coach recomendava APOSTAR" no
// flop, "PAGAR" no river, etc. — igual ao jogo ao vivo.
//
// É uma ESTIMATIVA (range do vilão é aproximado a partir das ações), mas dá a
// direção certa: valor/proteção/projeto/blefe e a conta de pagar.
// ---------------------------------------------------------------------------

import { rangePercent } from "../ranges/types";
import { contarOuts } from "../train/streets/outs";
import { rankOf, suitOf, type Card } from "../engine/cards";
import {
  preflopOpenRange,
  continueVillainRange,
  heroBestAction,
  analyzeBoard,
  type BoardState,
  type VillainAction,
  type StreetName,
} from "../train/streets/dynamicRanges";
import { gradeDecision, type FeedbackItem } from "../feedback/analyzer";
import type { Range } from "../ranges/types";
import type { UserSubscriptionLevel } from "../app/gameController";
import type { ParsedHand, Street } from "./handHistory";

const RANKS = "23456789TJQKA";

/** Duas cartas → handType do range ("99", "AKs", "AJo"). */
function cardsToHandType(cards: Card[]): string {
  if (cards.length < 2) return "";
  const r1 = rankOf(cards[0]);
  const r2 = rankOf(cards[1]);
  const suited = suitOf(cards[0]) === suitOf(cards[1]);
  const hi = Math.max(r1, r2);
  const lo = Math.min(r1, r2);
  const c = (r: number) => RANKS[r - 2];
  if (hi === lo) return c(hi) + c(lo);
  return c(hi) + c(lo) + (suited ? "s" : "o");
}

const BOARD_LEN: Record<StreetName, number> = { flop: 3, turn: 4, river: 5 };
const STREET_LABEL: Record<StreetName, string> = { flop: "Flop", turn: "Turn", river: "River" };

/** Ações "voluntárias" (que o herói escolhe) — exclui blinds/antes/devoluções. */
function isVoluntary(t: string): boolean {
  return t === "fold" || t === "check" || t === "call" || t === "bet" || t === "raise";
}

/** Ação do vilão → VillainAction do motor (pra apertar o range). */
function toVillainAction(t: string): VillainAction {
  if (t === "fold") return "fold";
  if (t === "check") return "check";
  if (t === "call") return "call";
  return "betSmall"; // bet/raise/all-in
}

/** Spot reconstruído no momento da ÚLTIMA decisão do herói na rua. */
interface Spot {
  potBB: number;
  facingBB: number;
  heroType: string; // fold|check|call|bet|raise
  facingAllIn: boolean; // a aposta enfrentada é um all-in? (não dá pra aumentar)
}

/**
 * TODAS as decisões do herói numa rua (não só a última), com o índice da ação.
 * É o que permite a dica mudar a cada lance: se o Allan aposta, leva raise e
 * decide de novo na mesma rua, são DUAS decisões para avaliar.
 */
export function reconstructSpots(
  hand: ParsedHand,
  street: Street,
  bb: number,
): Array<Spot & { actionIdx: number }> {
  const out: Array<Spot & { actionIdx: number }> = [];
  let potChips = 0;
  let committed: Record<string, number> = {};
  let allInBy: Record<string, boolean> = {};
  let curStreet: Street | null = null;

  for (let i = 0; i < hand.actions.length; i++) {
    const a = hand.actions[i];
    if (a.street !== curStreet) {
      committed = {};
      allInBy = {};
      curStreet = a.street;
    }
    if (a.player === hand.heroName && a.street === street && isVoluntary(a.type)) {
      const maxC = Object.values(committed).reduce((m, v) => Math.max(m, v), 0);
      const heroC = committed[hand.heroName] ?? 0;
      const facingAllIn = Object.keys(committed).some(
        (p) => p !== hand.heroName && allInBy[p] && committed[p] >= maxC && maxC > heroC,
      );
      out.push({
        potBB: potChips / bb,
        facingBB: Math.max(0, maxC - heroC) / bb,
        heroType: a.type,
        facingAllIn,
        actionIdx: i,
      });
    }
    if (a.allIn && a.player !== hand.heroName) allInBy[a.player] = true;
    if (a.type === "ante") {
      potChips += a.amount || hand.ante;
    } else if (a.type === "sb" || a.type === "bb" || a.type === "call" || a.type === "bet") {
      const d = a.amount || (a.type === "sb" ? hand.sb : a.type === "bb" ? hand.bb : 0);
      potChips += d;
      committed[a.player] = (committed[a.player] ?? 0) + d;
    } else if (a.type === "raise") {
      const delta = Math.max(0, a.amount - (committed[a.player] ?? 0));
      potChips += delta;
      committed[a.player] = a.amount;
    } else if (a.type === "uncalled") {
      potChips = Math.max(0, potChips - a.amount);
    }
  }
  return out;
}

/** Reconstrói o pote (bb) e a aposta enfrentada (bb) na última ação do herói da rua. */
function reconstructSpot(hand: ParsedHand, street: Street, bb: number): Spot | null {
  let potChips = 0;
  let committed: Record<string, number> = {};
  let allInBy: Record<string, boolean> = {}; // quem já está all-in nesta rua
  let curStreet: Street | null = null;
  let snap: Spot | null = null;

  for (const a of hand.actions) {
    if (a.street !== curStreet) {
      committed = {}; // nova rua: zera as apostas da rua
      allInBy = {};
      curStreet = a.street;
    }
    // Snapshot ANTES de aplicar a ação do herói na rua-alvo.
    if (a.player === hand.heroName && a.street === street && isVoluntary(a.type)) {
      const maxC = Object.values(committed).reduce((m, v) => Math.max(m, v), 0);
      const heroC = committed[hand.heroName] ?? 0;
      // Enfrentando all-in = quem colocou o maior valor na rua está all-in.
      const facingAllIn = Object.keys(committed).some(
        (p) => p !== hand.heroName && allInBy[p] && committed[p] >= maxC && maxC > heroC,
      );
      snap = { potBB: potChips / bb, facingBB: Math.max(0, maxC - heroC) / bb, heroType: a.type, facingAllIn };
    }
    if (a.allIn && a.player !== hand.heroName) allInBy[a.player] = true;
    // Aplica a ação ao pote/committed (mesma lógica do replayer).
    if (a.type === "ante") {
      potChips += a.amount || hand.ante;
    } else if (a.type === "sb" || a.type === "bb" || a.type === "call" || a.type === "bet") {
      const d = a.amount || (a.type === "sb" ? hand.sb : a.type === "bb" ? hand.bb : 0);
      potChips += d;
      committed[a.player] = (committed[a.player] ?? 0) + d;
    } else if (a.type === "raise") {
      const delta = Math.max(0, a.amount - (committed[a.player] ?? 0));
      potChips += delta;
      committed[a.player] = a.amount;
    } else if (a.type === "uncalled") {
      potChips = Math.max(0, potChips - a.amount);
    }
  }
  return snap;
}

/** Última ação de um VILÃO na rua (pra apertar o range dele). */
function villainLastAction(hand: ParsedHand, street: Street): VillainAction | null {
  const acts = hand.actions.filter((e) => e.player !== hand.heroName && e.street === street && isVoluntary(e.type));
  return acts.length ? toVillainAction(acts[acts.length - 1].type) : null;
}

/** Posição-semente do vilão: o último a levantar no pré-flop (senão CO). */
function guessVillainPosition(hand: ParsedHand): string {
  let pos = "CO";
  for (const a of hand.actions) {
    if (a.street !== "preflop") break;
    if (a.player !== hand.heroName && a.type === "raise") {
      const seat = hand.seats.find((s) => s.name === a.player);
      if (seat?.position) pos = seat.position;
    }
  }
  return pos;
}

/** Estratégia mista aproximada (primário + alternativa) pra uma nota justa. */
function buildMix(action: string, freq: number): { action: string; freq: number }[] {
  const alt =
    action === "bet" ? "check" :
    action === "check" ? "bet" :
    action === "raise" ? "call" :
    action === "call" ? "fold" :
    action === "fold" ? "call" : "check";
  const f = Math.min(1, Math.max(0, freq));
  return [{ action, freq: f }, { action: alt, freq: Math.max(0, 1 - f) }];
}

/**
 * Avalia as decisões PÓS-FLOP do herói na mão. Retorna a nota do coach por rua.
 * Roda por mão (chamado sob demanda no replay), não na importação inteira.
 */
export function analyzePostflopStreets(
  hand: ParsedHand,
  level: UserSubscriptionLevel = "free",
): Partial<Record<StreetName, FeedbackItem>> {
  const out: Partial<Record<StreetName, FeedbackItem>> = {};
  try {
    const hero = hand.seats.find((s) => s.isHero);
    if (!hero || !hero.position || hand.heroCards.length < 2 || hand.bb <= 0) return out;
    const heroHt = cardsToHandType(hand.heroCards);
    if (!heroHt) return out;
    const bb = hand.bb;
    const effBB = Math.round((hero.stack / bb) * 10) / 10;
    const villainPos = guessVillainPosition(hand);
    let villainRange: Range = preflopOpenRange(villainPos, effBB);

    for (const st of ["flop", "turn", "river"] as StreetName[]) {
      if (hand.board.length < BOARD_LEN[st]) break;
      const boardCards = hand.board.slice(0, BOARD_LEN[st]);
      const board: BoardState = { street: st, cards: boardCards };
      const texture = analyzeBoard(board);

      const spot = reconstructSpot(hand, st, bb);
      if (spot && spot.heroType) {
        // Se o herói pagou/aumentou/foldou, está enfrentando aposta; se apostou/
        // passou, não. Deriva a aposta enfrentada de forma coerente.
        const facing = spot.heroType === "call" || spot.heroType === "raise" || spot.heroType === "fold" ? spot.facingBB : 0;
        const potBB = spot.potBB > 0 ? spot.potBB : 6;
        const rec = heroBestAction(heroHt, board, facing, potBB, texture, villainRange, 400);
        let advAction = rec.action === "betSmall" || rec.action === "betBig" ? "bet" : rec.action;
        // Enfrentando ALL-IN não existe raise/aposta — a decisão é só pagar ou
        // foldar. Se o motor recomendou agressão (ex.: set querendo valor), a
        // jogada certa vira CALL. Senão o coach mandava "recomendava RAISE" num
        // all-in, o que é impossível (bug pego pelo Allan na mão de 88 no turn).
        if (spot.facingAllIn && (advAction === "raise" || advAction === "bet")) {
          advAction = "call";
        }
        const potOdds = facing > 0 ? facing / (potBB + facing) : undefined;
        // EV de PAGAR, em bb: equity × (pote + call) − call. Foldar vale 0, então
        // num spot de pagar-ou-foldar este número É o custo da decisão errada.
        // `facing` e `potBB` já estão em bb. É ESTIMATIVA: a equity vem de
        // simulação contra um range de vilão deduzido das ações dele.
        const evBB = facing > 0 ? Math.round((rec.equity * (potBB + facing) - facing) * 10) / 10 : undefined;
        out[st] = gradeDecision(
          STREET_LABEL[st],
          level,
          spot.heroType,
          {
            kind: "postflop",
            action: advAction,
            reason: rec.reason,
            equity: rec.equity,
            potOdds,
            evBB,
            effectiveBB: effBB,
            heroPosition: hero.position,
            mix: buildMix(advAction, rec.freq),
            // Tamanho recomendado (só quando o padrão é apostar/aumentar).
            betSizePct: rec.sizePct,
            betSizeBB: rec.sizeBB,
            // Largura do range do vilão NESTA rua (ele já vem apertado pelas
            // ações anteriores). É o que permite a dica dizer "ele está com
            // cerca de X% das mãos aqui".
            villainRangePct: rangePercent(villainRange),
            breakEvenCallBB: facing > 0 ? rec.breakEvenBB : undefined,
            outs: (() => {
              const o = contarOuts(hand.heroCards, boardCards, villainRange);
              return o ? { outs: o.outs, chance: o.chanceProximaCarta } : undefined;
            })(),
          },
          { heroPosition: hero.position, heroBB: effBB },
        );
      }

      // Aperta o range do vilão com a ação dele nesta rua (pra próxima).
      const vAct = villainLastAction(hand, st);
      if (vAct) {
        const snap = continueVillainRange(villainRange, vAct, board, {
          heroPosition: hero.position,
          villainPosition: villainPos,
          heroStackBB: effBB,
          villainStackBB: effBB,
          potBB: spot?.potBB || 6,
          facedBetBB: 4,
        });
        villainRange = snap.range;
      }
    }
  } catch {
    // Reconstrução incerta (mão fora do padrão) — melhor não mostrar dica errada.
    return out;
  }
  return out;
}

/** Uma decisão pós-flop avaliada, ligada ao passo do replay. */
export interface PostflopStepFeedback {
  actionIdx: number;
  street: StreetName;
  feedback: FeedbackItem;
}

/**
 * Dica pós-flop por DECISÃO (não por rua).
 *
 * Pedido do Allan, irmão do que já foi feito no pré-flop: se ele aposta no flop,
 * leva um raise e decide de novo NA MESMA RUA, cada decisão precisa do seu
 * veredito — a barra muda conforme ele anda os passos.
 *
 * Limite honesto: o range do vilão é apertado UMA vez por rua (com a última
 * ação dele naquela rua). Duas decisões na mesma rua usam o mesmo range —
 * continua sendo ESTIMATIVA, como já está marcado na tela.
 */
export function analyzePostflopSteps(
  hand: ParsedHand,
  level: UserSubscriptionLevel = "free",
): PostflopStepFeedback[] {
  const out: PostflopStepFeedback[] = [];
  try {
    const hero = hand.seats.find((s) => s.isHero);
    if (!hero || !hero.position || hand.heroCards.length < 2 || hand.bb <= 0) return out;
    const heroHt = cardsToHandType(hand.heroCards);
    if (!heroHt) return out;
    const bb = hand.bb;
    const effBB = Math.round((hero.stack / bb) * 10) / 10;
    const villainPos = guessVillainPosition(hand);
    let villainRange: Range = preflopOpenRange(villainPos, effBB);

    for (const st of ["flop", "turn", "river"] as StreetName[]) {
      if (hand.board.length < BOARD_LEN[st]) break;
      const boardCards = hand.board.slice(0, BOARD_LEN[st]);
      const board: BoardState = { street: st, cards: boardCards };
      const texture = analyzeBoard(board);
      const spots = reconstructSpots(hand, st, bb);

      for (const spot of spots) {
        if (!spot.heroType) continue;
        const facing =
          spot.heroType === "call" || spot.heroType === "raise" || spot.heroType === "fold"
            ? spot.facingBB
            : 0;
        const potBB = spot.potBB > 0 ? spot.potBB : 6;
        const rec = heroBestAction(heroHt, board, facing, potBB, texture, villainRange, 400);
        let advAction = rec.action === "betSmall" || rec.action === "betBig" ? "bet" : rec.action;
        if (spot.facingAllIn && (advAction === "raise" || advAction === "bet")) advAction = "call";
        const potOdds = facing > 0 ? facing / (potBB + facing) : undefined;
        const evBB =
          facing > 0 ? Math.round((rec.equity * (potBB + facing) - facing) * 10) / 10 : undefined;

        out.push({
          actionIdx: spot.actionIdx,
          street: st,
          feedback: gradeDecision(
            STREET_LABEL[st],
            level,
            spot.heroType,
            {
              kind: "postflop",
              action: advAction,
              reason: rec.reason,
              equity: rec.equity,
              potOdds,
              evBB,
              effectiveBB: effBB,
              heroPosition: hero.position,
              mix: buildMix(advAction, rec.freq),
              betSizePct: rec.sizePct,
              betSizeBB: rec.sizeBB,
              // Mesma leitura de range da versão por rua: é o que permite a
              // dica abrir com "ele está com cerca de X% das mãos aqui".
              villainRangePct: rangePercent(villainRange),
              // "E se ele tivesse apostado menos?" — só quando havia aposta.
              breakEvenCallBB: facing > 0 ? rec.breakEvenBB : undefined,
              // "Quais cartas me salvavam?" — cartas reais do herói, por isso
              // só dá para calcular aqui (o motor trabalha com tipo de mão).
              outs: (() => {
                const o = contarOuts(hand.heroCards, boardCards, villainRange);
                return o ? { outs: o.outs, chance: o.chanceProximaCarta } : undefined;
              })(),
            },
            { heroPosition: hero.position, heroBB: effBB },
          ),
        });
      }

      const vAct = villainLastAction(hand, st);
      if (vAct) {
        const last = spots.length ? spots[spots.length - 1] : null;
        const snap = continueVillainRange(villainRange, vAct, board, {
          heroPosition: hero.position,
          villainPosition: villainPos,
          heroStackBB: effBB,
          villainStackBB: effBB,
          potBB: last?.potBB || 6,
          facedBetBB: 4,
        });
        villainRange = snap.range;
      }
    }
  } catch {
    return out;
  }
  return out;
}

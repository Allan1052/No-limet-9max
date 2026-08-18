// ---------------------------------------------------------------------------
// NARRAÇÃO DA MÃO (estilo Yuri) — rua por rua, a partir dos dados REAIS da mão.
//
// Para o "Card 2" do carrossel de compartilhar: reconstrói a história da mão —
// pré-flop → flop → turn → river — dizendo a ação do herói (com o tamanho e o
// porquê) e o RANGE DO VILÃO apertando a cada rua ("se ele pagou, ele tem X").
// Usa o MESMO motor da Rua por Rua (continueVillainRange / heroBestAction), a
// partir do actionLog e do board que o card já recebe — nada é inventado.
// ---------------------------------------------------------------------------

import { rankOf, suitOf, type Card } from "../engine/cards";
import type { HandShareData } from "./handShareCard";
import {
  preflopOpenRange,
  continueVillainRange,
  heroBestAction,
  analyzeBoard,
  boardHit,
  type BoardState,
  type VillainAction,
  type StreetName,
} from "../train/streets/dynamicRanges";
import type { Range } from "../ranges/types";

export interface NarrativeStreet {
  /** Rótulo com as cartas: "PRÉ-FLOP", "FLOP 3♥ 9♦ J♣"... */
  label: string;
  /** Linha do herói: ação + tamanho + porquê (versão completa, p/ tela). */
  hero: string;
  /** Linha do vilão: o range apertando ("se pagou, tem X"). Vazio no pré-flop. */
  villain: string;
  /** Versão CURTA do herói p/ o card: "Raise · trinca". */
  heroShort: string;
  /** Versão CURTA do vilão p/ o card: "paga → 99, JJ, JT, KQ". */
  villainShort: string;
}

const RANKS = "23456789TJQKA";
const SUIT_SYM = ["♣", "♦", "♥", "♠"];

/** Duas cartas → handType do range ("99", "AKs", "AJo"). */
function cardsToHandType(cards: Card[]): string {
  if (cards.length < 2) return "";
  const r1 = rankOf(cards[0]), r2 = rankOf(cards[1]);
  const suited = suitOf(cards[0]) === suitOf(cards[1]);
  const hi = Math.max(r1, r2), lo = Math.min(r1, r2);
  const c = (r: number) => RANKS[r - 2];
  if (hi === lo) return c(hi) + c(lo);
  return c(hi) + c(lo) + (suited ? "s" : "o");
}

function cardStr(c: Card): string {
  return RANKS[rankOf(c) - 2] + SUIT_SYM[suitOf(c)];
}

/** "AJs"→"AJ", "99"→"99" — nome curto p/ o card. */
function shortHandName(ht: string): string {
  return ht.length === 3 ? ht.slice(0, 2) : ht;
}

function parseBB(s: string | undefined): number {
  const m = /([\d.,]+)/.exec(s ?? "");
  return m ? parseFloat(m[1].replace(",", ".")) : 40;
}

/** Ação (texto do actionLog) → VillainAction do motor. */
function toVillainAction(action: string): VillainAction {
  const t = action.toLowerCase();
  if (t.startsWith("fold") || t.includes("desist") || t.includes("larg")) return "fold";
  if (t.startsWith("check")) return "check";
  if (t.startsWith("call") || t.includes("pag")) return "call";
  // raise / bet / all-in → aposta (tamanho fino não muda a narração de range)
  return "betSmall";
}

/** Rótulo humano da ação do herói a partir do texto cru. */
function heroActionLabel(action: string): string {
  return action.replace(/\ball-?in\b/i, "All-in").trim();
}

type NarrStreet = "preflop" | StreetName;
const STREET_ORDER: { name: NarrStreet; label: string; boardLen: number }[] = [
  { name: "preflop", label: "PRÉ-FLOP", boardLen: 0 },
  { name: "flop", label: "FLOP", boardLen: 3 },
  { name: "turn", label: "TURN", boardLen: 4 },
  { name: "river", label: "RIVER", boardLen: 5 },
];

// Normaliza "Pré-Flop"/"Preflop"/"Flop"... → chave de rua.
function streetKey(s: string): NarrStreet {
  const t = s.toLowerCase();
  if (t.includes("pré") || t.includes("pre")) return "preflop";
  if (t.includes("flop")) return "flop";
  if (t.includes("turn")) return "turn";
  return "river";
}

/**
 * Constrói a narração rua por rua da mão. Retorna uma entrada por rua jogada,
 * com a ação do herói e o range do vilão apertando (nomeando as mãos).
 */
export function buildHandNarrative(data: HandShareData): NarrativeStreet[] {
  const out: NarrativeStreet[] = [];
  const heroHt = cardsToHandType(data.heroCards);
  const effBB = parseBB(data.stackBB);
  // Semente do range do vilão: um abridor típico (~CO). O que importa pra
  // narração é o range APERTAR por rua conforme o board — direção correta
  // independente da posição exata.
  let villainRange: Range = preflopOpenRange("CO", effBB);

  // Ação de cada jogador por rua (do actionLog, a última de cada um na rua).
  const log = data.actionLog ?? [];
  const villainLastOn = (key: NarrStreet): string | undefined => {
    const acts = log.filter((e) => !e.isHero && streetKey(e.street) === key);
    return acts.length ? acts[acts.length - 1].action : undefined;
  };
  const heroLastOn = (key: NarrStreet): string | undefined => {
    const fromLog = log.filter((e) => e.isHero && streetKey(e.street) === key);
    if (fromLog.length) return fromLog[fromLog.length - 1].action;
    const d = (data.decisions ?? []).find((x) => streetKey(x.street) === key);
    return d?.action;
  };

  for (const st of STREET_ORDER) {
    if (st.name !== "preflop" && data.board.length < st.boardLen) break;
    const boardCards = data.board.slice(0, st.boardLen);
    const board: BoardState = { street: st.name as StreetName, cards: boardCards };
    const label = st.name === "preflop"
      ? "PRÉ-FLOP"
      : `${st.label}  ${boardCards.slice(st.name === "flop" ? 0 : st.boardLen - 1).map(cardStr).join(" ")}`;

    const heroAct = heroLastOn(st.name);
    let heroLine = heroAct ? heroActionLabel(heroAct) : "—";
    let villainLine = "";
    let heroShort = heroAct ? heroActionLabel(heroAct) : "—";
    let villainShort = "";

    if (st.name === "preflop") {
      heroLine = heroAct ? `${heroActionLabel(heroAct)} com ${data.heroCards.map(cardStr).join(" ")}` : `Entra com ${data.heroCards.map(cardStr).join(" ")}`;
      villainLine = "Vilão abriu / na frente — range amplo de abertura.";
      villainShort = "abriu";
    } else {
      // Porquê da ação do herói (tamanho + razão), pelo motor.
      const texture = analyzeBoard(board);
      const potBB = data.potByStreet?.[Object.keys(data.potByStreet ?? {}).find((k) => streetKey(k) === st.name) ?? ""] ?? 0;
      if (heroHt) {
        const best = heroBestAction(heroHt, board, 0, potBB || 6, texture, villainRange, 300);
        const hit = boardHit(heroHt, board);
        const madeTxt = hit.made === "trips+" ? "trinca+" : hit.made === "twoPairOrBetter" ? "dois pares+" : hit.made === "overPair" || hit.made === "topPair" ? "par de topo" : hit.draw ? "projeto" : "carta alta";
        heroLine = `${heroActionLabel(heroAct ?? best.action)}${madeTxt ? ` — ${madeTxt}` : ""}. ${best.reason}`;
        heroShort = `${heroActionLabel(heroAct ?? best.action)} · ${madeTxt}`;
      }
      // Range do vilão aperta conforme a ação dele nesta rua.
      const vAct = villainLastOn(st.name);
      if (vAct) {
        const snap = continueVillainRange(villainRange, toVillainAction(vAct), board, {
          heroPosition: data.position || "MP", villainPosition: "CO",
          heroStackBB: effBB, villainStackBB: effBB, potBB: potBB || 6, facedBetBB: 4,
        });
        villainRange = snap.range;
        villainLine = snap.narration;
        const va = toVillainAction(vAct);
        const verb = va === "fold" ? "larga" : va === "call" ? "paga" : va === "check" ? "check" : "aposta";
        const names = [...new Set(snap.topHands.map((h) => shortHandName(h.handType)))].slice(0, 4).join(", ");
        villainShort = va === "fold" ? "larga o lixo" : `${verb} → ${names || "range apertado"}`;
      } else {
        villainLine = "Vilão não agiu nesta rua.";
        villainShort = "—";
      }
    }
    out.push({ label, hero: heroLine, villain: villainLine, heroShort, villainShort });
  }
  return out;
}

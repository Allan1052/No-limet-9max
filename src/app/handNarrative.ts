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
import { describeHandPt } from "../engine/evaluator";
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
        const madeTxt = hit.made === "trips+" ? "trinca+" : hit.made === "twoPairOrBetter" ? "dois pares+" : hit.made === "overPair" ? "overpair" : hit.made === "topPair" ? "par de topo" : hit.draw ? "projeto" : "carta alta";
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
        villainLine = `Leitura didática: ${snap.narration}`;
        const va = toVillainAction(vAct);
        const verb = va === "fold" ? "larga" : va === "call" ? "paga" : va === "check" ? "check" : "aposta";
        const names = [...new Set(snap.topHands.map((h) => shortHandName(h.handType)))].slice(0, 4).join(", ");
        villainShort = va === "fold" ? "larga o lixo" : `${verb} → ${names || "range apertado"}`;
      } else {
        villainLine = "Leitura didática: o vilão não agiu nesta rua.";
        villainShort = "—";
      }
    }
    out.push({ label, hero: heroLine, villain: villainLine, heroShort, villainShort });
  }
  return out;
}

// ---------------------------------------------------------------------------
// HISTÓRIA ESCRITA DA MÃO — a crônica, rua por rua, com TODAS as ações.
// Allan (18/08): "quero ver a história escrita, todas as jogadas — pré-flop,
// flop, turn, river — mostrar todas as ações." Cada rua vira: (1) o LEDGER com
// as ações reais de todos os jogadores (do actionLog) e (2) a LEITURA no estilo
// Yuri (o que sua mão virou + o range do vilão apertando). Tudo dos dados reais.
// ---------------------------------------------------------------------------
export interface HandStoryStreet {
  /** "PRÉ-FLOP", "FLOP  Q♥ J♣ 3♣"... (com as cartas da rua). */
  label: string;
  /** Ações reais da rua: "Você: Raise 2bb · CO: Call · 3 largaram". */
  ledger: string;
  /** A leitura (estilo Yuri): sua mão + range do vilão apertando. */
  read: string;
}

/** Limpa o texto cru da ação p/ leitura ("Raise 2.0"→"aumenta 2bb"...). */
function actionPhrase(action: string): string {
  const t = action.toLowerCase();
  const num = /([\d.,]+)/.exec(action);
  const bb = num ? `${parseFloat(num[1].replace(",", ".")).toFixed(1).replace(/\.0$/, "")}bb` : "";
  // "all-in" só com fronteira de palavra — senão "Call" (c-"all") vira all-in.
  if (/\ball[\s-]?in\b|\bjam\b|\bshove\b/.test(t)) return bb ? `all-in ${bb}` : "all-in";
  if (t.startsWith("fold") || t.includes("larg") || t.includes("desist")) return "larga";
  if (t.startsWith("check")) return "mesa";
  if (t.startsWith("call") || t.includes("pag")) return bb ? `paga ${bb}` : "paga";
  if (t.startsWith("raise") || t.includes("aument")) return bb ? `aumenta ${bb}` : "aumenta";
  if (t.startsWith("bet") || t.includes("aposta")) return bb ? `aposta ${bb}` : "aposta";
  return action.toLowerCase();
}

/** Categoria da mão do herói AVALIADA no board da rua (real, não heurística). */
function heroMadeAt(heroCards: Card[], boardCards: Card[]): string {
  if (boardCards.length < 3 || heroCards.length < 2) return "";
  try {
    const described = describeHandPt([...heroCards, ...boardCards]);
    // No flop, um pocket pair acima de todas as cartas comunitárias é um
    // overpair. O avaliador continua informando a categoria real (par), mas a
    // narrativa precisa ensinar a relação com o board.
    if (boardCards.length === 3) {
      const hit = boardHit(cardsToHandType(heroCards), { street: "flop", cards: boardCards });
      if (hit.made === "overPair") {
        const pairRank = described.match(/^Par de (.+)$/i)?.[1];
        return pairRank ? `Overpair de ${pairRank}` : `Overpair (${described})`;
      }
    }
    return described;
  } catch { return ""; }
}

/** Mão com artigo p/ frase natural: "um par", "uma trinca", "dois pares". */
function madeWithArticle(made: string): string {
  const m = made.toLowerCase();
  if (!m) return "";
  if (m.startsWith("dois")) return m;
  if (m === "carta alta") return "só carta alta";
  if (m === "trinca" || m === "quadra" || m === "sequência") return "uma " + m;
  return "um " + m;
}

const BOARD_LEN: Record<NarrStreet, number> = { preflop: 0, flop: 3, turn: 4, river: 5 };

/**
 * Monta a história escrita da mão — uma crônica por rua, com todas as ações.
 */
export function buildHandStory(data: HandShareData): HandStoryStreet[] {
  const narr = buildHandNarrative(data);
  const log = data.actionLog ?? [];
  const out: HandStoryStreet[] = [];

  for (const st of narr) {
    const key = streetKey(st.label);
    // LEDGER: ações reais da rua, na ordem. Foldes viram contagem ("N largaram").
    const acts = log.filter((e) => streetKey(e.street) === key);
    const parts: string[] = [];
    let folds = 0;
    for (const a of acts) {
      const ph = actionPhrase(a.action);
      if (ph === "larga") { folds++; continue; }
      const who = a.isHero ? "Você" : a.who;
      parts.push(`${who} ${ph}`);
    }
    if (folds > 0) parts.push(folds === 1 ? "1 larga" : `${folds} largam`);
    const ledger = parts.join(" · ") || "—";

    // LEITURA (estilo Yuri): a mão REAL do herói na rua + o range do vilão
    // apertando. No pré-flop, a leitura é a mão inicial.
    let read = "";
    if (key === "preflop") {
      // O papel REAL do herói no pré-flop — não é sempre "abertura". Conta os
      // aumentos ANTES da ação dele: 0 = abertura, 1 = 3-bet, 2+ = 4-bet; e se
      // ele só pagou, diz o que pagou. (Antes cravava "mão de abertura" mesmo
      // num 3-bet — inconsistente com o ledger; bug pego pelo Allan.)
      const pre = log.filter((e) => streetKey(e.street) === "preflop");
      let raisesBeforeHero = 0;
      let heroPhrase = "";
      for (const e of pre) {
        const ph = actionPhrase(e.action);
        if (e.isHero) { heroPhrase = ph; break; }
        if (/aumenta|all-in/.test(ph)) raisesBeforeHero++;
      }
      const handTxt = data.heroCards.map(cardStr).join(" ");
      const isRaise = /aumenta|all-in/.test(heroPhrase);
      const isCall = /paga/.test(heroPhrase);
      let role: string;
      if (isRaise) {
        role = raisesBeforeHero >= 2 ? "4-bet" : raisesBeforeHero === 1 ? "3-bet" : "abertura";
      } else if (isCall) {
        role = raisesBeforeHero >= 2 ? "pagou o 3-bet" : raisesBeforeHero === 1 ? "pagou a abertura" : "limp";
      } else {
        role = "entrou no pote";
      }
      read = `Você começou com ${handTxt} — ${role}.`;
    } else {
      const made = heroMadeAt(data.heroCards, data.board.slice(0, BOARD_LEN[key]));
      const heroRead = made ? `Você tinha ${madeWithArticle(made)}.` : "";
      const vilRead = st.villain && !/não agiu/i.test(st.villain) ? st.villain.replace(/\s+/g, " ").trim() : "";
      read = `${heroRead}${heroRead && vilRead ? " " : ""}${vilRead}`.trim();
    }
    out.push({ label: st.label, ledger, read });
  }
  return out;
}

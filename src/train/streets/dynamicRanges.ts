// ---------------------------------------------------------------------------
// RANGES DINÂMICOS — motor do treino street-by-street (Fase 1).
//
// Módulo NOVO e ISOLADO. Não toca em nenhuma pasta do motor
// (src/bots, src/ranges, src/game, src/engine, src/feedback, src/tournament).
//
// Princípio: o range do vilão é um mapa handType → freq (0..1). A cada ação
// dele, cada mão do range é multiplicada pela probabilidade de ela tomar
// aquela ação naquele board, e o range é renormalizado. É o modelo pedagógico
// heurístico descrito na proposta street-by-street aprovada pelo Allan.
//
// Uso (leitura do próprio motor, nunca escrita):
//   - preflopOpenRange(position, effBB)  → range inicial do vilão que abriu
//   - heroRecommendedRange(spec, board)  → grade de ação do herói no board
//   - continueVillainRange(prev, action, board, ctx) → range do vilão após a ação dele
// ---------------------------------------------------------------------------

import { allHandTypes, comboCount, type Range } from "../../ranges/types";
import { handRank, handScore } from "../../ranges/handStrength";
import type { Card } from "../../engine/cards";

// ----------------------------- Tipos públicos -----------------------------

export type StreetName = "flop" | "turn" | "river";

export interface BoardState {
  street: StreetName;
  cards: Card[]; // cartas comunitárias até essa rua
}

/** Ação do vilão que dispara a atualização do range dele. */
export type VillainAction = "fold" | "call" | "check" | "betSmall" | "betBig";

/** Ação do herói (afeta o range do vilão e o próprio range recomendado). */
export type HeroAction = "fold" | "check" | "call" | "betSmall" | "betBig";

/** Contexto do spot street-by-street. */
export interface StreetContext {
  heroPosition: string;
  villainPosition: string;
  heroStackBB: number;
  villainStackBB: number;
  /** Pot total (bb) no meio ANTES da ação atual. */
  potBB: number;
  /** Tamanho da aposta que o vilão enfrentou no call (0 se checkou/abriu). */
  facedBetBB: number;
}

export interface StreetDecision {
  action: string; // "fold" | "call" | "betSmall" | "betBig" | "check" | "raiseSmall" | "raiseBig"
  freq: number; // confiança 0..1
}

export interface StreetRangeSnapshot {
  range: Range;
  percent: number; // % de 1326 combos
  topHands: { handType: string; freq: number }[]; // top 6 mãos do range
  narration: string; // frase pedagógica em PT
}

// ----------------------------- Textura do board -----------------------------

export interface BoardTexture {
  wetness: number; // 0..1 — draws/suited combos têm mais valor
  highCardPresent: number; // 0..1 — há carta alta (A/K) no board
  paired: boolean; // par ou trinca no board
  threeOfASuit: boolean; // 3 cartas do mesmo naipe (flush draw possível)
  straightDrawFriendly: boolean; // conectado (draws de escada abundantes)
  summary: "seco" | "moderado" | "molhado" | "muito molhado";
}

const SUIT_LABELS = ["♣", "♦", "♥", "♠"];

export function rankOf(card: Card): number {
  return 2 + (card >> 2);
}
export function suitOf(card: Card): number {
  return card & 3;
}
export function rankLetter(card: Card): string {
  return SUIT_LABELS[suitOf(card)];
}

export function describeBoard(board: BoardState): string {
  return board.cards
    .map((c) => rankName(rankOf(c)) + SUIT_LABELS[suitOf(c)])
    .join(" ");
}

export function rankName(r: number): string {
  if (r === 14) return "A";
  if (r === 13) return "K";
  if (r === 12) return "Q";
  if (r === 11) return "J";
  if (r === 10) return "T";
  return String(r);
}

/** Classifica a textura do board corrente. */
export function analyzeBoard(board: BoardState): BoardTexture {
  const ranks = board.cards.map(rankOf);
  const suits = board.cards.map(suitOf);
  const hasHighCard = ranks.some((r) => r >= 13); // A ou K
  const paired = ranks.length !== new Set(ranks).size;

  let suitMax = 0;
  const suitCounts: Record<number, number> = {};
  for (const s of suits) {
    suitCounts[s] = (suitCounts[s] ?? 0) + 1;
    if (suitCounts[s] > suitMax) suitMax = suitCounts[s];
  }
  const threeOfASuit = suitMax >= 3;

  const sorted = [...ranks].sort((a, b) => b - a);
  let straightFriendly = false;
  if (sorted.length >= 3) {
    // 3 cartas: board conectado se span ≤ 4 (ex.: 8-9-T) ou com gap de 1 (ex.: 8-T-J)
    if (sorted.length === 3) {
      straightFriendly = sorted[0] - sorted[2] <= 4 || (sorted[0] - sorted[1] === 2 && sorted[1] - sorted[2] === 1);
    } else {
      for (let i = 0; i <= sorted.length - 3; i++) {
        if (sorted[i] - sorted[i + 2] <= 3) {
          straightFriendly = true;
          break;
        }
      }
    }
  }

  // wetness: draws de flush + escada elevam; par no board reduz (board travado)
  let wetness = 0;
  if (threeOfASuit) wetness += 0.55;
  if (straightFriendly) wetness += 0.35;
  if (paired) wetness -= 0.15;
  wetness = Math.max(0, Math.min(1, wetness));

  let summary: BoardTexture["summary"] = "seco";
  if (wetness >= 0.7) summary = "muito molhado";
  else if (wetness >= 0.45) summary = "molhado";
  else if (wetness >= 0.2) summary = "moderado";

  return {
    wetness,
    highCardPresent: hasHighCard ? 1 : 0,
    paired,
    threeOfASuit,
    straightDrawFriendly: straightFriendly,
    summary,
  };
}

// ----------------------------- Range inicial do vilão -----------------------------

/**
 * Range de abertura do vilão por posição (o mesmo esqueleto top-X% usado no
 * resto do app: top mãos por handStrength/handRank, nunca tabela inventada).
 * Posições agressivas abrem mais largo; UTG mais justo.
 */
export function preflopOpenRange(villainPosition: string, effBB: number): Range {
  // Largura por posição (10bb+ — push/fold 12bb fica mais largo, já é efeito
  // do stackDepth via fator; valores calibrados no padrão RFI de torneio).
  const widthByPos: Record<string, number> = {
    UTG: 0.15,
    UTG1: 0.18,
    MP: 0.21,
    LJ: 0.25,
    HJ: 0.29,
    CO: 0.36,
    BTN: 0.45,
    SB: 0.34,
    BB: 0.15,
  };
  let width = widthByPos[villainPosition] ?? 0.3;

  // Stacks curtos (≤12bb) → push/fold widening natural.
  if (effBB <= 12) width = Math.min(0.7, width * 1.6);
  else if (effBB <= 20) width = Math.min(0.62, width * 1.25);

  // Monta o range pegando as top-(width×169) mãos do ranking oficial.
  const ordered = allHandTypes().slice().sort((a, b) => handRank(a) - handRank(b));
  const take = Math.max(10, Math.round(width * 169));
  const range: Range = {};
  for (let i = 0; i < take; i++) range[ordered[i]] = 1;
  return range;
}

// ----------------------------- Continuação do range do vilão -----------------------------

/**
 * Score de continuação de uma mão (0..1) quando o vilão enfrenta uma ação no
 * board dado. Modelo heurístico: hit no board × força da mão × textura.
 */
function continuationScore(
  handType: string,
  board: BoardState,
  texture: BoardTexture,
  facedBetBB: number,
  potBB: number
): number {
  const hit = boardHit(handType, board);
  const strength = handScore(handType); // equity vs random como proxy de força

  // Preço da aposta: potOdds efetivo modera mãos marginais.
  const cheap = facedBetBB <= 0 ? 1 : facedBetBB <= potBB * 0.5 ? 0.55 : facedBetBB <= potBB ? 0.25 : 0.05;

  // ---- Componente base: força da mão no board ----
  let base: number;
  if (hit.made === "trips+" ) base = 1.0;
  else if (hit.made === "twoPairOrBetter") base = 0.95;
  else if (hit.made === "topPair") base = 0.82;
  else if (hit.made === "middlePair") base = 0.62;
  else if (hit.made === "bottomPair") base = 0.45;
  else if (hit.made === "overPair") base = 0.78;
  else if (hit.draw === "flushDraw") base = 0.34 + texture.wetness * 0.3;
  else if (hit.draw === "straightDraw") base = 0.3 + texture.wetness * 0.3;
  else if (hit.made === "weakPair") base = 0.3;
  else base = 0.06 + strength * 0.24; // mão de carta alta sem hit (float)

  // ---- Correção por textura: no board molhado, draws sobem, pares fracos caem ----
  if (texture.threeOfASuit && hit.draw === "flushDraw") base = Math.min(1, base + 0.25);
  if (texture.straightDrawFriendly && hit.draw === "straightDraw") base = Math.min(1, base + 0.15);
  if (texture.wetness > 0.5 && hit.made === "bottomPair") base *= 0.8;
  if (texture.wetness > 0.6 && hit.made === "middlePair" && !hit.draw) base *= 0.88;

  // ---- Correção por preço: aposta cara expulsa floats e mãos fracas ----
  base *= cheap + (1 - cheap) * Math.min(1, 0.5 + strength);

  return Math.max(0.02, Math.min(1, base));
}

/** Verifica o que a mão fez no board (feito / draw). */
export function boardHit(handType: string, board: BoardState): { made: string; draw: string | null } {
  const ranks = board.cards.map(rankOf);
  const [hi, lo] = handTypeRanksNum(handType);

  // Par na mão: as duas cartas têm o MESMO rank — contar hits uma única vez.
  const isPocketPair = hi === lo;
  const hiHits = isPocketPair ? Math.min(ranks.filter((r) => r === hi).length, 2) : ranks.filter((r) => r === hi).length;
  const loHits = isPocketPair ? 0 : ranks.filter((r) => r === lo).length;

  if (!isPocketPair && hiHits >= 1 && loHits >= 1) return { made: "twoPairOrBetter", draw: null };
  if (isPocketPair && hiHits >= 1) return { made: "trips+", draw: null }; // pocket pair + 1 carta do board = trinca
  if (hiHits >= 2) return { made: "trips+", draw: null };

  // Overpair (par na mão > maior carta do board)
  if (hi === lo && hi > Math.max(...ranks)) return { made: "overPair", draw: null };

  // Uma carta da mão bateu no board
  if (hiHits === 1) {
    const maxBoard = Math.max(...ranks);
    if (hi === maxBoard) return { made: "topPair", draw: flushOrStraight(handType, board) };
    const others = ranks.filter((r) => r !== hi);
    const othersMax = others.length ? Math.max(...others) : 0;
    if (hi > othersMax) return { made: "middlePair", draw: flushOrStraight(handType, board) };
    return { made: "bottomPair", draw: flushOrStraight(handType, board) };
  }
  if (loHits === 1) return { made: "bottomPair", draw: flushOrStraight(handType, board) };

  // Par na mão SEM hit no board: overpair (acima do board) ou underpair (pair baixo)
  if (isPocketPair) {
    const maxBoard = Math.max(...ranks);
    if (hi > maxBoard) return { made: "overPair", draw: null };
    // pair na mão entre as cartas do board: middle pair não se aplica (não bateu);
    // underpair com chance de virar set = "pair weak" mas mais forte que air
    return { made: "weakPair", draw: flushOrStraight(handType, board) };
  }

  return { made: "weakPair", draw: flushOrStraight(handType, board) };
}

function flushOrStraight(handType: string, board: BoardState): string | null {
  const ranks = board.cards.map(rankOf);
  const [hi, lo] = handTypeRanksNum(handType);
  if (flushDrawChance(handType, board)) return "flushDraw";
  const all = [...ranks, hi, lo].sort((a, b) => a - b);
  for (let i = 0; i <= all.length - 4; i++) {
    if (all[i + 3] - all[i] <= 4) return "straightDraw";
  }
  // gap 1 com A-low (A2345)
  if (all.includes(2) && all.includes(3) && all.includes(4) && all.includes(14)) return "straightDraw";
  return null;
}

function flushDrawChance(handType: string, board: BoardState): boolean {
  // suited: qualquer naipe — a chance existe se 2+ cartas do board forem do mesmo naipe
  const suits = board.cards.map(suitOf);
  if (!handType.endsWith("s") || suits.length < 2) return false;
  const counts: Record<number, number> = {};
  for (const s of suits) counts[s] = (counts[s] ?? 0) + 1;
  return Object.values(counts).some((c) => c >= 2);
}

function handTypeRanksNum(handType: string): [number, number] {
  const RANKS = "23456789TJQKA";
  const hi = 2 + RANKS.indexOf(handType[0]);
  const lo = handType.length === 2 ? hi : 2 + RANKS.indexOf(handType[1]);
  return [hi, lo];
}

// Frequência com que uma ação de CHECK ocorre para a mão no board.
function checkScore(handType: string, board: BoardState, _texture: BoardTexture): number {
  const hit = boardHit(handType, board);
  if (hit.made === "trips+" || hit.made === "twoPairOrBetter") return 0.25; // mãos fortes preferem apostar
  if (hit.made === "topPair") return 0.45;
  if (hit.made === "overPair") return 0.5;
  if (hit.draw) return 0.35;
  if (hit.made === "weakPair") return 0.6;
  return 0.72; // mãos fracas sem hit quase sempre dão check (ou fold se apostarem)
}

// Frequência de APOSTAR (betSmall ~ meio pote) para a mão no board.
function betScore(handType: string, board: BoardState, texture: BoardTexture, _isVillain: boolean): number {
  const hit = boardHit(handType, board);
  let base: number;
  if (hit.made === "trips+") base = 0.8;
  else if (hit.made === "twoPairOrBetter") base = 0.75;
  else if (hit.made === "topPair") base = 0.62;
  else if (hit.made === "overPair") base = 0.58;
  else if (hit.draw) base = 0.5;
  else if (hit.made === "middlePair") base = 0.42;
  else if (hit.made === "bottomPair") base = 0.35;
  else if (hit.made === "weakPair") base = 0.18 + texture.wetness * 0.15;
  else base = 0.08 + texture.wetness * 0.28; // backdoor/air bluff em board molhado
  return Math.min(1, Math.max(0, base));
}

/**
 * Atualiza o range do vilão conforme a ação dele no board.
 * fold/call → multiplica pela probabilidade de continuar/foldar;
 * check/bet → multiplica pela tendência de checkar/apostar e normaliza.
 */
export function continueVillainRange(
  prev: Range,
  action: VillainAction,
  board: BoardState,
  ctx: StreetContext
): StreetRangeSnapshot {
  const texture = analyzeBoard(board);
  const potBB = ctx.potBB;
  const faced = ctx.facedBetBB;
  const out: Range = {};

  if (action === "fold") {
    // Range "que foldou" = o que não continuou. Não usamos normalmente, mas
    // o herói pode querer ver o que o vilão DESISTIU.
    for (const [ht, freq] of Object.entries(prev)) {
      if (freq <= 0) continue;
      const keep = 1 - continuationScore(ht, board, texture, faced, potBB);
      if (keep > 0.001) out[ht] = freq * keep;
    }
  } else if (action === "call" || action === "check") {
    for (const [ht, freq] of Object.entries(prev)) {
      if (freq <= 0) continue;
      const keep =
        action === "call"
          ? continuationScore(ht, board, texture, faced, potBB)
          : checkScore(ht, board, texture);
      if (keep > 0.001) out[ht] = freq * keep;
    }
  } else {
  // betSmall / betBig — quem aposta tem mãos feitas + draws + alguns bluffs.
    for (const [ht, freq] of Object.entries(prev)) {
      if (freq <= 0) continue;
      const keep = betScore(ht, board, texture, true) * (action === "betBig" ? 0.9 : 1.1);
      if (keep > 0.001) out[ht] = freq * keep;
    }
  }

  return normalizeSnapshot(out, prev, board, texture, ctx, action);
}

/** Normaliza (renormaliza) o range e gera a narração pedagógica. */
function normalizeSnapshot(
  raw: Range,
  _prev: Range,
  _board: BoardState,
  texture: BoardTexture,
  ctx: StreetContext,
  action: VillainAction
): StreetRangeSnapshot {
  const totalCombos = 1326;
  let weighted = 0;
  for (const [ht, freq] of Object.entries(raw)) weighted += freq * comboCount(ht);
  const percent = (weighted / totalCombos) * 100;

  const entries = Object.entries(raw).sort((a, b) => b[1] - a[1]);
  const topHands = entries.slice(0, 6).map(([handType, freq]) => ({ handType, freq: Math.min(1, freq * 3) }));

  const narration = buildNarration(percent, texture, action, ctx);

  return { range: raw, percent, topHands, narration };
}

/** Frase pedagógica (PT) explicando o que o range virou. */
function buildNarration(
  percent: number,
  texture: BoardTexture,
  action: VillainAction,
  _ctx: StreetContext
): string {
  const round = Math.round(percent);
  if (action === "fold") {
    return `O que ele DESISTIU: o fundo do range — mãos sem hit e sem projeto. ${round}% do range não pagou.`;
  }
  if (action === "call") {
    let line = `Ele pagou. O range encolheu para ~${round}% — quem paga aqui costuma ter hit no board, par na mão ou projeto de ${texture.threeOfASuit ? "flush" : texture.straightDrawFriendly ? "escada" : "melhoria"}.`;
    if (texture.highCardPresent) line += " Cartas altas do board pesam: mãos com hit forte ficam no topo.";
    return line;
  }
  if (action === "check") {
    return `Ele deu check. O range fica largo (~${round}%) — check inclui tanto mãos fracas querendo ver carta de graça quanto mãos fortes jogando devagar.`;
  }
  if (action === "betSmall") {
    let line = `Aposta pequena (~${round}%): mistura de valores médios (pares +), projetos e alguns bluffs.`;
    if (texture.wetness > 0.5) line += " Board molhado = mais bluffs e draws no mix.";
    return line;
  }
  return `Aposta forte (~${round}%): mãos feitas (dois pares+, trinca) ou blefes polares. A periferia do range saiu.`;
}

// ----------------------------- Range recomendado do herói -----------------------------

/**
 * Grade de ação do herói no board dado (para o botão "Ver meu range").
 * Reutiliza o motor do app via leitura: a categoria de cada mão vem do
 * score de continuação do próprio modelo (feito = bet/raise, draw = bet/call,
 * fraco = check/fold). Nota 100 = mesmo motor, nunca tabela solta.
 */
export interface HeroGridCell {
  handType: string;
  /** "bet" | "check" | "fold" — ação primária. */
  category: string;
  freq: number; // confiança
  topPair?: boolean;
  draw?: boolean;
}

export function heroRecommendedGrid(
  board: BoardState,
  _heroPosition: string,
  _villainPosition: string,
  _effBB: number,
  _villainIsAggressive: boolean,
  _potBB: number
): HeroGridCell[] {
  const texture = analyzeBoard(board);
  return allHandTypes().map((ht) => {
    const hit = boardHit(ht, board);
    let category: string;
    let freq: number;

    if (hit.made === "trips+" || hit.made === "twoPairOrBetter") {
      category = "bet";
      freq = 0.95;
    } else if (hit.made === "topPair") {
      category = "bet";
      freq = 0.85;
    } else if (hit.made === "overPair") {
      category = "bet";
      freq = 0.8;
    } else if (hit.made === "middlePair") {
      category = texture.wetness > 0.5 ? "check" : "bet";
      freq = 0.6;
    } else if (hit.made === "bottomPair" || hit.made === "weakPair") {
      category = "check";
      freq = 0.5;
    } else if (hit.draw === "flushDraw" || hit.draw === "straightDraw") {
      category = "bet";
      freq = 0.72;
    } else {
      // mão sem hit: check ou fold conforme força da carta alta
      const strength = handScore(ht);
      category = strength > 0.62 ? "check" : "fold";
      freq = strength > 0.62 ? 0.45 : 0.5;
    }

    return {
      handType: ht,
      category,
      freq,
      topPair: hit.made === "topPair" || hit.made === "trips+",
      draw: !!hit.draw,
    };
  });
}

// ----------------------------- Helpers de decisão -----------------------------

/** Ação correta aproximada do herói no spot street-by-street (para scoring). */
export function heroBestAction(
  handType: string,
  board: BoardState,
  facingBetBB: number,
  potBB: number,
  texture: BoardTexture
): { action: string; freq: number; reason: string } {
  const hit = boardHit(handType, board);
  const price = facingBetBB > 0 ? facingBetBB / (potBB + facingBetBB) : 0;
  const neededEquity = facingBetBB > 0 ? price : 0;

  // Equity aproximada por categoria (proxy pedagógico, não Monte Carlo aqui).
  let equity = 0.0;
  if (hit.made === "trips+") equity = 0.95;
  else if (hit.made === "twoPairOrBetter") equity = 0.88;
  else if (hit.made === "topPair") equity = 0.62 + (texture.wetness > 0.5 ? 0.08 : 0);
  else if (hit.made === "overPair") equity = 0.7;
  else if (hit.made === "middlePair") equity = 0.5;
  else if (hit.made === "bottomPair") equity = 0.38;
  else if (hit.draw === "flushDraw") equity = 0.36;
  else if (hit.draw === "straightDraw") equity = 0.32;
  else if (hit.made === "weakPair") equity = 0.3;
  else equity = 0.2 + handScore(handType) * 0.2;

  if (facingBetBB > 0) {
    if (equity >= 0.62) return { action: "raise", freq: 0.8, reason: "mão forte: valor" };
    if (equity > neededEquity + 0.05) return { action: "call", freq: 0.8, reason: "paga o preço" };
    if (equity > neededEquity - 0.02 && (hit.draw || texture.wetness > 0.5)) {
      return { action: "call", freq: 0.55, reason: "marginal, mas com potencial" };
    }
    return { action: "fold", freq: 0.8, reason: "preço não compensa" };
  }
  if (equity >= 0.6) return { action: "betSmall", freq: 0.85, reason: "valor" };
  if (equity >= 0.45) return { action: "betSmall", freq: 0.6, reason: "proteção + valor fino" };
  if (hit.draw) return { action: "betSmall", freq: 0.7, reason: "semi-bluff" };
  return { action: "check", freq: 0.7, reason: "controle de pote" };
}

// ----------------------------- Narração simples/técnica -----------------------------

export function boardNarration(board: BoardState, texture: BoardTexture): string {
  const desc = describeBoard(board);
  const t = texture.summary;
  return `${desc} — board ${t}${texture.threeOfASuit ? ", três cartas do mesmo naipe" : ""}${texture.straightDrawFriendly ? ", conectado" : ""}${texture.paired ? ", com par" : ""}`;
}

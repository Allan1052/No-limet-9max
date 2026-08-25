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

import { allHandTypes, comboCount, handTypeCombos, rangeCombos, type Range } from "../../ranges/types";
import { buildTopRange } from "../../ranges/build";
import { postflopRequiredEquity } from "../../ranges/postflopMath";
import { handRank, handScore } from "../../ranges/handStrength";
import { equityHandVsRange } from "../../engine/equity";
import { seededRng, type Card } from "../../engine/cards";

// ---------------------------------------------------------------------------
// EQUITY REAL (Monte Carlo) — o mesmo motor do jogo. Substitui o "proxy por
// categoria" (topPair=0.62 etc.): cada mão específica ganha o SEU valor real
// contra o range do vilão naquele board. É o "cada carta tem um valor".
// ---------------------------------------------------------------------------

/** Um combo do handType que não conflita com o board (pra equity válida). */
function pickHeroCombo(handType: string, board: Card[]): Card[] | null {
  const used = new Set(board);
  for (const c of handTypeCombos(handType)) {
    if (!used.has(c[0]) && !used.has(c[1])) return c;
  }
  return null;
}

/** Semente estável por (mão × board) — a grade não "pisca" entre renders. */
function equitySeed(handType: string, board: Card[]): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < handType.length; i++) h = Math.imul(h ^ handType.charCodeAt(i), 16777619);
  for (const c of board) h = Math.imul(h ^ (c + 1), 16777619);
  return (h >>> 0) || 1;
}

/** Equity REAL da mão do herói contra o range do vilão, neste board. */
export function realEquity(
  handType: string,
  villainRange: Range,
  board: Card[],
  iterations = 500,
  rng?: () => number,
): number {
  const hero = pickHeroCombo(handType, board);
  const villain = rangeCombos(villainRange);
  if (!hero || villain.length === 0) return 0.5;
  const r = rng ?? seededRng(equitySeed(handType, board));
  return equityHandVsRange(hero, villain, board, iterations, r).equity;
}

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
    LJ: 0.24,
    CO: 0.27,
    BTN: 0.42,
    SB: 0.35,
    BB: 0.15,
  };
  let width = widthByPos[villainPosition] ?? 0.3;

  // Stacks curtos (≤12bb) → push/fold widening natural.
  if (effBB <= 12) width = Math.min(0.7, width * 1.6);
  else if (effBB <= 20) width = Math.min(0.62, width * 1.25);

  // Monta o range pegando as top mãos do ranking oficial até fechar
  // width × 1326 COMBOS (pares têm 6, suited 4, offsuited 12 — contar combos
  // dá a largura exata de torneio: UTG ~15% dos 1326 combos, não ~15% dos
  // 169 tipos, que distorce porque pares valem 1 tipo mas 6 combos).
  const ordered = allHandTypes().slice().sort((a, b) => handRank(a) - handRank(b)); // rank 0 = mais forte → asc = melhores primeiro
  const comboTarget = Math.max(60, Math.round(width * 1326));
  const range: Range = {};
  let combos = 0;
  for (const ht of ordered) {
    const c = comboCount(ht);
    if (combos + c > comboTarget) break; // fecha no alvo exato de combos
    range[ht] = 1;
    combos += c;
  }
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
  // Calibrado p/ torneio recreativo: paga quem tem hit/projeto e preço justo.
  // price = fração do pote que a aposta representa no total (bet / (pot + bet)).
  // Quanto maior o preço, menor a chance de uma mão marginal continuar.
  const price = facedBetBB <= 0 ? 0 : facedBetBB / (potBB + facedBetBB);
  const priceMult = facedBetBB <= 0 ? 1 : Math.max(0.05, 1 - price * 1.05);

  // ---- Componente base: força da mão no board ----
  // Calibrado p/ torneio recreativo: quem paga aposta cara raramente é com
  // bottom pair fraco ou carta alta. Draws recebem bônus de textura.
  let base: number;
  if (hit.made === "trips+") base = 1.0;
  else if (hit.made === "twoPairOrBetter") base = 0.92;
  else if (hit.made === "topPair") base = 0.78 + (texture.highCardPresent ? 0 : 0.06);
  else if (hit.made === "middlePair") base = 0.42;
  else if (hit.made === "bottomPair") base = 0.24;
  else if (hit.made === "overPair") base = 0.78 - (texture.wetness > 0.5 ? 0.14 : 0);
  else if (hit.draw === "flushDraw") base = 0.30 + texture.wetness * 0.32;
  else if (hit.draw === "straightDraw") base = 0.25 + texture.wetness * 0.30;
  else if (hit.made === "weakPair") base = 0.14;
  else base = 0.015 + strength * 0.08; // mão de carta alta sem hit (float raro)

  // ---- Correção por textura: no board molhado, draws sobem, pares fracos caem ----
  if (texture.threeOfASuit && hit.draw === "flushDraw") base = Math.min(1, base + 0.25);
  if (texture.straightDrawFriendly && hit.draw === "straightDraw") base = Math.min(1, base + 0.15);
  if (texture.wetness > 0.5 && hit.made === "bottomPair") base *= 0.7;
  if (texture.wetness > 0.6 && hit.made === "middlePair" && !hit.draw) base *= 0.85;

  // ---- Correção por preço: aposta cara expulsa floats e mãos fracas ----
  // Draws toleram preço maior que par fraco: mantêm parte extra da freq.
  const drawBonus = hit.draw ? 0.08 : 0;
  base = base * (priceMult + drawBonus) + (hit.draw ? priceMult * 0.12 : 0);

  return Math.max(0.015, Math.min(1, base));
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
  const isPocketPair = hi === lo;
  if (flushDrawChance(handType, board)) return "flushDraw";
  // Pocket pair não completa straight — as duas cartas têm o mesmo rank.
  if (isPocketPair) return null;
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
// Quem já PAGOU uma aposta no flop e CHECKA o turn tem range controlado:
// mãos médias/fracas sem força p/ apostar + draws + algumas armadilhas.
function checkScore(handType: string, board: BoardState, texture: BoardTexture): number {
  const hit = boardHit(handType, board);
  // Range de check é capado: quem paga flop e CHECKA turn joga mão controlada —
  // poucos top pairs checam de novo, draws e médios dominam o check range.
  if (hit.made === "trips+" || hit.made === "twoPairOrBetter") return 0.12;
  if (hit.made === "topPair") return 0.20;
  if (hit.made === "overPair") return 0.24 - (texture.wetness > 0.5 ? 0.1 : 0);
  if (hit.draw) return 0.42;
  if (hit.made === "middlePair") return 0.34;
  if (hit.made === "bottomPair") return 0.28;
  if (hit.made === "weakPair") return 0.22;
  return 0.10; // carta alta sem hit: minoria checka; board seco sobe um pouco
}

// Frequência de APOSTAR (betSmall ~ meio pote) para a mão no board.
function betScore(handType: string, board: BoardState, texture: BoardTexture, _isVillain: boolean): number {
  const hit = boardHit(handType, board);
  let base: number;
  if (hit.made === "trips+") base = 0.72;
  else if (hit.made === "twoPairOrBetter") base = 0.68;
  else if (hit.made === "topPair") base = 0.55;
  else if (hit.made === "overPair") base = 0.52;
  else if (hit.draw) base = 0.42;
  else if (hit.made === "middlePair") base = 0.3;
  else if (hit.made === "bottomPair") base = 0.22;
  else if (hit.made === "weakPair") base = 0.12 + texture.wetness * 0.1;
  else base = 0.05 + texture.wetness * 0.14; // backdoor/air bluff em board molhado
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
    // Range "que foldou" = o que não continuou. Não dá pra foldar sem aposta
    // na frente (facedBetBB <= 0) — nesse caso retornar range vazio.
    if (faced <= 0) {
      return normalizeSnapshot({}, prev, board, texture, ctx, action);
    }
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
      const keep = betScore(ht, board, texture, true) * (action === "betBig" ? 0.85 : 1.0);
      if (keep > 0.001) out[ht] = freq * keep;
    }
  }

  return normalizeSnapshot(out, prev, board, texture, ctx, action);
}

/** Normaliza (renormaliza) o range e gera a narração pedagógica. */
function normalizeSnapshot(
  raw: Range,
  _prev: Range,
  board: BoardState,
  texture: BoardTexture,
  _ctx: StreetContext,
  action: VillainAction
): StreetRangeSnapshot {
  // Corte de freq marginal: mãos com freq muito baixa já "saíram" do range
  // efetivo (não aparecem mais na grade do vilão). Sem o corte, a grade
  // exibiria dezenas de mãos com freq 2-4% que o recreativo não continua.
  const trimmed: Range = {};
  for (const [ht, freq] of Object.entries(raw)) {
    if (freq < 0.06) continue;
    trimmed[ht] = freq;
  }

  const totalCombos = 1326;
  let weighted = 0;
  for (const [ht, freq] of Object.entries(trimmed)) weighted += freq * comboCount(ht);
  const percent = (weighted / totalCombos) * 100;

  const entries = Object.entries(trimmed).sort((a, b) => b[1] - a[1]);
  const topHands = entries.slice(0, 6).map(([handType, freq]) => ({ handType, freq: Math.min(1, freq * 3) }));

  const narration = buildNarration(percent, texture, action, trimmed, board);

  return { range: trimmed, percent, topHands, narration };
}

/** Nome curto e legível de um handType para o recreativo: "AJs"→"AJ", "99"→"99". */
function shortHandName(ht: string): string {
  return ht.length === 3 ? ht.slice(0, 2) : ht;
}

/**
 * NOMEIA as mãos concretas que o vilão CONTINUA carregando, agrupadas pelo que
 * elas são no board — igual o Yuri narra ("ele tem Jx de top par, projetos como
 * KQ, pares médios como 88"). Pega o range que sobrou e traduz em exemplos.
 */
function nameContinuingHands(range: Range, board: BoardState): string {
  // No RIVER não existe projeto (não há mais carta pra vir) — um "draw" ali é
  // mão feita ou é ar. Não listamos o balde "projetos" no river.
  const isRiver = board.cards.length >= 5;
  const groups: Record<string, string[]> = { forte: [], topPar: [], projeto: [], parMedio: [] };
  const seen: Record<string, boolean> = {};
  const entries = Object.entries(range).sort((a, b) => b[1] - a[1]);
  for (const [ht] of entries) {
    const hit = boardHit(ht, board);
    let bucket: string | null = null;
    if (hit.made === "trips+" || hit.made === "twoPairOrBetter" || hit.made === "overPair") bucket = "forte";
    else if (hit.made === "topPair") bucket = "topPar";
    else if (hit.draw && !isRiver) bucket = "projeto";
    // No river o classificador às vezes rotula carta-alta (ex.: KQ) como par
    // fraco. Quem pagou 3 ruas até o river tem mão feita de verdade — par de topo
    // ou melhor — então não listamos o balde "pares médios" aqui.
    else if ((hit.made === "middlePair" || hit.made === "bottomPair" || hit.made === "weakPair") && !isRiver) bucket = "parMedio";
    if (!bucket) continue;
    const name = shortHandName(ht);
    if (seen[name]) continue;
    if (groups[bucket].length < 2) { groups[bucket].push(name); seen[name] = true; }
  }
  const parts: string[] = [];
  if (groups.forte.length) parts.push(`mãos feitas (${groups.forte.join(", ")})`);
  if (groups.topPar.length) parts.push(`top par (${groups.topPar.join(", ")})`);
  if (groups.projeto.length) parts.push(`projetos (${groups.projeto.join(", ")})`);
  if (groups.parMedio.length) parts.push(`pares médios (${groups.parMedio.join(", ")})`);
  return parts.slice(0, 3).join(", ");
}

/** Frase pedagógica (PT) explicando o que o range virou — nomeando as mãos. */
function buildNarration(
  percent: number,
  texture: BoardTexture,
  action: VillainAction,
  range: Range,
  board: BoardState
): string {
  const round = Math.round(percent);
  const hands = nameContinuingHands(range, board);
  const comOsQuais = hands ? ` — tipo ${hands}` : "";
  // No RIVER a leitura muda: não há projeto (é showdown), então quem continua tem
  // MÃO FEITA (par ou melhor) ou está blefando — nada de "projetos".
  const isRiver = board.cards.length >= 5;
  if (action === "fold") {
    return `O que ele DESISTIU: o fundo do range — ${isRiver ? "carta alta / mão que não conecta" : "carta alta sem hit e sem projeto"}. ${round}% do range largou.`;
  }
  if (action === "call") {
    // Frase diferente por rua — antes flop e turn saíam idênticos (só mudava o
    // %), o que fazia a leitura parecer "copia e cola" (pego pela análise).
    const isTurn = board.cards.length === 4;
    let line: string;
    if (isRiver) {
      line = `Ele pagou e o range encolheu para ~${round}%. No river quem paga tem mão feita — par ou melhor${comOsQuais}. Blefe e ar largam.`;
    } else if (isTurn) {
      line = `Pagou de novo no turn → range ~${round}%. Quem segue aqui já carrega valor ou projeto forte${comOsQuais}; o meio-termo foi ficando pra trás.`;
    } else {
      line = `Ele pagou e o range encolheu para ~${round}%. Quem paga no flop continua com hit ou projeto${comOsQuais}. O lixo sai.`;
    }
    if (texture.highCardPresent) line += " A carta alta no board pesa: quem tem esse hit domina o topo.";
    return line;
  }
  if (action === "check") {
    return isRiver
      ? `Ele deu check → range ~${round}%: mão média de showdown ou desistiu da mão${comOsQuais}. Topo aposta, fundo já largou.`
      : `Ele deu check → range ~${round}%: mão média querendo controle, projeto ou armadilha${comOsQuais}. Topo e fundo saíram.`;
  }
  if (action === "betSmall") {
    let line = isRiver
      ? `Aposta pequena (~${round}%): valor fino e alguns blefes${comOsQuais}.`
      : `Aposta pequena (~${round}%): valores médios, projetos e alguns blefes${comOsQuais}.`;
    if (texture.wetness > 0.5 && !isRiver) line += " Board molhado = mais projetos no mix.";
    return line;
  }
  return `Aposta forte (~${round}%): mão feita (dois pares+, trinca) ou blefe polar${comOsQuais}. A periferia saiu.`;
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

/**
 * Range de VILÃO QUE PAGOU um raise (não o range de abertura dele).
 *
 * Medir a equity do herói contra o range de ABERTURA do vilão superestima a
 * força do herói: o abridor tem muito lixo que, na prática, teria foldado ao
 * raise. Contra quem paga (range mais forte, cheio de ases e pares), pares
 * médios como 99/TT/JJ num board A-alto passam a ser CHECK (controle de pote),
 * não "aposta por valor". Modelo: a interseção do range de abertura da posição
 * com as ~22% mãos mais fortes — naturalmente sensível à posição (posição mais
 * cedo abre e paga mais apertado, então a interseção fica mais estreita).
 */
export function villainCallingRange(villainPosition: string, effBB: number): Range {
  const open = preflopOpenRange(villainPosition, effBB);
  const cap = buildTopRange(0.22);
  const out: Range = {};
  for (const [ht, f] of Object.entries(open)) {
    if (ht in cap) out[ht] = Math.min(f, cap[ht]);
  }
  // Segurança: se a interseção esvaziar (posição muito apertada), volta ao open.
  return Object.keys(out).length > 0 ? out : open;
}

export function heroRecommendedGrid(
  board: BoardState,
  heroPosition: string,
  _villainPosition: string,
  effBB: number,
  _villainIsAggressive: boolean,
  potBB: number,
  villainRange?: Range,
): HeroGridCell[] {
  const texture = analyzeBoard(board);
  // Limite pedagógico: o herói só "vive" o range que a teoria manda abrir da
  // posição dele (RFI real do motor). Fora dele, a célula é fold.
  const rfi = preflopOpenRange(heroPosition, effBB);
  // O range do vilão contra quem medir a equity. Sem ele (fallback), usa o
  // range de quem PAGOU um raise da posição do vilão — não o range de abertura
  // cru, que superestima a equity do herói (ver villainCallingRange).
  const vRange = villainRange && Object.keys(villainRange).length > 0
    ? villainRange
    : villainCallingRange(_villainPosition, effBB);

  return allHandTypes().map((ht) => {
    if (!(ht in rfi)) return { handType: ht, category: "fold", freq: 0 };
    const hit = boardHit(ht, board);
    // Decisão pela EQUITY REAL (grade = herói na vez, sem aposta na frente).
    const best = heroBestAction(ht, board, 0, potBB, texture, vRange, 320);
    const category = best.action === "check" ? "check" : "bet"; // betSmall/betBig → "bet"
    return {
      handType: ht,
      category,
      freq: best.freq,
      topPair: hit.made === "topPair" || hit.made === "trips+",
      draw: !!hit.draw,
    };
  });
}

// ----------------------------- Helpers de decisão -----------------------------

/**
 * Ação correta do herói no spot street-by-street (para scoring e para a grade).
 * Agora usa EQUITY REAL (Monte Carlo vs o range do vilão neste board) — não mais
 * proxy por categoria. O `hit` (par de topo, projeto…) segue só para a NARRAÇÃO
 * e o semi-blefe; a decisão vem da conta.
 */
export function heroBestAction(
  handType: string,
  board: BoardState,
  facingBetBB: number,
  potBB: number,
  texture: BoardTexture,
  villainRange: Range,
  iterations = 500,
  rng?: () => number,
): { action: string; freq: number; reason: string; equity: number; sizePct?: number; sizeBB?: number } {
  const hit = boardHit(handType, board);
  const streetIdx = board.cards.length >= 5 ? 2 : board.cards.length === 4 ? 1 : 0;
  const equity = realEquity(handType, villainRange, board.cards, iterations, rng);
  const p = Math.round(equity * 100);

  // Tamanho recomendado (fração do pote) → dá pra mostrar "aposte ~X% (≈ Y bb)".
  const size = (pct: number) => ({ sizePct: pct, sizeBB: Math.round(potBB * pct * 10) / 10 });

  if (facingBetBB > 0) {
    // Limiar de call disciplinado — MESMA conta do motor da mesa (fonte única em
    // postflopRequiredEquity). Antes o coach pagava com só ~4 pontos acima do
    // preço cru, aprovando calls frouxos que os bots foldariam.
    const required = postflopRequiredEquity({
      potBB,
      toCall: facingBetBB,
      streetIdx,
      // Coach não personifica ninguém → stickiness neutra (0.5); herói tem stack
      // fundo o bastante pra crédito de implied odds em projeto forte.
      drawStrength: hit.draw ? 0.6 : 0,
      heroStackBehind: potBB * 3,
    });
    const rq = Math.round(required * 100);
    // Raise de valor: ~3x a aposta enfrentada (limitado ao pote), em bb reais.
    if (equity >= Math.max(0.66, required + 0.14)) {
      const raiseBB = Math.round(Math.min(facingBetBB * 3, potBB + facingBetBB * 2) * 10) / 10;
      return { action: "raise", freq: 0.8, reason: `equity ${p}%: valor forte — aumente para ~${raiseBB}bb`, equity, sizeBB: raiseBB, sizePct: (potBB > 0 ? raiseBB / potBB : undefined) as number };
    }
    if (equity >= required) return { action: "call", freq: 0.8, reason: `paga: equity ${p}% ≥ preço com disciplina ${rq}%`, equity };
    if (hit.draw && streetIdx < 2 && equity >= required - 0.05) {
      return { action: "call", freq: 0.5, reason: `marginal (equity ${p}%), mas com projeto que ganha valor extra quando bate`, equity };
    }
    return { action: "fold", freq: 0.8, reason: `folda: equity ${p}% < preço com disciplina ${rq}%`, equity };
  }
  // TAMANHO — não é só o board. Combina 3 coisas (como um solver faz na direção):
  //   1) Textura: seco/travado → pequeno (~⅓); molhado → grande (~⅔/¾) pra cobrar
  //      projetos.
  //   2) FORÇA da sua mão vs o range dele (equity real): mão que esmaga o range
  //      libera tamanho maior — e OVERBET quando o board é dinâmico/river, porque
  //      aí o vilão ainda paga com 2º melhor e projetos ("ele te ocupa").
  //   3) Board SECO com mão nuts → NÃO overbeta: aposta média, senão espanta as
  //      piores e ninguém te paga.
  const dryBase = texture.paired || texture.wetness <= 0.4;
  let betPct = texture.paired ? 0.33 : texture.wetness > 0.6 ? 0.75 : texture.wetness > 0.4 ? 0.66 : 0.33;
  const monster = hit.made === "trips+" || hit.made === "twoPairOrBetter";
  const crushing = equity >= 0.8 || monster; // esmagando o range do vilão

  if (equity >= 0.6) {
    // Valor forte. Se está esmagando o range, sobe o tamanho conforme o board.
    if (crushing) betPct = dryBase ? 0.66 : 1.25; // board seco → médio; dinâmico/river → OVERBET
    const over = betPct > 1;
    const tip = over
      ? `dá pra OVERBET (~${Math.round(betPct * 100)}% do pote) — mão muito forte num board que paga: ele segue com 2º melhor e projetos`
      : betPct >= 0.5
        ? `aposta grande (~${Math.round(betPct * 100)}% do pote) pra cobrar os projetos e extrair valor`
        : `aposta pequena (~${Math.round(betPct * 100)}% do pote) pra manter as piores pagando`;
    return { action: "betSmall", freq: 0.85, reason: `valor forte (equity ${p}%): ${tip}`, equity, ...size(betPct) };
  }
  if (equity >= 0.5) return { action: "betSmall", freq: 0.55, reason: `valor fino + proteção (equity ${p}%): aposta pequena (~33%), extrai um pouco sem inflar (mão marginal não quer pote grande)`, equity, ...size(0.33) };
  if (hit.draw && equity >= 0.34) return { action: "betSmall", freq: 0.65, reason: `semi-blefe com projeto (equity ${p}%): aposta ~${Math.round(betPct * 100)}% (mesmo tamanho do valor, pra equilibrar) — fold equity + você melhora quando bate`, equity, ...size(betPct) };
  return { action: "check", freq: 0.7, reason: `controle de pote (equity ${p}%): sem valor claro nem projeto forte, o check evita inflar o pote`, equity };
}

// ----------------------------- Narração simples/técnica -----------------------------

export function boardNarration(board: BoardState, texture: BoardTexture): string {
  const desc = describeBoard(board);
  const t = texture.summary;
  return `${desc} — board ${t}${texture.threeOfASuit ? ", três cartas do mesmo naipe" : ""}${texture.straightDrawFriendly ? ", conectado" : ""}${texture.paired ? ", com par" : ""}`;
}

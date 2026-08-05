// ---------------------------------------------------------------------------
// Cérebro de PRÉ-FLOP para Omaha (PLO 9-max).
//
// Em vez de listas de strings frágeis, avaliamos QUALQUER mão de 4 cartas por
// FORÇA — do mesmo jeito que o lado Hold'em trabalha por ranking. A força de
// uma mão de PLO no pré-flop vem de quatro fontes que somamos:
//
//   • Pares        — AA/KK premium; par duplo (AAKK) vale muito; trincas são
//                    armadilha (cartas mortas) e perdem pontos.
//   • Cartas altas — ases e broadways aumentam o valor de showdown.
//   • Conexão      — rundowns/wraps (JT98) fazem sequências; gaps e "danglers"
//                    (uma carta solta e baixa) tiram valor.
//   • Naipes       — double-suited > single-suited > rainbow; naipe do Ás dá
//                    potencial de nut flush.
//
// A pontuação vira uma decisão via limiares por posição (abrir/3-bet/4-bet/
// pagar/foldar), calibrados sobre a distribuição real de mãos de 4 cartas.
// Cobre TODAS as 9 cadeiras — nada de foldar 100% por posição faltante.
// ---------------------------------------------------------------------------

import { rankOf, suitOf, RANKS } from "../engine/cards";
import type { Card } from "../engine/cards";
import type { Position } from "./types";
import { POSITIONS } from "./types";
import { stackDepthAdjust } from "./stackDepth";
import type { PreflopContext, PreflopDecision, PreflopFreq } from "./preflop";

// --- Pontuação de força (0..~100) --------------------------------------------

/** Valor normalizado de um rank de par: AA≈1.0, 22≈0.006 (quadrático). */
function pairValue(rank: number): number {
  return Math.pow((rank - 1) / 13, 2);
}

/** Conectividade: reconhece rundowns/wraps, considerando o Ás alto E baixo. */
function connectivity(ranks: number[]): number {
  const uniq = Array.from(new Set(ranks));
  const reps: number[][] = [uniq.slice()];
  if (uniq.includes(14)) reps.push(uniq.map((r) => (r === 14 ? 1 : r))); // roda (A2345)
  let best = 0;
  for (const rep of reps) {
    const s = [...rep].sort((a, b) => a - b);
    let c = 0;
    for (let i = 1; i < s.length; i++) {
      const gap = s[i] - s[i - 1];
      if (gap === 1) c += 3;
      else if (gap === 2) c += 1.4;
      else if (gap === 3) c += 0.4;
    }
    if (s.length >= 4) {
      const span = s[s.length - 1] - s[0];
      if (span <= 3) c += 4; // rundown puro de 4 (JT98)
      else if (span === 4) c += 2.5; // rundown com 1 gap
      else if (span === 5) c += 1;
    } else if (s.length === 3) {
      const span = s[s.length - 1] - s[0];
      if (span <= 2) c += 1.5; // trinca de ranks conectada (com um par)
    }
    best = Math.max(best, c);
  }
  return best;
}

/**
 * Força de pré-flop de uma mão de 4 cartas de Omaha. Escala ~0..100; maior é
 * mais forte. Não é equity exata — é um proxy calibrado que ordena as mãos de
 * forma coerente, suficiente para ranges de estudo.
 */
export function omahaPreflopScore(cards: Card[]): number {
  const ranks = cards.map(rankOf);
  const suits = cards.map(suitOf);

  const rankCount: Record<number, number> = {};
  for (const r of ranks) rankCount[r] = (rankCount[r] || 0) + 1;
  const suitCount: Record<number, number> = {};
  for (const s of suits) suitCount[s] = (suitCount[s] || 0) + 1;

  const pairs: number[] = [];
  const tripsPlus: { rank: number; count: number }[] = [];
  for (const [r, c] of Object.entries(rankCount)) {
    if (c === 2) pairs.push(Number(r));
    else if (c >= 3) tripsPlus.push({ rank: Number(r), count: c });
  }
  pairs.sort((a, b) => b - a);

  let score = 0;

  // Pares.
  if (pairs.length >= 1) {
    score += 24 * pairValue(pairs[0]);
    if (pairs[0] === 14) score += 8; // AA premium
    else if (pairs[0] === 13) score += 3; // KK
  }
  if (pairs.length >= 2) score += 14 * pairValue(pairs[1]); // par duplo (AAKK)
  for (const t of tripsPlus) {
    score -= t.count === 3 ? 10 : 20; // trinca/quadra: cartas mortas
    score += 10 * pairValue(t.rank) * 0.4; // resta um resíduo de valor de par
  }

  // Cartas altas.
  const sortedDesc = [...ranks].sort((a, b) => b - a);
  score += 8 * ((sortedDesc[0] + sortedDesc[1] - 4) / 24); // par de topo
  const broadway = ranks.filter((r) => r >= 10).length;
  score += broadway * 1.8;

  // Conexão.
  score += connectivity(ranks) * 1.3;

  // Naipes.
  const suitVals = Object.values(suitCount).sort((a, b) => b - a);
  if (suitVals[0] === 2 && suitVals[1] === 2) score += 12; // double-suited
  else if (suitVals[0] === 2) score += 6; // single-suited
  else if (suitVals[0] === 3) score += 2; // 3 de um naipe (uma carta morta)
  // monotone (4 do mesmo naipe) não soma nada.
  for (const [s, c] of Object.entries(suitCount)) {
    if (c >= 2) {
      const su = Number(s);
      const hasAce = cards.some((cd) => suitOf(cd) === su && rankOf(cd) === 14);
      const hasKing = cards.some((cd) => suitOf(cd) === su && rankOf(cd) === 13);
      if (hasAce) score += 5; // potencial de nut flush
      else if (hasKing) score += 2;
    }
  }

  // Dangler: mão sem par com uma carta solta e baixa.
  if (pairs.length === 0 && tripsPlus.length === 0) {
    const s = [...ranks].sort((a, b) => a - b);
    const gapLow = s[1] - s[0];
    const gapHigh = s[3] - s[2];
    if (gapLow >= 3 && s[0] <= 8) score -= (gapLow - 1) * 1.2;
    if (gapHigh >= 4) score -= (gapHigh - 2) * 0.8;
  }

  return Math.max(0, score);
}

// --- Da fração de range para o limiar de score --------------------------------
//
// Tabela de percentis medida sobre 200k mãos aleatórias de 4 cartas (ver
// omahaPreflop.calibrate.test.ts). Mapeia "fração do topo" → score mínimo.
// Interpolamos linearmente entre os pontos.
const PERCENTILE_TABLE: { frac: number; score: number }[] = [
  { frac: 0.02, score: 54.5 },
  { frac: 0.05, score: 42.7 },
  { frac: 0.08, score: 36.5 },
  { frac: 0.12, score: 31.9 },
  { frac: 0.16, score: 29.0 },
  { frac: 0.2, score: 27.0 },
  { frac: 0.25, score: 24.8 },
  { frac: 0.3, score: 23.3 },
  { frac: 0.4, score: 21.0 },
  { frac: 0.5, score: 18.9 },
  { frac: 0.7, score: 15.5 },
  { frac: 1.0, score: 0.0 },
];

/** Score mínimo para estar no "top `frac`" das mãos (via tabela de percentis). */
function scoreForTopFraction(frac: number): number {
  const t = PERCENTILE_TABLE;
  if (frac <= t[0].frac) return t[0].score;
  if (frac >= t[t.length - 1].frac) return t[t.length - 1].score;
  for (let i = 1; i < t.length; i++) {
    if (frac <= t[i].frac) {
      const a = t[i - 1];
      const b = t[i];
      const k = (frac - a.frac) / (b.frac - a.frac);
      return a.score + k * (b.score - a.score);
    }
  }
  return t[t.length - 1].score;
}

// --- Frações de range por posição --------------------------------------------

/** Fração de abertura (RFI) por posição — mais cedo, mais apertado. */
const OPEN_FRACTION: Record<Position, number> = {
  UTG: 0.12,
  UTG1: 0.14,
  MP: 0.17,
  LJ: 0.21,
  HJ: 0.27,
  CO: 0.35,
  BTN: 0.46,
  SB: 0.4,
  BB: 0.0, // BB não abre (fecha a ação)
};

// Enfrentando UMA abertura: 3-bet de valor (topo), depois pagar (mais em posição).
const VS_OPEN_3BET = 0.07; // top ~7% re-raise por valor
const VS_OPEN_CALL_IP = 0.22; // em posição, paga até ~22%
const VS_OPEN_CALL_OOP = 0.13; // fora de posição, paga até ~13%

// Enfrentando um 3-bet (herói abriu): 4-bet nutted, pagar em posição, senão fold.
const VS_3BET_4BET = 0.04;
const VS_3BET_CALL_IP = 0.12;
const VS_3BET_CALL_OOP = 0.06;

/** Abertura de PLO ≈ pote (3.5bb), +1bb por limper (isolamento). */
const OMAHA_BASE_OPEN = 3.5;

function posIndex(p: Position): number {
  return POSITIONS.indexOf(p);
}

/** Herói age depois do vilão na mão (em posição pós-flop)? */
function heroInPosition(hero: Position, villain: Position): boolean {
  // SB/BB agem primeiro pós-flop; fora isso, quem está mais à esquerda (índice
  // maior até BTN) tem a posição.
  if (hero === "SB" || hero === "BB") return false;
  if (villain === "SB" || villain === "BB") return true;
  return posIndex(hero) > posIndex(villain);
}

/** Rótulo legível da mão (ex.: "AAKQ ds"). */
export function omahaHandLabel(cards: Card[]): string {
  const ranks = [...cards].sort((a, b) => rankOf(b) - rankOf(a));
  const letters = ranks.map((c) => RANKS[rankOf(c) - 2]).join("");
  const suitCount: Record<number, number> = {};
  for (const c of cards) suitCount[suitOf(c)] = (suitCount[suitOf(c)] || 0) + 1;
  const vals = Object.values(suitCount).sort((a, b) => b - a);
  let suffix = "";
  if (vals[0] === 2 && vals[1] === 2) suffix = " ds";
  else if (vals[0] === 2) suffix = " ss";
  return letters + suffix;
}

/** Mistura suave na fronteira (para a nota por frequência do feedback). */
function bandMixOmaha(action: string, score: number, threshold: number, alt: string): PreflopFreq[] {
  const margin = 4; // pontos de score
  if (score >= threshold + margin) return [{ action, freq: 1 }];
  if (score >= threshold) return [{ action, freq: 0.65 }, { action: alt, freq: 0.35 }];
  return [{ action: alt, freq: 1 }];
}

/**
 * Decisão de pré-flop para Omaha. Substitui as antigas listas de string por
 * um modelo de força coerente, cobrindo abertura, defesa vs abertura, defesa
 * vs 3-bet e push/fold em stack curto — nas 9 cadeiras.
 */
export function omahaPreflopDecision(ctx: PreflopContext): PreflopDecision {
  const score = omahaPreflopScore(ctx.hand);
  const label = omahaHandLabel(ctx.hand);
  const sd = stackDepthAdjust(ctx.effectiveBB, ctx.profile.adaptability);
  const hero = ctx.heroPosition;
  const openSize = ctx.openSizeBB ?? OMAHA_BASE_OPEN;

  // Largura por perfil: multiplica a fração de range (LAG mais largo, nit mais
  // apertado). rfiWidth 1.0 é neutro; amortecido para não distorcer demais.
  const widthMult = 1 + (ctx.profile.rfiWidth - 1) * 0.5;

  // ----- Enfrentando um 3-bet (herói abriu) -----
  if (ctx.threeBet) {
    const inPos = ctx.raiserPosition ? heroInPosition(hero, ctx.raiserPosition) : false;
    const fourBetTo = Math.min(ctx.effectiveBB, openSize * 2.4);
    if (sd.pushFold) {
      const jamT = scoreForTopFraction(VS_3BET_4BET + 0.06);
      return score >= jamT
        ? dec("jam", ctx.effectiveBB, `${label}: com stack curto, 4-bet vira all-in.`, label,
            bandMixOmaha("jam", score, jamT, "fold"))
        : dec("fold", 0, `${label}: fraca demais para continuar contra o 3-bet com stack curto.`, label);
    }
    const t4bet = scoreForTopFraction(VS_3BET_4BET);
    if (score >= t4bet) {
      return dec("3bet", fourBetTo, `${label}: mão de topo — 4-bet por valor contra o 3-bet.`, label,
        bandMixOmaha("3bet", score, t4bet, inPos ? "call" : "fold"));
    }
    const tcall = scoreForTopFraction(inPos ? VS_3BET_CALL_IP : VS_3BET_CALL_OOP);
    if (score >= tcall) {
      return dec("call", openSize, `${label}: paga o 3-bet ${inPos ? "em posição" : ""} para jogar o flop.`.trim(), label,
        bandMixOmaha("call", score, tcall, "fold"));
    }
    return dec("fold", 0, `${label}: fora da range de continuar contra um 3-bet.`, label);
  }

  // ----- Pote não aberto: abertura (RFI) -----
  if (!ctx.raiserPosition) {
    const limpers = Math.max(0, Math.floor(ctx.limpers ?? 0));
    if (hero === "BB" && limpers === 0) {
      // Ação fechada no BB sem limpers: check (não há o que abrir).
      return dec("call", 0, `${label}: BB fecha a ação sem raise — segue de graça.`, label);
    }
    const openT = scoreForTopFraction(Math.min(0.95, OPEN_FRACTION[hero] * widthMult));
    if (score >= openT) {
      if (sd.pushFold) {
        return dec("jam", ctx.effectiveBB, `${label}: stack raso — abertura vira all-in (push/fold).`, label,
          bandMixOmaha("jam", score, openT, "fold"));
      }
      const size = OMAHA_BASE_OPEN + limpers;
      const reason = limpers > 0
        ? `${label}: abre isolando ${limpers} limper${limpers > 1 ? "s" : ""} — raise maior (${size.toFixed(1)}bb).`
        : `${label} está na range de abertura de ${hero} em PLO.`;
      return dec("raise", size, reason, label, bandMixOmaha("raise", score, openT, "fold"));
    }
    return dec("fold", 0, `${label} está fora da range de abertura de ${hero} em PLO.`, label);
  }

  // ----- Enfrentando UMA abertura (defesa) -----
  const inPos = heroInPosition(hero, ctx.raiserPosition);
  if (sd.pushFold) {
    const jamT = scoreForTopFraction(VS_OPEN_3BET + 0.05);
    return score >= jamT
      ? dec("jam", ctx.effectiveBB, `${label}: stack curto — shove sobre a abertura.`, label,
          bandMixOmaha("jam", score, jamT, "fold"))
      : dec("fold", 0, `${label}: fraca demais para o shove com stack curto.`, label);
  }
  const t3bet = scoreForTopFraction(VS_OPEN_3BET * widthMult);
  if (score >= t3bet) {
    const threeBetTo = Math.min(ctx.effectiveBB, openSize * 3);
    return dec("3bet", threeBetTo, `${label}: 3-bet por valor sobre a abertura de ${ctx.raiserPosition}.`, label,
      bandMixOmaha("3bet", score, t3bet, inPos ? "call" : "fold"));
  }
  const callT = scoreForTopFraction((inPos ? VS_OPEN_CALL_IP : VS_OPEN_CALL_OOP) * widthMult);
  if (score >= callT) {
    return dec("call", openSize, `${label}: paga a abertura ${inPos ? "em posição" : "no BB"} — flop especulativo.`, label,
      bandMixOmaha("call", score, callT, "fold"));
  }
  return dec("fold", 0, `${label}: fora da range de defesa contra a abertura de ${ctx.raiserPosition}.`, label);
}

/** Atalho para montar uma PreflopDecision. */
function dec(
  action: PreflopDecision["action"],
  sizeBB: number,
  reason: string,
  handType: string,
  mix?: PreflopFreq[],
): PreflopDecision {
  return { action, sizeBB, reason, handType, mix };
}

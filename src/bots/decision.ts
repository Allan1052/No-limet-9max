// ---------------------------------------------------------------------------
// Cérebro pós-flop.
//
// Toda decisão nasce de uma comparação honesta entre DUAS coisas:
//   1) a equity da mão do herói contra o range estimado do vilão (via Monte
//      Carlo, no board atual);
//   2) o preço que o pote oferece (pot odds) e/ou o valor de apostar.
//
// A partir daí, calibramos com:
//   - textura do board (seco → aposta barata e frequente; molhado → maior e
//     menos blefe);
//   - posição (em posição realiza-se mais equity);
//   - perfil (agressão, frequência de c-bet e de blefe distinguem os 8 bots).
//
// Além da ação escolhida, devolvemos uma ESTRATÉGIA MISTA (frequências) — é como
// um profissional pensa o spot ("call 70% / fold 30%"), e alimenta o feedback e
// o painel de leitura ao vivo. As frequências são heurísticas transparentes
// derivadas da margem equity×preço, não a saída de um solver.
// ---------------------------------------------------------------------------

import type { Card } from "../engine/cards";
import {
  equityHandVsRange,
  equityHandVsRangeMulti,
  equityOmahaHandVsRange,
  equityOmahaMultiway,
} from "../engine/equity";
import { detectDraw } from "../engine/draws";
import type { BotProfile } from "./profiles";
import { buildTopRange } from "../ranges/build";
import { omahaPreflopScore } from "../ranges/omahaPreflop";
import { rangeCombos } from "../ranges/types";
import { requiredEquityToCall, type IcmSpot } from "../ranges/icm";
import { postflopRequiredEquity } from "../ranges/postflopMath";
import { classifyBoard, type BoardTexture } from "./boardTexture";
import { sizingV2 } from "./sizingV2";

export type PostflopAct = "check" | "bet" | "call" | "raise" | "fold";

/** Uma entrada da estratégia mista: ação e sua frequência (0..1). */
export interface ActionFreq {
  action: PostflopAct;
  freq: number;
}

export interface PostflopContext {
  hand: Card[];
  board: Card[];
  potSize: number;
  /** Fichas para pagar (0 quando a ação está passada até o herói). */
  toCall: number;
  heroStack: number;
  inPosition: boolean;
  numOpponents: number;
  profile: BotProfile;
  /** O herói foi o agressor do pré-flop (leva iniciativa de c-bet)? */
  wasPreflopAggressor: boolean;
  /** O herói apostou na rua anterior (tem iniciativa para dar barrel)? */
  hasInitiative?: boolean;
  /** Largura estimada do range do vilão (0..1). Default 0.45. */
  villainRangePct?: number;
  /** Contexto de ICM: se pagar for all-in, a equity exigida sobe perto da bolha. */
  icmSpot?: IcmSpot;
  rng?: () => number;
  equityIterations?: number;
  /** Variante do jogo: "holdem" (2 cartas) ou "omaha" (4 cartas). */
  variant?: "holdem" | "omaha";
}

export interface PostflopDecision {
  action: PostflopAct;
  /** Para bet/raise: tamanho como fração do pote. */
  sizeToPot?: number;
  equity: number;
  requiredEquity: number;
  texture: BoardTexture;
  reason: string;
  /** Largura do range do vilão usada no cálculo (0..1), para exibição. */
  villainRangePct: number;
  /** Estratégia mista recomendada (frequências que somam ~1). */
  mix: ActionFreq[];
}

/**
 * Tamanho de aposta V2 por textura + polarização + SPR + vantagens de range/nuts.
 * Mantém a mesma saída legal do motor anterior, mas passa a responder ao stack
 * restante e à força relativa do range sem depender de RNG.
 */
function betSize(
  texture: BoardTexture,
  streetIdx: 0 | 1 | 2,
  equity: number,
  potSize: number,
  heroStack: number,
  villainRangePct: number,
): number {
  const spr = potSize > 0 ? heroStack / potSize : 20;
  const rangeAdvantage = clamp(0.45 - villainRangePct, -0.3, 0.3);
  const nutAdvantage = clamp((equity - 0.5) * 0.5, -0.4, 0.4);
  return sizingV2({
    wetness: texture.wetness,
    streetIdx,
    equity,
    spr,
    rangeAdvantage,
    nutAdvantage,
  });
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/** Normaliza e limpa uma estratégia mista (remove ~0, arredonda a 2 casas). */
function cleanMix(entries: ActionFreq[]): ActionFreq[] {
  const kept = entries.filter((e) => e.freq > 0.005);
  const sum = kept.reduce((s, e) => s + e.freq, 0) || 1;
  return kept
    .map((e) => ({ action: e.action, freq: Math.round((e.freq / sum) * 100) / 100 }))
    .sort((a, b) => b.freq - a.freq);
}

export function postflopDecision(ctx: PostflopContext): PostflopDecision {
  const rng = ctx.rng ?? Math.random;
  const iters = ctx.equityIterations ?? 1500;
  const numOpp = Math.max(1, ctx.numOpponents);
  const texture = classifyBoard(ctx.board);
  const streetIdx: 0 | 1 | 2 = ctx.board.length >= 5 ? 2 : ctx.board.length === 4 ? 1 : 0; // 0=flop 1=turn 2=river

  // Equity do herói contra o range do vilão, no board atual. Em multiway,
  // sorteamos uma mão de cada oponente e exigimos bater TODOS — equity multiway
  // correta, que não pune os projetos (o flush que completa ganha de todos de
  // uma vez), ao contrário de elevar a equity heads-up à potência do nº de
  // oponentes.
  let villainPct = ctx.villainRangePct ?? 0.45;

  // Ajuste de shove range: quando o vilão está all-in com stack curto (≤15bb),
  // o range dele é MUITO mais wide que uma range "normal" — inclui blefes,
  // mãos marginais e shoved por desespero. Usar a villainRangePct original
  // (estimada de apostas normais) subestima a equity do herói.
  // Um shove com ≤15bb deve ser tratado como um range ~40% mais largo.
  const isAllInCallHero = ctx.toCall > 0 && ctx.toCall >= ctx.heroStack;
  if (isAllInCallHero && ctx.heroStack > 0 && ctx.heroStack <= 1500) {
    // All-in call com stack efetivo ≤15bb: vilão shoveia largo (inclui blefes)
    villainPct = Math.min(0.6, villainPct * 1.4);
  }
  const isOmaha = ctx.variant === "omaha";

  let equity: number;
  if (isOmaha) {
    // Omaha: 4 cartas na mão. Usa avaliador Omaha (2 da mão + 3 do board).
    // Para multiway, passa todas as mãos (herói + vilões aleatórios).
    if (numOpp <= 1) {
      // Single villain: usa range de combos de 4 cartas.
      // Para simplificar, usamos equityOmahaHandVsRange com o range convertido.
      // No momento, construímos um range aleatório de 4 cartas para Omaha.
      const omahaRange = buildOmahaRange(villainPct, rng, ctx.hand, ctx.board);
      equity = equityOmahaHandVsRange(ctx.hand, omahaRange, ctx.board, iters, rng).equity;
    } else {
      // Multiway: herói + vilões aleatórios com 4 cartas cada.
      const hands = [ctx.hand, ...Array.from({ length: numOpp }, () => randomOmahaHand(ctx.hand, ctx.board, rng))];
      equity = equityOmahaMultiway(hands, ctx.board, iters, rng).equity;
    }
  } else {
    // Hold'em: 2 cartas na mão.
    const villainRange = rangeCombos(buildTopRange(villainPct));
    equity =
      numOpp <= 1
        ? equityHandVsRange(ctx.hand, villainRange, ctx.board, iters, rng).equity
        : equityHandVsRangeMulti(ctx.hand, villainRange, numOpp, ctx.board, iters, rng).equity;
  }

  // Em posição realiza-se mais equity (controla o tamanho do pote, vê mais showdowns).
  // PORÉM: quando é all-in (todas as fichas no meio), não há mais ação futura —
  // a equity crua é realizada 100% no showdown. Não aplicar realização reduzida.
  const isAllInSpot = ctx.toCall >= ctx.heroStack || (ctx.potSize > 0 && ctx.toCall > 0 && ctx.heroStack <= ctx.toCall * 1.5);
  const realization = isAllInSpot ? 1.0 : (ctx.inPosition ? 1.05 : 0.9);
  const effEquity = Math.min(1, equity * realization);

  const size = betSize(texture, streetIdx, equity, ctx.potSize, ctx.heroStack, villainPct);

  // ---------- Caso A: há uma aposta para pagar ----------
  if (ctx.toCall > 0) {
    const potOdds = ctx.toCall / (ctx.potSize + ctx.toCall);

    // ICM: se pagar significa ir all-in, a equity exigida sobe perto da bolha.
    const isAllInCall = ctx.toCall >= ctx.heroStack;
    let required = potOdds;
    let icmNote = "";
    if (isAllInCall && ctx.icmSpot) {
      const icmReq = requiredEquityToCall(ctx.icmSpot);
      if (icmReq > required) {
        required = icmReq;
        icmNote = ` [ICM exige ${pct(icmReq)}]`;
      }
    }

    // Disciplina para pagar. A conta é a MESMA do coach/revisão — fonte única em
    // postflopRequiredEquity (paga com mais equity que o preço cru; ruas
    // adiantadas exigem mais; perfil grudento exige menos; projeto forte ganha
    // implied odds). Não vale para all-in (que já respeita o ICM acima).
    if (!isAllInCall) {
      const draw = streetIdx < 2 && ctx.variant !== "omaha"
        ? detectDraw(ctx.hand, ctx.board)
        : { strength: 0 };
      required = postflopRequiredEquity({
        potBB: ctx.potSize,
        toCall: ctx.toCall,
        streetIdx,
        stickiness: ctx.profile.stickiness,
        numOpp,
        drawStrength: draw.strength,
        heroStackBehind: Math.max(0, ctx.heroStack - ctx.toCall),
        // Range já estreitado pela linha do vilão — evita contar "aposta = força"
        // duas vezes (na equity E no colchão).
        villainRangePct: villainPct,
      });
    }

    // ----- Estratégia mista quando enfrentamos aposta -----
    // "Continuar" (call+raise) cresce suavemente com a margem equity×preço.
    const margin = effEquity - required;
    const continueP = clamp(0.5 + margin * 3.2, 0, 1);
    let raiseShare: number;
    if (equity >= 0.78) {
      raiseShare = 0.85; // valor claro: quase sempre aumenta
    } else if (equity >= 0.62 && !isAllInCall) {
      raiseShare = 0.2 + 0.4 * ctx.profile.aggression; // valor/proteção
    } else if (!isAllInCall && texture.wetness > 0.45 && effEquity >= required * 0.7) {
      raiseShare = 0.1 + 0.25 * ctx.profile.bluffFactor * texture.wetness; // semi-blefe
    } else {
      raiseShare = 0;
    }
    const raiseP = isAllInCall ? 0 : continueP * raiseShare;
    const callP = continueP - raiseP;
    const foldP = 1 - continueP;
    const mix = cleanMix([
      { action: "fold", freq: foldP },
      { action: "call", freq: callP },
      { action: "raise", freq: raiseP },
    ]);

    if (equity >= Math.max(0.78, required + 0.12)) {
      return decision("raise", size, equity, required, texture, villainPct, mix,
        `Mão muito forte (equity ${pct(equity)} vs range): aumenta por valor.${icmNote}`);
    }

    if (effEquity >= required) {
      // Preço compensa. Mão forte às vezes aumenta (valor/proteção); senão paga.
      const raiseProb = 0.25 + 0.4 * ctx.profile.aggression;
      if (equity >= 0.66 && !isAllInCall && rng() < raiseProb) {
        return decision("raise", size, equity, required, texture, villainPct, mix,
          `Mão forte (equity ${pct(equity)} ≥ ${pct(required)}): aumenta por valor/proteção.${icmNote}`);
      }
      const priceNote = required > potOdds + 0.005 ? ` (preço do pote ${pct(potOdds)})` : "";
      return decision("call", undefined, equity, required, texture, villainPct, mix,
        `Equity ${pct(equity)} cobre os ${pct(required)} necessários${priceNote}: paga.${icmNote}`);
    }

    // Sem preço direto: considerar aumento de SEMI-BLEFE — mas SÓ com projeto de
    // verdade. Antes o código não checava o projeto, então uma mão FEITA sem
    // saída (ex.: top pair sem flush/straight draw) virava "raise semi-blefe com
    // projeto" — conselho errado que o Allan pegou (A♦T♥ no 7♠7♥T♠4♠). Sem
    // projeto, uma mão abaixo do preço folda; não blefa-raise no vazio.
    const drawForBluff = streetIdx < 2 && ctx.variant !== "omaha"
      ? detectDraw(ctx.hand, ctx.board)
      : { strength: 0 };
    const hasRealDraw = drawForBluff.strength > 0.5;
    const semibluffProb = ctx.profile.bluffFactor * 0.18 * texture.wetness;
    if (!isAllInCall && hasRealDraw && effEquity >= required * 0.7 && rng() < semibluffProb) {
      return decision("raise", size, equity, required, texture, villainPct, mix,
        `Semi-blefe: equity ${pct(equity)} com projeto em board molhado (perfil ${ctx.profile.archetype}).`);
    }
    const priceNoteFold = required > potOdds + 0.005 ? ` (preço do pote ${pct(potOdds)})` : "";
    return decision("fold", undefined, equity, required, texture, villainPct, mix,
      `Equity ${pct(equity)} abaixo dos ${pct(required)} necessários${priceNoteFold}: fold.${icmNote}`);
  }

  // ---------- Caso B: ação passada até o herói (pode apostar ou dar check) ----------
  const dryness = 1 - texture.wetness;
  const initiative = ctx.hasInitiative ?? ctx.wasPreflopAggressor;

  // Frequência de blefe/barrel do perfil (mesma lógica usada pela ação real).
  let base: number;
  if (streetIdx === 0) {
    base = (0.34 + 0.32 * dryness) * ctx.profile.cbetFactor;
    if (initiative) base += 0.14;
  } else {
    base = streetIdx === 1 ? ctx.profile.barrelTurn : ctx.profile.barrelRiver;
    if (initiative) base += 0.05;
    else base *= 0.5;
  }
  if (!ctx.inPosition) base -= 0.05;
  const equityWeight = initiative ? 0.6 + equity : 1;
  let cbetProb = base * equityWeight;
  if (ctx.numOpponents > 1) cbetProb *= 1 - ctx.profile.multiwayReduction;
  cbetProb = clamp(cbetProb, 0, 0.92);

  // Aposta de valor um pouco mais fina (0.55) — quem tem o melhor da parada
  // aposta, tira os outros do pote e reduz showdowns.
  if (equity >= 0.55) {
    // Com valor, aposta na maioria das vezes; o resto é check de armadilha.
    const betP = clamp(0.7 + (equity - 0.55) * 0.8, 0.55, 0.95);
    const mix = cleanMix([
      { action: "bet", freq: betP },
      { action: "check", freq: 1 - betP },
    ]);
    return decision("bet", size, equity, 0, texture, villainPct, mix,
      `Mão de valor (equity ${pct(equity)} vs range): aposta ${Math.round(size * 100)}% do pote.`);
  }

  const minEquityToBluff = streetIdx === 2 ? 0.12 : 0.22;
  const bluffable = equity >= minEquityToBluff;
  const betP = bluffable ? cbetProb : 0;
  const mix = cleanMix([
    { action: "bet", freq: betP },
    { action: "check", freq: 1 - betP },
  ]);
  if (bluffable && rng() < cbetProb) {
    const verb = initiative && streetIdx > 0 ? "barrel" : "c-bet";
    return decision("bet", size, equity, 0, texture, villainPct, mix,
      `Blefe/semi-blefe (${verb} ${Math.round(size * 100)}%) em board ${texture.wetness < 0.4 ? "seco" : "molhado"} (perfil ${ctx.profile.archetype}).`);
  }

  return decision("check", undefined, equity, 0, texture, villainPct, mix,
    `Equity ${pct(equity)} insuficiente para valor e sem blefe rentável aqui: ${initiative ? "desiste do barrel (check)" : "check"}.`);
}

function decision(
  action: PostflopAct,
  sizeToPot: number | undefined,
  equity: number,
  requiredEquity: number,
  texture: BoardTexture,
  villainRangePct: number,
  mix: ActionFreq[],
  reason: string,
): PostflopDecision {
  return { action, sizeToPot, equity, requiredEquity, texture, reason, villainRangePct, mix };
}

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}
// =========================================================================
// Helpers Omaha para equity pós-flop.
// =========================================================================

import { NUM_CARDS } from "../engine/cards";

/**
 * Constrói o range de combos Omaha (4 cartas) do vilão FILTRADO POR FORÇA: um
 * vilão que continua com `pct` das mãos segura as `pct` MAIS FORTES (por
 * `omahaPreflopScore`), não um punhado aleatório. Exclui os blockers (cartas do
 * herói e do board), então os combos são todos possíveis. É o que torna a
 * equity vs range realista — a antiga versão usava combos totalmente aleatórios.
 */
export function buildOmahaRange(
  pct: number,
  rng: () => number,
  heroCards: Card[] = [],
  board: Card[] = [],
): Card[][] {
  const used = new Set<Card>([...heroCards, ...board]);
  const available: Card[] = [];
  for (let c = 0; c < NUM_CARDS; c++) if (!used.has(c)) available.push(c);

  // Amostra um conjunto de combos possíveis, pontua cada um e guarda os mais
  // fortes conforme a largura do range.
  const poolTarget = 1200;
  const pool: { cards: Card[]; score: number }[] = [];
  const seen = new Set<string>();
  const A = available.length;
  for (let i = 0; i < poolTarget * 4 && pool.length < poolTarget; i++) {
    // Fisher-Yates parcial sobre `available`.
    const local = available.slice();
    const cards: Card[] = [];
    for (let k = 0; k < 4; k++) {
      const j = k + Math.floor(rng() * (A - k));
      const tmp = local[k];
      local[k] = local[j];
      local[j] = tmp;
      cards.push(local[k]);
    }
    const key = [...cards].sort((a, b) => a - b).join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    pool.push({ cards, score: omahaPreflopScore(cards) });
  }

  pool.sort((a, b) => b.score - a.score);
  const keep = Math.max(1, Math.round(pool.length * Math.min(1, Math.max(0.02, pct))));
  return pool.slice(0, keep).map((x) => x.cards);
}

/** Sorteia uma mão aleatória de Omaha (4 cartas) que não conflite com o herói/board. */
function randomOmahaHand(heroCards: Card[], board: Card[], rng: () => number): Card[] {
  const used = new Set<Card>();
  for (const c of heroCards) used.add(c);
  for (const c of board) used.add(c);

  const available: Card[] = [];
  for (let c = 0; c < NUM_CARDS; c++) if (!used.has(c)) available.push(c);

  const hand: Card[] = [];
  for (let k = 0; k < 4 && k < available.length; k++) {
    const j = k + Math.floor(rng() * (available.length - k));
    const tmp = available[k];
    available[k] = available[j];
    available[j] = tmp;
    hand.push(available[k]);
  }

  return hand;
}

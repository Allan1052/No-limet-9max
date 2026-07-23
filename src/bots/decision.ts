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
import { equityHandVsRange } from "../engine/equity";
import type { BotProfile } from "./profiles";
import { buildTopRange } from "../ranges/build";
import { rangeCombos } from "../ranges/types";
import { requiredEquityToCall, type IcmSpot } from "../ranges/icm";
import { classifyBoard, type BoardTexture } from "./boardTexture";

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

/** Tamanho de aposta por textura: seco aposta pequeno, molhado aposta grande. */
function sizeForTexture(texture: BoardTexture): number {
  return Math.round((0.33 + 0.4 * texture.wetness) * 100) / 100; // 0.33..0.73 do pote
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
  const streetIdx = ctx.board.length >= 5 ? 2 : ctx.board.length === 4 ? 1 : 0; // 0=flop 1=turn 2=river

  // Equity do herói contra o range do vilão, no board atual.
  const villainPct = ctx.villainRangePct ?? 0.45;
  const villainRange = rangeCombos(buildTopRange(villainPct));
  const eqHU = equityHandVsRange(ctx.hand, villainRange, ctx.board, iters, rng).equity;
  // Aproximação multiway: precisa bater todos → potência pelo nº de oponentes.
  const equity = Math.pow(eqHU, numOpp);

  // Em posição realiza-se mais equity (controla o tamanho do pote, vê mais showdowns).
  const realization = ctx.inPosition ? 1.05 : 0.9;
  const effEquity = Math.min(1, equity * realization);

  const size = sizeForTexture(texture);

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

    // Disciplina para pagar. Uma aposta representa força e há reverse implied
    // odds, então paga-se com MAIS equity que as pot odds cruas — e cada perfil
    // no seu estilo: o disciplinado (nit/ABC) larga fácil, o calling station
    // gruda. Ruas mais adiantadas (turn/river) exigem ainda mais. Não vale para
    // all-in (que já respeita o ICM acima).
    if (!isAllInCall) {
      const streetPenalty = [0.04, 0.12, 0.2][streetIdx];
      const discipline = (0.5 - ctx.profile.stickiness) * 1.3; // nit +, station −
      const multiwayPenalty = Math.min(0.16, 0.08 * (numOpp - 1)); // alguém pode ter mão
      required = Math.min(0.92, Math.max(0.13, required + 0.11 + streetPenalty + discipline + multiwayPenalty));
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
      return decision("call", undefined, equity, required, texture, villainPct, mix,
        `Equity ${pct(equity)} paga o preço de ${pct(required)}: paga.${icmNote}`);
    }

    // Sem preço direto: considerar aumento de blefe/semi-blefe (só com projeto).
    const semibluffProb = ctx.profile.bluffFactor * 0.18 * texture.wetness;
    if (!isAllInCall && effEquity >= required * 0.7 && rng() < semibluffProb) {
      return decision("raise", size, equity, required, texture, villainPct, mix,
        `Semi-blefe: equity ${pct(equity)} com projeto em board molhado (perfil ${ctx.profile.archetype}).`);
    }
    return decision("fold", undefined, equity, required, texture, villainPct, mix,
      `Equity ${pct(equity)} não paga o preço de ${pct(required)}: fold.${icmNote}`);
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

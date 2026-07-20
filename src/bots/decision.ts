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
// Nada de regras soltas: se a equity não paga o preço, não se paga; blefes têm
// frequência controlada e só com alguma equity/projeto. É forte e explicável,
// não um solver — as frequências são heurísticas transparentes.
// ---------------------------------------------------------------------------

import type { Card } from "../engine/cards";
import { equityHandVsRange } from "../engine/equity";
import type { BotProfile } from "./profiles";
import { buildTopRange } from "../ranges/build";
import { rangeCombos } from "../ranges/types";
import { requiredEquityToCall, type IcmSpot } from "../ranges/icm";
import { classifyBoard, type BoardTexture } from "./boardTexture";

export type PostflopAct = "check" | "bet" | "call" | "raise" | "fold";

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
}

/** Tamanho de aposta por textura: seco aposta pequeno, molhado aposta grande. */
function sizeForTexture(texture: BoardTexture): number {
  return Math.round((0.33 + 0.4 * texture.wetness) * 100) / 100; // 0.33..0.73 do pote
}

export function postflopDecision(ctx: PostflopContext): PostflopDecision {
  const rng = ctx.rng ?? Math.random;
  const iters = ctx.equityIterations ?? 1500;
  const numOpp = Math.max(1, ctx.numOpponents);
  const texture = classifyBoard(ctx.board);

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

    // "Grude": perfis pegajosos (calling station) exigem menos equity para pagar;
    // perfis disciplinados exigem um pouco mais. Não vale para all-in (respeita ICM).
    if (!isAllInCall) {
      const leniency = (ctx.profile.stickiness - 0.5) * 0.5;
      required = Math.max(0.02, required * (1 - leniency));
    }

    if (equity >= Math.max(0.78, required + 0.12)) {
      return decision("raise", size, equity, required, texture,
        `Mão muito forte (equity ${pct(equity)} vs range): aumenta por valor.${icmNote}`);
    }

    if (effEquity >= required) {
      // Preço compensa. Mão forte às vezes aumenta (valor/proteção); senão paga.
      const raiseProb = 0.25 + 0.4 * ctx.profile.aggression;
      if (equity >= 0.66 && !isAllInCall && rng() < raiseProb) {
        return decision("raise", size, equity, required, texture,
          `Mão forte (equity ${pct(equity)} ≥ ${pct(required)}): aumenta por valor/proteção.${icmNote}`);
      }
      return decision("call", undefined, equity, required, texture,
        `Equity ${pct(equity)} paga o preço de ${pct(required)}: paga.${icmNote}`);
    }

    // Sem preço direto: considerar aumento de blefe/semi-blefe (só com projeto).
    const semibluffProb = ctx.profile.bluffFactor * 0.18 * texture.wetness;
    if (!isAllInCall && effEquity >= required * 0.7 && rng() < semibluffProb) {
      return decision("raise", size, equity, required, texture,
        `Semi-blefe: equity ${pct(equity)} com projeto em board molhado (perfil ${ctx.profile.archetype}).`);
    }
    return decision("fold", undefined, equity, required, texture,
      `Equity ${pct(equity)} não paga o preço de ${pct(required)}: fold.${icmNote}`);
  }

  // ---------- Caso B: ação passada até o herói (pode apostar ou dar check) ----------
  if (equity >= 0.6) {
    return decision("bet", size, equity, 0, texture,
      `Mão de valor (equity ${pct(equity)} vs range): aposta ${Math.round(size * 100)}% do pote.`);
  }

  // Blefe/barrel coerente, com as FREQUÊNCIAS do perfil por rua. No flop usa a
  // frequência de c-bet; no turn/river usa as de barrel do perfil (que já caem
  // rua a rua). Em multiway, reduz a continuação conforme o perfil.
  const streetIdx = ctx.board.length >= 5 ? 2 : ctx.board.length === 4 ? 1 : 0;
  const dryness = 1 - texture.wetness;
  const initiative = ctx.hasInitiative ?? ctx.wasPreflopAggressor;

  let base: number;
  if (streetIdx === 0) {
    base = (0.34 + 0.32 * dryness) * ctx.profile.cbetFactor; // c-bet no flop
    if (initiative) base += 0.14;
  } else {
    base = streetIdx === 1 ? ctx.profile.barrelTurn : ctx.profile.barrelRiver;
    if (initiative) base += 0.05;
    else base *= 0.5; // liderar sem iniciativa é bem mais raro
  }
  if (!ctx.inPosition) base -= 0.05;
  // Peso pela equity: quanto mais equity (projetos), mais segue apostando.
  const equityWeight = initiative ? 0.6 + equity : 1;
  let cbetProb = base * equityWeight;
  if (ctx.numOpponents > 1) cbetProb *= 1 - ctx.profile.multiwayReduction; // some em multiway
  cbetProb = Math.max(0, Math.min(0.92, cbetProb));

  // No river não há projeto: só blefa "ar" com pouca frequência e sem iniciativa mínima.
  const minEquityToBluff = streetIdx === 2 ? 0.12 : 0.22;
  if (equity >= minEquityToBluff && rng() < cbetProb) {
    const verb = initiative && streetIdx > 0 ? "barrel" : "c-bet";
    return decision("bet", size, equity, 0, texture,
      `Blefe/semi-blefe (${verb} ${Math.round(size * 100)}%) em board ${texture.wetness < 0.4 ? "seco" : "molhado"} (perfil ${ctx.profile.archetype}).`);
  }

  return decision("check", undefined, equity, 0, texture,
    `Equity ${pct(equity)} insuficiente para valor e sem blefe rentável aqui: ${initiative ? "desiste do barrel (check)" : "check"}.`);
}

function decision(
  action: PostflopAct,
  sizeToPot: number | undefined,
  equity: number,
  requiredEquity: number,
  texture: BoardTexture,
  reason: string,
): PostflopDecision {
  return { action, sizeToPot, equity, requiredEquity, texture, reason };
}

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

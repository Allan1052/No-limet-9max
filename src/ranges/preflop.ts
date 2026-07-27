// ---------------------------------------------------------------------------
// Decisão pré-flop.
//
// Junta tudo: dada a posição do herói, a mão, a profundidade de stack, o perfil
// do bot e (opcionalmente) o contexto de ICM, decide entre foldar, abrir/raise,
// pagar ou 3-betar — com um tamanho de aposta e uma justificativa.
//
// Dois grandes casos:
//   1) Pote não aberto  → usa a range de abertura (RFI).
//   2) Enfrentando um raise → usa uma resposta principiada (call / 3-bet / fold)
//      guiada por posição, largura da abertura do vilão, perfil e ICM.
//
// Tudo deriva de ranges construídas pelo ranking de força — nada de regras
// soltas. Esta é a v1 do pré-flop; o pós-flop entra no próximo bloco.
// ---------------------------------------------------------------------------

import type { Card } from "../engine/cards";
import type { BotProfile } from "../bots/profiles";
import { buildTopRange, rangeSubtract } from "./build";
import { rfiRange, RFI_BASE_PERCENT } from "./charts/rfi";
import { stackDepthAdjust } from "./stackDepth";
import { icmTightenFactor, type IcmSpot } from "./icm";
import {
  comboToHandType,
  isSuited,
  POSITIONS,
  rangePercent,
  type Position,
  type Range,
} from "./types";

export type PreflopAction = "fold" | "raise" | "call" | "3bet" | "jam";

export interface PreflopContext {
  heroPosition: Position;
  hand: Card[]; // 2 cartas
  effectiveBB: number; // stack efetivo em big blinds
  profile: BotProfile;
  /** Posição de quem abriu, se o pote já foi aberto com raise. */
  raiserPosition?: Position;
  /** Tamanho da abertura do vilão em BB (default 2.3). */
  openSizeBB?: number;
  /** Contexto de ICM para o confronto herói×vilão (opcional). */
  icmSpot?: IcmSpot;
  /**
   * O herói ABRIU e agora enfrenta um 3-bet. `raiserPosition` passa a ser quem
   * deu o 3-bet e `openSizeBB` o tamanho do 3-bet em bb. A decisão vira
   * 4-bet / pagar / foldar.
   */
  threeBet?: boolean;
}

export interface PreflopFreq {
  action: string;
  freq: number;
}

export interface PreflopDecision {
  action: PreflopAction;
  sizeBB: number; // 0 para fold; para call, o valor a pagar
  reason: string;
  handType: string;
  /** Estratégia mista aproximada (frequências), para o feedback por frequência. */
  mix?: PreflopFreq[];
}

function posIndex(p: Position): number {
  return POSITIONS.indexOf(p);
}

// Ordem de ação PÓS-FLOP (quem age por último fica EM POSIÇÃO). As blinds agem
// primeiro no pós-flop, mesmo tendo índice pré-flop alto — por isso este vetor
// separado (o abridor enfrentando um 3-bet de uma blind fica IP, por exemplo).
const POSTFLOP_ORDER: Position[] = ["SB", "BB", "UTG", "UTG1", "MP", "LJ", "HJ", "CO", "BTN"];
function heroInPositionPostflop(hero: Position, villain: Position): boolean {
  return POSTFLOP_ORDER.indexOf(hero) > POSTFLOP_ORDER.indexOf(villain);
}

// Núcleo de valor do 4-bet: mãos que 4-betam por valor em qualquer profundidade
// razoável de mesa final (QQ+ e AK). Garantidas independente do percentil — é o
// recado central pro recreativo: com AK/QQ+ você NÃO só paga, você 4-beta.
const VALUE_4BET_CORE = new Set(["AA", "KK", "QQ", "AKs", "AKo"]);

/**
 * Mix aproximado numa fronteira de range: mãos bem dentro são "puras" (100%);
 * mãos na BORDA da largura `pct` são MISTAS (parte na ação, parte na alternativa)
 * — é o que permite avaliar o pré-flop por frequência (T9s abre ~60%, não 0/100).
 */
function bandMix(action: string, pct: number, handType: string, alt = "fold"): PreflopFreq[] {
  const inCore = freqIn(buildTopRange(Math.max(0.005, pct * 0.72)), handType) > 0;
  if (inCore) return [{ action, freq: 1 }];
  const inEdge = freqIn(buildTopRange(Math.min(1, pct * 1.12)), handType) > 0;
  if (inEdge) return [{ action, freq: 0.6 }, { action: alt, freq: 0.4 }];
  return [{ action: alt, freq: 1 }];
}

// Parâmetros de defesa (call/3bet) ao enfrentar UMA abertura, antes de perfil e
// ICM. defendPct = fração total que continua; value3betPct = fatia do topo que
// 3-beta por valor; bluffExtraPct = largura extra (fora do defend) de onde saem
// os 3-bets de blefe (só mãos suited).
interface FacingParams {
  defendPct: number;
  value3betPct: number;
  bluffExtraPct: number;
  /** Herói está em posição sobre o vilão (pode pagar mais)? */
  inPosition: boolean;
}

// Defesa do BIG BLIND por posição do abridor (fecha a ação, melhores odds).
const BB_DEFEND: Partial<Record<Position, { defend: number; v3b: number }>> = {
  UTG: { defend: 0.16, v3b: 0.045 },
  UTG1: { defend: 0.17, v3b: 0.05 },
  MP: { defend: 0.19, v3b: 0.05 },
  LJ: { defend: 0.22, v3b: 0.055 },
  HJ: { defend: 0.26, v3b: 0.06 },
  CO: { defend: 0.32, v3b: 0.07 },
  BTN: { defend: 0.42, v3b: 0.08 },
  SB: { defend: 0.5, v3b: 0.09 },
};

function facingRaiseParams(hero: Position, raiser: Position): FacingParams {
  const inPosition = posIndex(hero) > posIndex(raiser) && hero !== "SB" && hero !== "BB";

  if (hero === "BB") {
    const t = BB_DEFEND[raiser] ?? { defend: 0.2, v3b: 0.05 };
    return {
      defendPct: t.defend,
      value3betPct: t.v3b,
      bluffExtraPct: t.v3b * 0.8, // blefes ~ proporcionais ao valor
      inPosition: false, // BB fica OOP pós-flop
    };
  }

  // Fora do BB: spots de "3-bet ou fold", com algum flat só quando em posição.
  // A largura acompanha o quão larga é a abertura do vilão.
  const raiserWide = RFI_BASE_PERCENT[raiser];
  const value3betPct = 0.03 + 0.05 * raiserWide; // vs BTN mais valor, vs UTG menos
  const flat = inPosition ? 0.05 + 0.15 * raiserWide : 0.0; // flat só IP
  const defendPct = value3betPct + flat;
  return {
    defendPct,
    value3betPct,
    bluffExtraPct: value3betPct * (inPosition ? 0.7 : 1.0),
    inPosition,
  };
}

/** Frequência (0..1) de um tipo de mão em um range. */
function freqIn(range: Range, handType: string): number {
  return range[handType] ?? 0;
}

/** Decisão pré-flop completa. */
export function preflopDecision(ctx: PreflopContext): PreflopDecision {
  const handType = comboToHandType(ctx.hand[0], ctx.hand[1]);
  const { profile } = ctx;
  const sd = stackDepthAdjust(ctx.effectiveBB, profile.adaptability);
  const icmFactor = ctx.icmSpot
    ? icmTightenFactor(ctx.icmSpot, profile.icmSensitivity)
    : 1;

  // ----- Caso 3: o herói abriu e enfrenta um 3-bet → 4-bet / pagar / foldar -----
  if (ctx.threeBet && ctx.raiserPosition) {
    return vsThreeBetDecision(ctx, handType, sd, icmFactor);
  }

  // ----- Caso 1: pote não aberto → abertura (RFI) -----
  if (!ctx.raiserPosition) {
    // Tilt por posição do perfil (amortecido para não dobrar a estrutura da base).
    const posMult = Math.sqrt(profile.positional[ctx.heroPosition] ?? 1);
    // Habilidade no push/fold: em stack raso, quem entende do jogo dá all-in
    // MAIS largo para roubar blinds/antes (o edge da mesa final), enquanto o
    // passivo/fraco (skill baixo) fica travado e some sem lutar (blind down).
    // Só vale na zona de push/fold — no jogo profundo a habilidade age noutros
    // lugares (pós-flop). skill 0.5 é neutro.
    // No PUSH/FOLD a largura do all-in converge fortemente para o Nash (perto de
    // 1×) e é POUCO sensível ao rfiWidth — que é calibrado para o jogo profundo.
    // Sem isso, os perfis largos (LAG) jammam muito além do razoável e sangram
    // no final table. Jogar bem em push/fold é ficar PERTO do ótimo, não abrir
    // mais; a diferença entre perfis vem sobretudo da largura da CALL vs shove.
    const widthFactor = sd.pushFold
      ? (1 + (profile.rfiWidth - 1) * 0.25) * posMult
      : profile.rfiWidth * posMult;
    const range = rfiRange(ctx.heroPosition, {
      widthFactor,
      stackFactor: sd.factor,
      icmFactor,
    });
    const openPct = rangePercent(range);
    if (freqIn(range, handType) > 0) {
      if (sd.pushFold) {
        return {
          action: "jam",
          sizeBB: ctx.effectiveBB,
          reason: `Stack raso (${Math.round(ctx.effectiveBB)}bb): abertura vira all-in (push/fold).`,
          handType,
          mix: bandMix("jam", openPct, handType),
        };
      }
      return {
        action: "raise",
        sizeBB: 2.3,
        reason: `${handType} está na range de abertura de ${ctx.heroPosition} (perfil ${profile.archetype}).`,
        handType,
        mix: bandMix("raise", openPct, handType),
      };
    }
    // Limp especulativo: perfis passivos entram de limp com mãos logo abaixo da
    // abertura — é assim que o recreativo/station veem tantos flops.
    if (profile.limpFactor > 0 && !sd.pushFold && ctx.heroPosition !== "BB") {
      const limpRange = rangeSubtract(
        buildTopRange(openPct + profile.limpFactor * 0.4),
        range,
      );
      if (freqIn(limpRange, handType) > 0) {
        return {
          action: "call",
          sizeBB: 1,
          reason: `${handType}: limp especulativo (perfil ${profile.archetype}).`,
          handType,
        };
      }
    }
    return {
      action: "fold",
      sizeBB: 0,
      reason: `${handType} está fora da range de abertura de ${ctx.heroPosition}.`,
      handType,
      mix: bandMix("raise", openPct, handType),
    };
  }

  // ----- Caso 2: enfrentando um raise -----
  const p = facingRaiseParams(ctx.heroPosition, ctx.raiserPosition);

  // STACK ULTRACURTO (push/fold): se pagar já significa ir all-in (ou quase), a
  // decisão é de POT ODDS — não de "aperto por tamanho". Com poucos bb as odds
  // são ótimas e não há fold equity, então a range de call ALARGA conforme o
  // stack encolhe (ex.: ATo com 4bb paga o shove tranquilo). O ICM aperta perto
  // do dinheiro. Isso corrige o fold irreal com stack curtíssimo.
  const callIsAllIn = (ctx.openSizeBB ?? 0) >= ctx.effectiveBB * 0.9;
  if (sd.pushFold && callIsAllIn) {
    const depthWidth = Math.max(0.14, Math.min(0.6, 0.62 - ctx.effectiveBB * 0.032));
    const profAdj = 0.7 + 0.3 * profile.defendFactor; // station paga mais largo
    const callWidth = Math.min(0.9, depthWidth * profAdj * icmFactor);
    const callRange = buildTopRange(callWidth);
    if (freqIn(callRange, handType) > 0) {
      return {
        action: "call",
        sizeBB: ctx.effectiveBB,
        reason: `Stack ultracurto (${Math.round(ctx.effectiveBB)}bb): com o preço do pote, ${handType} paga o all-in.`,
        handType,
      };
    }
    return {
      action: "fold",
      sizeBB: 0,
      reason: `Stack ultracurto: ${handType} não paga nem com odds curtas.`,
      handType,
    };
  }

  // Tamanho da abertura importa MUITO: contra um open pequeno (2.3bb) defende-se
  // largo; contra 3-bet/4-bet/all-in a range de continuar ENCOLHE drasticamente
  // (ninguém — nem calling station — paga um shove com 85s). Aberturas grandes
  // apertam tudo por este fator; abaixo de 0.6 mata os 3-bets de blefe.
  const raiseSize = ctx.openSizeBB ?? 2.3;
  const sizeFactor = raiseSize <= 2.6 ? 1 : Math.max(0.1, Math.pow(2.4 / raiseSize, 0.9));

  // Aplica perfil, ICM e tamanho aos alvos. `coldCallFactor` amplia (muito, nos
  // passivos) a range de flat — é o que infla o VPIP do recreativo/station.
  const baseDefend = p.defendPct * profile.defendFactor * icmFactor * sizeFactor;
  const coldCallPct = Math.min(0.9, p.defendPct * profile.coldCallFactor * icmFactor) * sizeFactor;
  let defendPct = Math.max(baseDefend, coldCallPct);
  let value3betPct = p.value3betPct * profile.threeBetFactor * icmFactor * Math.max(sizeFactor, 0.25);
  const bluffPct = sizeFactor < 0.6 ? 0 : p.bluffExtraPct * profile.bluffFactor * profile.threeBetFactor * icmFactor;
  // Coerência: a range de valor do 3-bet não pode ultrapassar a de defesa.
  value3betPct = Math.min(value3betPct, defendPct);
  defendPct = Math.max(defendPct, value3betPct);

  const defendRange = buildTopRange(defendPct);
  const value3betRange = buildTopRange(value3betPct);
  // Blefes de 3-bet: mãos logo abaixo da defesa, apenas suited (bons bloqueios).
  const wider = buildTopRange(defendPct + bluffPct);
  const bluffZone = rangeSubtract(wider, defendRange);
  // Passivos (coldCallFactor alto) pagam aberturas até fora de posição.
  const callsOutOfPosition = profile.coldCallFactor >= 1.5;

  const openSize = ctx.openSizeBB ?? 2.3;
  const threeBetSize = p.inPosition ? openSize * 3 : openSize * 3.8;

  if (freqIn(value3betRange, handType) > 0) {
    const action: PreflopAction = sd.pushFold ? "jam" : "3bet";
    return {
      action,
      sizeBB: sd.pushFold ? ctx.effectiveBB : threeBetSize,
      reason: `${handType}: 3-bet por valor contra abertura de ${ctx.raiserPosition}.`,
      handType,
      mix: bandMix(action, value3betPct, handType, "call"),
    };
  }

  if (freqIn(defendRange, handType) > 0) {
    // Dentro da defesa mas não é valor de 3-bet → paga (flat).
    if (p.inPosition || ctx.heroPosition === "BB" || callsOutOfPosition) {
      return {
        action: "call",
        sizeBB: openSize,
        reason: `${handType}: paga a abertura de ${ctx.raiserPosition} (perfil ${profile.archetype}).`,
        handType,
        mix: bandMix("call", defendPct, handType),
      };
    }
    // OOP sem valor de 3-bet (perfis disciplinados): fold em vez de pagar dominado.
    return {
      action: "fold",
      sizeBB: 0,
      reason: `${handType}: sem posição e sem valor de 3-bet, foldar é melhor que pagar dominado.`,
      handType,
      mix: bandMix("call", defendPct, handType),
    };
  }

  if (isSuited(handType) && freqIn(bluffZone, handType) > 0 && !sd.pushFold) {
    return {
      action: "3bet",
      sizeBB: threeBetSize,
      reason: `${handType}: 3-bet de blefe (mão suited com bloqueios, perfil ${profile.archetype}).`,
      handType,
    };
  }

  return {
    action: "fold",
    sizeBB: 0,
    reason: `${handType}: fora da range de defesa contra ${ctx.raiserPosition}.`,
    handType,
    mix: bandMix("call", defendPct, handType),
  };
}

/**
 * O herói ABRIU e leva um 3-bet. Decisão de 4-bet (valor/blefe) / pagar / foldar.
 *
 * Ideia central (e a que o app quer ensinar ao recreativo): abriu com uma mão
 * forte e levou 3-bet? QQ+/AK NÃO é só pagar — é 4-betar. O resto continua só
 * quando há posição e profundidade (pagar pra jogar o flop), senão folda.
 *
 * `ctx.raiserPosition` = quem deu o 3-bet; `ctx.openSizeBB` = tamanho do 3-bet.
 */
function vsThreeBetDecision(
  ctx: PreflopContext,
  handType: string,
  sd: ReturnType<typeof stackDepthAdjust>,
  icmFactor: number,
): PreflopDecision {
  const { profile } = ctx;
  const threeBettor = ctx.raiserPosition!;
  const threeBetSizeBB = ctx.openSizeBB ?? 9;
  const ip = heroInPositionPostflop(ctx.heroPosition, threeBettor);
  // Se 4-betar/pagar já compromete quase o stack, a jogada vira all-in ou fold.
  const jam = sd.pushFold || ctx.effectiveBB <= threeBetSizeBB * 2.4;
  // Quão largo o 3-bettor costuma jogar (proxy pela largura de abertura da
  // posição dele): contra um 3-bet de BTN/blind, continua-se mais largo que
  // contra um 3-bet de UTG.
  const villainWide = RFI_BASE_PERCENT[threeBettor] || 0.15;

  // 4-bet por VALOR: núcleo (QQ+/AK) + um pouco a mais contra 3-bettors largos
  // e com perfis agressivos. ICM aperta.
  const valueExtraPct =
    (0.008 + 0.06 * villainWide) * (0.7 + 0.3 * profile.threeBetFactor) * icmFactor;
  const valueExtra = buildTopRange(Math.max(0, valueExtraPct));
  const isValue4bet = VALUE_4BET_CORE.has(handType) || freqIn(valueExtra, handType) > 0;

  // PAGAR (flat): só em posição e com profundidade — mãos de set-mine e
  // broadways suited que jogam bem o flop. Fora de posição é 4-bet ou fold.
  // Stations (coldCallFactor alto) pagam 3-bets mais largo, até OOP.
  const station = profile.coldCallFactor >= 1.5;
  const canFlat = !jam && (ip || station) && ctx.effectiveBB >= 22;
  const flatPct = canFlat
    ? (0.05 + 0.06 * villainWide) * (0.7 + 0.3 * profile.coldCallFactor) * icmFactor
    : 0;

  // 4-bet de BLEFE: pequenos Ax suited (bloqueiam AA/AK), só profundo e IP.
  const bluffPct =
    !jam && ip && ctx.effectiveBB >= 30 ? 0.012 * profile.bluffFactor * profile.threeBetFactor : 0;

  const size4bet = jam ? ctx.effectiveBB : Math.min(ctx.effectiveBB, threeBetSizeBB * 2.3);

  if (isValue4bet) {
    const action: PreflopAction = jam ? "jam" : "3bet";
    return {
      action,
      sizeBB: size4bet,
      reason: jam
        ? `${handType}: forte demais pra desistir — 4-bet all-in (${Math.round(ctx.effectiveBB)}bb) contra o 3-bet de ${threeBettor}.`
        : `${handType}: 4-bet por valor contra o 3-bet de ${threeBettor} — abriu forte, não é só pagar.`,
      handType,
      mix: [{ action: jam ? "jam" : "3bet", freq: 1 }],
    };
  }

  if (flatPct > 0) {
    // Continua (paga) as mãos logo abaixo do valor, tirando o núcleo de 4-bet.
    const continueRange = rangeSubtract(buildTopRange(valueExtraPct + flatPct), valueExtra);
    if (freqIn(continueRange, handType) > 0 && !VALUE_4BET_CORE.has(handType)) {
      return {
        action: "call",
        sizeBB: threeBetSizeBB,
        reason: `${handType}: paga o 3-bet de ${threeBettor} pra jogar o flop em posição (perfil ${profile.archetype}).`,
        handType,
      };
    }
  }

  if (bluffPct > 0 && isSuited(handType)) {
    const bluffZone = rangeSubtract(
      buildTopRange(valueExtraPct + flatPct + bluffPct),
      buildTopRange(valueExtraPct + flatPct),
    );
    if (freqIn(bluffZone, handType) > 0) {
      return {
        action: "3bet",
        sizeBB: size4bet,
        reason: `${handType}: 4-bet de blefe (Ax suited que bloqueia AA/AK), em posição e profundo.`,
        handType,
      };
    }
  }

  return {
    action: "fold",
    sizeBB: 0,
    reason: `${handType}: contra um 3-bet, não é forte o bastante pra 4-betar nem paga bem — foldar.`,
    handType,
  };
}

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
}

export interface PreflopDecision {
  action: PreflopAction;
  sizeBB: number; // 0 para fold; para call, o valor a pagar
  reason: string;
  handType: string;
}

function posIndex(p: Position): number {
  return POSITIONS.indexOf(p);
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

  // ----- Caso 1: pote não aberto → abertura (RFI) -----
  if (!ctx.raiserPosition) {
    // Tilt por posição do perfil (amortecido para não dobrar a estrutura da base).
    const posMult = Math.sqrt(profile.positional[ctx.heroPosition] ?? 1);
    // Habilidade no push/fold: em stack raso, quem entende do jogo dá all-in
    // MAIS largo para roubar blinds/antes (o edge da mesa final), enquanto o
    // passivo/fraco (skill baixo) fica travado e some sem lutar (blind down).
    // Só vale na zona de push/fold — no jogo profundo a habilidade age noutros
    // lugares (pós-flop). skill 0.5 é neutro.
    const shoveSkill = sd.pushFold ? Math.max(0.7, 1 + (profile.skill - 0.5) * 0.8) : 1;
    const range = rfiRange(ctx.heroPosition, {
      widthFactor: profile.rfiWidth * posMult * shoveSkill,
      stackFactor: sd.factor,
      icmFactor,
    });
    if (freqIn(range, handType) > 0) {
      if (sd.pushFold) {
        return {
          action: "jam",
          sizeBB: ctx.effectiveBB,
          reason: `Stack raso (${Math.round(ctx.effectiveBB)}bb): abertura vira all-in (push/fold).`,
          handType,
        };
      }
      return {
        action: "raise",
        sizeBB: 2.3,
        reason: `${handType} está na range de abertura de ${ctx.heroPosition} (perfil ${profile.archetype}).`,
        handType,
      };
    }
    // Limp especulativo: perfis passivos entram de limp com mãos logo abaixo da
    // abertura — é assim que o recreativo/station veem tantos flops.
    if (profile.limpFactor > 0 && !sd.pushFold && ctx.heroPosition !== "BB") {
      const openPct = rangePercent(range);
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
    };
  }

  // ----- Caso 2: enfrentando um raise -----
  const p = facingRaiseParams(ctx.heroPosition, ctx.raiserPosition);

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
      };
    }
    // OOP sem valor de 3-bet (perfis disciplinados): fold em vez de pagar dominado.
    return {
      action: "fold",
      sizeBB: 0,
      reason: `${handType}: sem posição e sem valor de 3-bet, foldar é melhor que pagar dominado.`,
      handType,
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
  };
}

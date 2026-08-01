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
import { OmahaRanges, OmahaPosition } from "../game/omaha";
import { rankOf, suitOf, RANKS } from "../engine/cards";
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
  hand: Card[]; // 2 cartas para Hold'em, 4 para Omaha
  effectiveBB: number; // stack efetivo em big blinds
  profile: BotProfile;
  variant: "holdem" | "omaha";
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
function rankLetter(rank: number): string {
  return RANKS[rank - 2];
}

function getOmahaHandType(hand: Card[]): string {
  const ranks = hand.map(c => rankOf(c)).sort((a, b) => b - a);
  const suits = hand.map(c => suitOf(c));

  // Contar pares
  const rankCounts: Record<number, number> = {};
  for (const r of ranks) {
    rankCounts[r] = (rankCounts[r] || 0) + 1;
  }
  const pairs = Object.entries(rankCounts).filter(([, count]) => count >= 2).map(([rank]) => Number(rank));

  // Contar naipes
  const suitCounts: Record<number, number> = {};
  for (const s of suits) {
    suitCounts[s] = (suitCounts[s] || 0) + 1;
  }
  const numSuits = Object.keys(suitCounts).length;
  let suitedness = "";
  if (numSuits === 2 && Object.values(suitCounts).some(c => c === 2)) suitedness = "ss"; // Single suited
  if (numSuits === 2 && Object.values(suitCounts).every(c => c === 2)) suitedness = "ds"; // Double suited

  let handType = "";

  // Representação de pares
  if (pairs.length === 2) {
    handType = `${rankLetter(pairs[0])}${rankLetter(pairs[0])}${rankLetter(pairs[1])}${rankLetter(pairs[1])}`;
  } else if (pairs.length === 1) {
    const otherRanks = ranks.filter(r => r !== pairs[0]);
    handType = `${rankLetter(pairs[0])}${rankLetter(pairs[0])}${rankLetter(otherRanks[0])}${rankLetter(otherRanks[1])}`;
  } else {
    // Sem pares, focar em conectividade e danglers
    const uniqueRanks = Array.from(new Set(ranks)).sort((a, b) => b - a);
    handType = uniqueRanks.map(rankLetter).join('');

    // Detecção de rundowns e wraps (simplificado)
    let connectors = 0;
    for (let i = 0; i < uniqueRanks.length - 1; i++) {
      if (uniqueRanks[i] - uniqueRanks[i + 1] === 1) {
        connectors++;
      }
    }

    if (connectors >= 2) {
      handType += "R"; // Indica um rundown
    } else if (connectors === 1 && uniqueRanks.length === 4) {
      // Pode ser um wrap com um gap, como 9765
      const gaps = uniqueRanks[0] - uniqueRanks[3] - 3; // Total span - (num ranks - 1)
      if (gaps <= 1) {
        handType += "W"; // Indica um wrap
      }
    }

    // Detecção de danglers (simplificado: uma carta muito desconectada)
    if (uniqueRanks.length === 4) {
      const sortedRanks = [...uniqueRanks].sort((a, b) => a - b);
      // Um dangler é uma carta que não se conecta com as outras 3
      // Simplificado: se a diferença entre a menor e a segunda menor for grande, ou a maior e a segunda maior
      const span = sortedRanks[3] - sortedRanks[0];
      if (span > 5 && connectors < 2) { // Grande span e pouca conectividade
        handType += "D"; // Indica um dangler
      }
    }

    // Adiciona uma representação para AAxx, KKxx, etc. se for o caso
    if (rankCounts[RANKS.indexOf("A") + 2] >= 2) {
      handType = "AAxx" + handType; // Ex: AAxxRds
    } else if (rankCounts[RANKS.indexOf("K") + 2] >= 2) {
      handType = "KKxx" + handType; // Ex: KKxxRss
    }
  }

  // Adiciona suitedness se for o caso
  if (suitedness) {
    handType += suitedness;
  }

  return handType;
}

export function preflopDecision(ctx: PreflopContext): PreflopDecision {
  const handType = ctx.variant === "omaha" ? getOmahaHandType(ctx.hand) : comboToHandType(ctx.hand[0], ctx.hand[1]);
  const sd = stackDepthAdjust(ctx.effectiveBB, ctx.profile.adaptability);
  const icmFactor = ctx.icmSpot
    ? icmTightenFactor(ctx.icmSpot, ctx.profile.icmSensitivity)
    : 1;

  // ----- Caso 3: o herói abriu e enfrenta um 3-bet → 4-bet / pagar / foldar -----
  if (ctx.threeBet && ctx.raiserPosition) {
    return vsThreeBetDecision(ctx, handType, sd, icmFactor);
  }

  // ----- Caso 1: pote não aberto → abertura (RFI) -----
  if (!ctx.raiserPosition) {
    // Tilt por posição do perfil (amortecido para não dobrar a estrutura da base).
    const posMult = Math.sqrt(ctx.profile.positional[ctx.heroPosition] ?? 1);
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
      ? (1 + (ctx.profile.rfiWidth - 1) * 0.25) * posMult
      : ctx.profile.rfiWidth * posMult;
    if (ctx.variant === "omaha") {
      const omahaPos = ctx.heroPosition as OmahaPosition;
      const omahaOpenRange = OmahaRanges[omahaPos]?.open || [];
      if (omahaOpenRange.includes(handType)) {
        return {
          action: "raise",
          sizeBB: 2.3, // Tamanho de abertura padrão para Omaha
          reason: `${handType} está na range de abertura de Omaha de ${ctx.heroPosition} (perfil ${ctx.profile.archetype}).`,
          handType,
        };
      }
      return {
        action: "fold",
        sizeBB: 0,
        reason: `${handType} está fora da range de abertura de Omaha de ${ctx.heroPosition}.`,
        handType,
      };
    } else {
      const range = rfiRange(ctx.heroPosition, {
        widthFactor,
        stackFactor: sd.factor,
        icmFactor,
      });
      const openPct = rangePercent(range);
      
      // Threshold mínimo: a mão precisa ter freq >= 0.1 (10%) para abrir.
      // Isso elimina "borderline" absurdas (ex: QJo em UTG com freq 0.01).
      const RFI_MIN_FREQ = 0.1;
      
      if (freqIn(range, handType) >= RFI_MIN_FREQ) {
        // Dentro do range → abre (raise ou jam)
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
          reason: `${handType} está na range de abertura de ${ctx.heroPosition} (perfil ${ctx.profile.archetype}).`,
          handType,
          mix: bandMix("raise", openPct, handType),
        };
      }

      // Fora do range de abertura → limp especulativo ou fold
      // Threshold mínimo de 15% para limp (evita limp com mãos marginal).
      const LIMP_MIN_FREQ = 0.15;
      if (ctx.profile.limpFactor > 0 && !sd.pushFold && ctx.heroPosition !== "BB") {
        const limpRange = rangeSubtract(
          buildTopRange(openPct + ctx.profile.limpFactor * 0.4),
          range,
        );
        if (freqIn(limpRange, handType) >= LIMP_MIN_FREQ) {
          return {
            action: "call",
            sizeBB: 1,
            reason: `${handType}: limp especulativo (perfil ${ctx.profile.archetype}).`,
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
  }

  // ----- Caso 2: enfrentando um raise -----
  if (!ctx.raiserPosition) {
    // Se não há raiser, não deveria chegar aqui, mas para garantir um retorno.
    return {
      action: "fold",
      sizeBB: 0,
      reason: "Erro: raiserPosition indefinido ao enfrentar um raise.",
      handType: handType,
    };
  }
  const p = facingRaiseParams(ctx.heroPosition, ctx.raiserPosition!);

  if (ctx.variant === "omaha") {
    const omahaPos = ctx.heroPosition as OmahaPosition;
    const omahaCallRange = OmahaRanges[omahaPos]?.call || [];
    const omahaThreeBetRange = OmahaRanges[omahaPos]?.threeBet || [];

    if (omahaThreeBetRange.includes(handType)) {
      return {
        action: "3bet",
        sizeBB: 3 * (ctx.openSizeBB ?? 2.3), // Exemplo de 3-bet size
        reason: `${handType}: 3-bet por valor contra abertura de ${ctx.raiserPosition} em Omaha.`,
        handType,
      };
    }

    if (omahaCallRange.includes(handType)) {
      return {
        action: "call",
        sizeBB: ctx.openSizeBB ?? 2.3,
        reason: `${handType}: paga a abertura de ${ctx.raiserPosition} em Omaha.`,
        handType,
      };
    }

    return {
      action: "fold",
      sizeBB: 0,
      reason: `${handType}: fora da range de defesa contra ${ctx.raiserPosition} em Omaha.`,
      handType,
    };
  } else {
    // Lógica Hold'em: enfrentando um raise
    const callIsAllIn = (ctx.openSizeBB ?? 0) >= ctx.effectiveBB * 0.9;
    if (sd.pushFold && callIsAllIn) {
      const depthWidth = Math.max(0.14, Math.min(0.6, 0.62 - ctx.effectiveBB * 0.032));
      const profAdj = 0.7 + 0.3 * ctx.profile.defendFactor;
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

    const raiseSize = ctx.openSizeBB ?? 2.3;
    const sizeFactor = raiseSize <= 2.6 ? 1 : Math.max(0.1, Math.pow(2.4 / raiseSize, 0.9));

    const baseDefend = p.defendPct * ctx.profile.defendFactor * icmFactor * sizeFactor;
    const coldCallPct = Math.min(0.9, p.defendPct * ctx.profile.coldCallFactor * icmFactor) * sizeFactor;
    let defendPct = Math.max(baseDefend, coldCallPct);
    let value3betPct = p.value3betPct * ctx.profile.threeBetFactor * icmFactor * Math.max(sizeFactor, 0.25);
    const bluffPct = sizeFactor < 0.6 ? 0 : p.bluffExtraPct * ctx.profile.bluffFactor * ctx.profile.threeBetFactor * icmFactor;
    value3betPct = Math.min(value3betPct, defendPct);
    defendPct = Math.max(defendPct, value3betPct);

    const defendRange = buildTopRange(defendPct);
    const value3betRange = buildTopRange(value3betPct);
    const wider = buildTopRange(defendPct + bluffPct);
    const bluffZone = rangeSubtract(wider, defendRange);
    const callsOutOfPosition = ctx.profile.coldCallFactor >= 1.5;

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
      if (p.inPosition || ctx.heroPosition === "BB" || callsOutOfPosition) {
        return {
          action: "call",
          sizeBB: openSize,
          reason: `${handType}: paga a abertura de ${ctx.raiserPosition} (perfil ${ctx.profile.archetype}).`,
          handType,
          mix: bandMix("call", defendPct, handType),
        };
      }
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
        reason: `${handType}: 3-bet de blefe (mão suited com bloqueios, perfil ${ctx.profile.archetype}).`,
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

  return {
    action: "fold",
    sizeBB: 0,
    reason: "Erro: Caminho de decisão não coberto.",
    handType: handType,
  };
}

function vsThreeBetDecision(ctx: PreflopContext, handType: string, sd: any, icmFactor: number): PreflopDecision {
  // STACK ULTRACURTO (push/fold): se pagar já significa ir all-in (ou quase), a
  // decisão é de POT ODDS — não de "aperto por tamanho". Com poucos bb as odds
  // são ótimas e não há fold equity, então a range de call ALARGA conforme o
  // stack encolhe (ex.: ATo com 4bb paga o shove tranquilo). O ICM aperta perto
  // do dinheiro. Isso corrige o fold irreal com stack curtíssimo.
  const callIsAllIn = (ctx.openSizeBB ?? 0) >= ctx.effectiveBB * 0.9;
  if (sd.pushFold && callIsAllIn) {
    const depthWidth = Math.max(0.14, Math.min(0.6, 0.62 - ctx.effectiveBB * 0.032));
    const profAdj = 0.7 + 0.3 * ctx.profile.defendFactor; // station paga mais largo
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
  const p = facingRaiseParams(ctx.heroPosition, ctx.raiserPosition!);
  const baseDefend = p.defendPct * ctx.profile.defendFactor * icmFactor * sizeFactor;
  const coldCallPct = Math.min(0.9, p.defendPct * ctx.profile.coldCallFactor * icmFactor) * sizeFactor;
  let defendPct = Math.max(baseDefend, coldCallPct);
  let value3betPct = p.value3betPct * ctx.profile.threeBetFactor * icmFactor * Math.max(sizeFactor, 0.25);
  const bluffPct = sizeFactor < 0.6 ? 0 : p.bluffExtraPct * ctx.profile.bluffFactor * ctx.profile.threeBetFactor * icmFactor;
  // Coerência: a range de valor do 3-bet não pode ultrapassar a de defesa.
  value3betPct = Math.min(value3betPct, defendPct);
  defendPct = Math.max(defendPct, value3betPct);

  const defendRange = buildTopRange(defendPct);
  const value3betRange = buildTopRange(value3betPct);
  // Blefes de 3-bet: mãos logo abaixo da defesa, apenas suited (bons bloqueios).
  const wider = buildTopRange(defendPct + bluffPct);
  const bluffZone = rangeSubtract(wider, defendRange);


  const openSize = ctx.openSizeBB ?? 2.3;
  const threeBetSize = p.inPosition ? openSize * 3 : openSize * 3.8;

  // Paga (call) ou 3-bet (raise) contra o raise do vilão.



  // 3-bet por VALOR: mãos fortes que querem ir all-in (ou quase).
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

  // Paga (call): mãos que não são fortes o bastante para 3-betar, mas têm
  // equidade suficiente para pagar e jogar o pós-flop.
  if (ctx.profile.coldCallFactor > 0 && !sd.pushFold) {
    const callRange = rangeSubtract(
      buildTopRange(defendPct + ctx.profile.coldCallFactor * icmFactor * 0.4),
      defendRange,
    );
    if (freqIn(callRange, handType) > 0) {
      return {
        action: "call",
        sizeBB: ctx.openSizeBB!,
        reason: `${handType}: paga a abertura de ${ctx.raiserPosition} (perfil ${ctx.profile.archetype}).`,
        handType,
        mix: bandMix("call", rangePercent(callRange), handType),
      };
    }
  }

  // Blefes de 3-bet: mãos logo abaixo da defesa, apenas suited (bons bloqueios).
  if (isSuited(handType) && freqIn(bluffZone, handType) > 0 && !sd.pushFold) {
    return {
      action: "3bet",
      sizeBB: threeBetSize,
      reason: `${handType}: 3-bet de blefe contra o raise de ${ctx.raiserPosition}.`,
      handType,
      mix: bandMix("3bet", rangePercent(bluffZone), handType),
    };
  }

  const omahaPos = ctx.heroPosition as OmahaPosition;
  const omahaFourBetRange = OmahaRanges[omahaPos]?.fourBet || [];
  const omahaSqueezeRange = OmahaRanges[omahaPos]?.squeeze || [];
  const omahaThreeBetRange = OmahaRanges[omahaPos]?.threeBet || [];
  const omahaCallRange = OmahaRanges[omahaPos]?.call || [];

  // Lógica para 4-bet (se o herói abriu e enfrenta um 3-bet)
  if (ctx.threeBet && omahaFourBetRange.includes(handType)) {
    return {
      action: "3bet", // Representando 4-bet como 3-bet para simplificar
      sizeBB: (ctx.openSizeBB ?? 9) * 2.5, // Exemplo de 4-bet size
      reason: `${handType}: 4-bet por valor em Omaha.`,
      handType,
    };
  }

  // Lógica para squeeze (se o herói enfrenta um open e um call)
  // Esta lógica é mais complexa e precisaria de mais contexto (número de callers)
  // Por enquanto, um placeholder simples
  if (ctx.threeBet && omahaSqueezeRange.includes(handType)) {
    return {
      action: "3bet", // Representando squeeze como 3-bet para simplificar
      sizeBB: (ctx.openSizeBB ?? 9) * 3.5, // Exemplo de squeeze size
      reason: `${handType}: squeeze por valor em Omaha.`,
      handType,
    };
  }

  // Lógica para 3-bet (se o herói enfrenta um open e não um 3-bet)
  if (!ctx.threeBet && omahaThreeBetRange.includes(handType)) {
    return {
      action: "3bet",
      sizeBB: (ctx.openSizeBB ?? 2.3) * 3, // Exemplo de 3-bet size
      reason: `${handType}: 3-bet por valor em Omaha.`,
      handType,
    };
  }

  // Lógica para call
  if (omahaCallRange.includes(handType)) {
    return {
      action: "call",
      sizeBB: ctx.openSizeBB ?? 9,
      reason: `${handType}: paga o 3-bet em Omaha.`,
      handType,
    };
  }

  return {
    action: "fold",
    sizeBB: 0,
    reason: `${handType}: fora da range de defesa contra 3-bet em Omaha.`,
    handType,
  };
}


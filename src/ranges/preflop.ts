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
import { omahaPreflopDecision } from "./omahaPreflop";
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
  /**
   * Quantos limpers (jogadores que só pagaram o BB) já entraram no pote não
   * aberto. Cada limper aumenta a abertura padrão em +1bb (isolamento).
   */
  limpers?: number;
  /**
   * Quantos adversários já estão ALL-IN na frente quando o herói decide. Com
   * 2+ all-ins (confronto múltiplo) a range de pagar aperta MUITO — não basta
   * bater um range, tem que bater vários. Ausente/0/1 = comportamento normal.
   */
  allInsAhead?: number;
  /**
   * Nível de aposta enfrentado no pré-flop: 0 sem raise, 1 = abertura, 2 = 3-bet
   * (seu raise seria um 4-bet), 3 = 4-bet (5-bet)... Usado para ROTULAR a ação
   * corretamente (3-bet vs 4-bet vs 5-bet).
   */
  betLevelFaced?: number;
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
  /** Rótulo do raise conforme o nível ("3-bet"/"4-bet"/"5-bet"), quando aplicável. */
  nBet?: string;
}

/** Nome do raise conforme o nível de aposta enfrentado. */
export function nBetLabel(betLevelFaced: number): string {
  const n = Math.max(0, Math.floor(betLevelFaced));
  if (n <= 0) return "abertura";
  if (n === 1) return "3-bet";
  if (n === 2) return "4-bet";
  if (n === 3) return "5-bet";
  return `${n + 2}-bet`;
}

function posIndex(p: Position): number {
  return POSITIONS.indexOf(p);
}

/** Abertura padrão (2.3bb) num pote sem limper. */
const BASE_OPEN_BB = 2.3;

/**
 * Tamanho da abertura: mantém 2.3bb quando ninguém limpou, e sobe +1bb por
 * limper (isolamento). Ex.: 1 limper → 3.3bb, 2 limpers → 4.3bb. É a matemática
 * de mesa ao vivo — cada limper que já pôs uma ficha no pote pede um raise maior
 * para cobrar quem quer ver flop barato.
 */
function openRaiseSize(ctx: PreflopContext): number {
  return BASE_OPEN_BB + Math.max(0, Math.floor(ctx.limpers ?? 0));
}

/**
 * Aperto por CONFRONTO MÚLTIPLO ao pagar all-in: com 2+ adversários já all-in,
 * a mão precisa bater VÁRIOS ranges de uma vez (e pode estar dominada por
 * qualquer um deles), então a largura de call encolhe forte. 0/1 all-in não
 * mexe (é o call normal heads-up). Devolve a nova largura e uma nota de texto.
 */
function multiwayAllInTighten(width: number, allInsAhead: number): { width: number; note: string } {
  const n = Math.max(0, Math.floor(allInsAhead));
  if (n <= 1) return { width, note: "" };
  let w = width * Math.pow(0.5, n - 1); // cada all-in extra ~corta pela metade
  w = Math.min(w, n >= 3 ? 0.1 : 0.16); // teto duro: só o topo paga confronto múltiplo
  return { width: w, note: ` — ${n} all-ins na frente, confronto múltiplo aperta a range` };
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

// Hash determinístico 0..1 a partir das duas cartas do herói. Varia por naipe e
// por mão — é o que permite REALIZAR jogadas mistas (blefes) sem cair sempre no
// mesmo lado. Determinístico: a mesma mão realiza igual (jogo reproduzível).
function handSeed(cards: Card[]): number {
  const a = ((cards[0] ?? 0) + 1) >>> 0;
  const b = ((cards[1] ?? 0) + 1) >>> 0;
  let x = (Math.imul(a, 2654435761) + Math.imul(b, 40503) + 0x9e3779b9) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 2246822519) >>> 0;
  x ^= x >>> 13;
  return (x >>> 0) / 4294967296;
}

// Realiza um blefe MISTO. A linha-base do coach é determinística (usa a ação
// dominante) para ensinar de forma consistente; os bots variam pela mão, então a
// MESMA mão de blefe (A5s/A4s etc.) NÃO é sempre jogada do mesmo jeito agressivo
// — era exatamente o que fazia os naipados de ás parecerem "sempre ultra-agressivos".
function fireBluff(ctx: PreflopContext, freq: number): boolean {
  if (freq <= 0) return false;
  if (freq >= 1) return true;
  if (ctx.profile.id === "baseline") return freq >= 0.5; // coach: determinístico
  return handSeed(ctx.hand) < freq;
}

// Frequência de um blefe de BLOQUEADOR (3-bet/4-bet fino), escalada pelo perfil
// (um LAG blefa mais que um nit) e amortecida por ICM (perto do dinheiro, blefa-se
// menos). Tem TETO: nunca chega a 100% — nem o maníaco 4-beta blefe toda vez.
function blockerBluffFreq(profile: BotProfile, icmFactor: number, base: number): number {
  return Math.max(0, Math.min(0.62, base * profile.bluffFactor * icmFactor));
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
// Ajustado para evitar defender lixo vs early positions (HJ, MP).
const BB_DEFEND: Partial<Record<Position, { defend: number; v3b: number }>> = {
  UTG: { defend: 0.14, v3b: 0.04 },
  UTG1: { defend: 0.15, v3b: 0.045 },
  MP: { defend: 0.16, v3b: 0.05 },
  LJ: { defend: 0.20, v3b: 0.055 },
  HJ: { defend: 0.24, v3b: 0.06 },
  CO: { defend: 0.30, v3b: 0.07 },
  BTN: { defend: 0.38, v3b: 0.08 },
  SB: { defend: 0.44, v3b: 0.09 },
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
  // SB e BB são exceções — SB defende mais porque já tem 0.5bb invested.
  const raiserWide = RFI_BASE_PERCENT[raiser];
  
  if (hero === "SB") {
    // SB defende mais largo: já tem 0.5bb invested, só precisa completar 1bb.
    // Valor 3-bet: AKo+, AQs+, KQs, TT+ sempre 3-betam. Blefe: Axs, K9s+, suited connectors.
    const value3betPct = 0.08 + 0.05 * raiserWide; // vs BTN=45%: ~10.3%
    const flatPct = 0.05 + 0.08 * raiserWide; // flat com mãos suited/medium pairs
    const defendPct = value3betPct + flatPct; // vs BTN: ~4.1%
    return {
      defendPct,
      value3betPct,
      bluffExtraPct: value3betPct * 0.9,
      inPosition: false, // SB fica OOP pós-flop
    };
  }
  
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


export function preflopDecision(ctx: PreflopContext): PreflopDecision {
  // Omaha tem cérebro próprio: modelo de força de mão cobrindo as 9 cadeiras.
  if (ctx.variant === "omaha") return omahaPreflopDecision(ctx);
  const handType = comboToHandType(ctx.hand[0], ctx.hand[1]);
  const sd = stackDepthAdjust(ctx.effectiveBB, ctx.profile.adaptability);
  const icmFactor = ctx.icmSpot
    ? icmTightenFactor(ctx.icmSpot, ctx.profile.icmSensitivity)
    : 1;

  // ----- Caso 3: re-agressão (open + 3-bet já ocorreram) → 4-bet / pagar / foldar -----
  if (ctx.threeBet && ctx.raiserPosition) {
    const d = vsThreeBetDecision(ctx, handType, sd, icmFactor);
    // Rotula o raise pelo nível: com 2 raises na frente é 4-bet, com 3 é 5-bet.
    const isAggro = d.action === "3bet" || d.action === "jam" || d.action === "raise";
    return isAggro ? { ...d, nBet: nBetLabel(ctx.betLevelFaced ?? 2) } : d;
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
    {
      // No push/fold, alarga o range conforme o stack encurta:
      // 15bb → +0%, 8bb → +9%, 4bb → +15% (aproxima do Nash).
      // Além disso, o ranking de força ganha bônus para pares e suited
      // connectors (que valem mais no shove pela fold equity).
      const pushFoldWidth = sd.pushFold
        ? Math.min(1.15, 1 + Math.max(0, 15 - ctx.effectiveBB) * 0.015)
        : 1;
      const shoveBonus = sd.pushFold && ctx.effectiveBB <= 10 ? 0.04 : 0;
      const range = rfiRange(ctx.heroPosition, {
        widthFactor,
        stackFactor: sd.factor * pushFoldWidth,
        icmFactor,
        shoveBonus,
      });
      const openPct = rangePercent(range);
      
      // Threshold mínimo: no push/fold aceita freq 0.05 (mãos marginais shoveiam).
      // No jogo profundo mantém 0.15 para evitar borderline absurdas.
      // Isso elimina "borderline" absurdas (ex: KQo em UTG com freq 0.01, QJo com freq 0.02).
      // Mas não elimina mãos marginais válidas como 65s no BTN (freq ~0.30).
      const RFI_MIN_FREQ = sd.pushFold ? 0.05 : 0.15;
      
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
        const limpers = Math.max(0, Math.floor(ctx.limpers ?? 0));
        return {
          action: "raise",
          sizeBB: openRaiseSize(ctx),
          reason:
            limpers > 0
              ? `${handType}: abre isolando ${limpers} limper${limpers > 1 ? "s" : ""} — raise maior (${openRaiseSize(ctx).toFixed(1)}bb) para cobrar quem quer flop barato.`
              : `${handType} está na range de abertura de ${ctx.heroPosition} (perfil ${ctx.profile.archetype}).`,
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

  {
    // Lógica Hold'em: enfrentando um raise.
    // PAGAR JÁ É IR ALL-IN? Quando a aposta do vilão cobre ~todo o meu stack, a
    // decisão é pot-odds pura (pagar/foldar) — NUNCA re-raise nem blefe. Isto vale
    // em QUALQUER profundidade, não só no push/fold: era o bug de o bot "não
    // enxergar o all-in" com 30-40bb e tratar o shove como uma abertura normal
    // (re-agredindo/pagando solto). Agora todo shove entra por aqui.
    const ultraShort = ctx.effectiveBB <= 5;
    const callIsAllIn = (ctx.openSizeBB ?? 0) >= ctx.effectiveBB * 0.9;
    if ((sd.pushFold || ultraShort) && callIsAllIn) {
      const depthWidth = Math.max(0.20, Math.min(0.6, 0.62 - ctx.effectiveBB * 0.028));
      const profAdj = 0.7 + 0.3 * ctx.profile.defendFactor;
      const rawWidth = Math.min(0.9, depthWidth * profAdj * icmFactor);
      const mw = multiwayAllInTighten(rawWidth, ctx.allInsAhead ?? 0);
      const callRange = buildTopRange(mw.width);
      const depthTag = sd.pushFold ? "Stack ultracurto" : "Enfrentando all-in";
      if (freqIn(callRange, handType) > 0) {
        return {
          action: "call",
          sizeBB: ctx.effectiveBB,
          reason: `${depthTag} (${Math.round(ctx.effectiveBB)}bb): com o preço do pote, ${handType} paga o all-in${mw.note}.`,
          handType,
        };
      }
      return {
        action: "fold",
        sizeBB: 0,
        reason: mw.note
          ? `${handType} folda${mw.note}: contra vários shoves, só as mãos de topo pagam.`
          : `${depthTag} (${Math.round(ctx.effectiveBB)}bb): ${handType} não bate a range que dá all-in — foldar.`,
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
    // 3-bet size: OOP (SB, CO, HJ, LJ) devolve maior (~3.8x). IP (BTN) devolve menor (~3x).
    // SB precisa do maior porque está sem posição pós-flop.
    // BTN 3-bet pode ser menor porque tem posição e pode jogar melhor pós-flop.
    const threeBetSize = ctx.heroPosition === "BTN"
      ? openSize * 3.0
      : ctx.heroPosition === "CO"
        ? openSize * 3.5
        : openSize * 3.8;

    // Overrides: mãos premium SEMPRE 3-betam, independente da posição OOP.
    // Isso é poker fundamental — AKo+ nunca é fold OOP contra raiser.
    const PREMIUM_3BET = ["AA", "KK", "QQ", "AKo", "AKs", "AQs"];
    const EXTENDED_3BET = [...PREMIUM_3BET, "AQo", "KQs", "JJ", "TT"];

    // SB premium: AA, KK, QQ, AKo, AKs, AQs, AQo, KQs, JJ, TT
    if (ctx.heroPosition === "SB" && EXTENDED_3BET.includes(handType)) {
      return {
        action: sd.pushFold ? "jam" : "3bet",
        sizeBB: sd.pushFold ? ctx.effectiveBB : threeBetSize,
        reason: `${handType}: 3-bet obrigatório do SB — mão premium, nunca foldar aqui.`,
        handType,
        mix: bandMix(sd.pushFold ? "jam" : "3bet", Math.max(value3betPct, 0.10), handType, "call"),
      };
    }

    // BB VALOR: mãos que 3-betam SEMPRE por valor (premium de verdade).
    const BB_VALUE_3BET = [...EXTENDED_3BET, "99", "88"];
    if (ctx.heroPosition === "BB" && BB_VALUE_3BET.includes(handType)) {
      return {
        action: sd.pushFold ? "jam" : "3bet",
        sizeBB: sd.pushFold ? ctx.effectiveBB : threeBetSize,
        reason: `${handType}: 3-bet obrigatório do BB — mão premium, nunca foldar aqui.`,
        handType,
        mix: bandMix(sd.pushFold ? "jam" : "3bet", Math.max(value3betPct, 0.08), handType, "call"),
      };
    }

    // BB BLEFE: bloqueadores de ás (A5s/A4s/A3s) e K9s NÃO são premium — são
    // 3-bet MISTO (parte 3-bet, parte flat/fold). Antes 3-betavam 100% ("nunca
    // foldar"), o que deixava os naipados de ás sempre ultra-agressivos. Agora
    // só uma fração das vezes; quando não blefa, segue para a defesa normal.
    const BB_BLUFF_3BET = ["A5s", "A4s", "A3s", "K9s"];
    if (ctx.heroPosition === "BB" && BB_BLUFF_3BET.includes(handType) && !sd.pushFold) {
      const bf = blockerBluffFreq(ctx.profile, icmFactor, 0.5);
      if (fireBluff(ctx, bf)) {
        return {
          action: "3bet",
          sizeBB: threeBetSize,
          reason: `${handType}: 3-bet de blefe do BB (bloqueador de ás) — jogada mista (~${Math.round(bf * 100)}% 3-bet, resto flat/fold).`,
          handType,
          mix: [{ action: "3bet", freq: bf }, { action: "call", freq: 1 - bf }],
        };
      }
      // Não blefou nesta mão → segue para a defesa normal (flat/fold) abaixo.
    }

    // CO 3-bet vs BTN: AA, KK, QQ, AKo, AKs, AQs, JJ, TT
    const CO_3BET = ["AA", "KK", "QQ", "AKo", "AKs", "AQs", "JJ", "TT"];
    if (ctx.heroPosition === "CO" && ctx.raiserPosition === "BTN" && CO_3BET.includes(handType)) {
      return {
        action: sd.pushFold ? "jam" : "3bet",
        sizeBB: sd.pushFold ? ctx.effectiveBB : threeBetSize,
        reason: `${handType}: 3-bet obrigatório do CO vs BTN — mão premium.`,
        handType,
        mix: bandMix(sd.pushFold ? "jam" : "3bet", Math.max(value3betPct, 0.10), handType, "call"),
      };
    }

    // Premium universal: AA-JJ e ases-fortes NUNCA flatam uma abertura — 3-bet
    // (ou all-in em stack raso), em QUALQUER posição. Evita, por ex., AKs pagar
    // passivo por causa de ICM ou de um estreitamento da range de valor.
    const ALWAYS_3BET = ["AA", "KK", "QQ", "JJ", "AKs", "AKo", "AQs"];
    if (ALWAYS_3BET.includes(handType)) {
      const action: PreflopAction = sd.pushFold ? "jam" : "3bet";
      return {
        action,
        sizeBB: sd.pushFold ? ctx.effectiveBB : threeBetSize,
        reason: sd.pushFold
          ? `${handType}: mão premium — all-in vs abertura de ${ctx.raiserPosition}.`
          : `${handType}: mão premium — 3-bet por valor vs abertura de ${ctx.raiserPosition} (nunca flat).`,
        handType,
        mix: bandMix(action, Math.max(value3betPct, 0.5), handType, "call"),
      };
    }

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
      const bf = blockerBluffFreq(ctx.profile, icmFactor, 0.5);
      const mix = [{ action: "3bet", freq: bf }, { action: "fold", freq: 1 - bf }];
      if (fireBluff(ctx, bf)) {
        return {
          action: "3bet",
          sizeBB: threeBetSize,
          reason: `${handType}: 3-bet de blefe (suited com bloqueios) — jogada mista (~${Math.round(bf * 100)}%, perfil ${ctx.profile.archetype}).`,
          handType,
          mix,
        };
      }
      return {
        action: "fold",
        sizeBB: 0,
        reason: `${handType}: mão de blefe — na maioria FOLDA (3-bet só ~${Math.round(bf * 100)}%).`,
        handType,
        mix,
      };
    }

    // Pares pequenos: com preço bom (fechando o BB ou em posição) e stack para o
    // set (fora do push/fold), pagam a abertura para buscar o set — não foldam.
    // A range linear "top X%" subestima pares pequenos, que valem pelo set.
    const isPocketPair = handType.length === 2 && handType[0] === handType[1];
    if (
      isPocketPair &&
      !sd.pushFold &&
      (p.inPosition || ctx.heroPosition === "BB" || callsOutOfPosition)
    ) {
      return {
        action: "call",
        sizeBB: openSize,
        reason: `${handType}: par pequeno paga a abertura de ${ctx.raiserPosition} para buscar o set (preço bom).`,
        handType,
        mix: bandMix("call", Math.max(defendPct, 0.15), handType),
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

// Ordem PÓS-FLOP dos assentos (blinds agem primeiro; BTN por último). Serve pra
// saber se o herói joga o pós-flop EM POSIÇÃO contra quem deu o 3-bet.
const POSTFLOP_ORDER: Position[] = ["SB", "BB", "UTG", "UTG1", "MP", "LJ", "HJ", "CO", "BTN"];
function heroIpVsThreeBettor(hero: Position, threeBettor: Position): boolean {
  return POSTFLOP_ORDER.indexOf(hero) > POSTFLOP_ORDER.indexOf(threeBettor);
}

// Núcleos vs 3-bet (Hold'em). É apertado por natureza — a maioria FOLDA.
const VS3BET_VALUE = new Set(["AA", "KK", "QQ", "AKs", "AKo"]); // 4-bet sempre
const VS3BET_BLUFF = new Set(["A5s", "A4s"]); // bloqueadores de ás — 4-bet de blefe fino
const VS3BET_IP_CALL = new Set(["JJ", "TT", "99", "AQs", "AJs", "KQs", "ATs"]); // flat só EM POSIÇÃO

/** Decisão Hold'em quando o herói abriu e levou 3-bet: 4-bet / pagar (IP) / foldar. */
function holdemVsThreeBet(
  ctx: PreflopContext,
  handType: string,
  sd: { pushFold?: boolean },
  icmFactor: number,
): PreflopDecision {
  const eff = ctx.effectiveBB;
  const short = !!sd.pushFold || eff <= 25;
  const inPos = ctx.raiserPosition ? heroIpVsThreeBettor(ctx.heroPosition, ctx.raiserPosition) : false;
  const openSize = ctx.openSizeBB ?? 7;
  const fourBetSize = Math.min(eff, openSize * 2.2);

  // Valor: 4-bet sempre (all-in se stack curto). Nunca folda.
  if (VS3BET_VALUE.has(handType)) {
    return short
      ? { action: "jam", sizeBB: eff, reason: `${handType}: 4-bet all-in por valor vs 3-bet.`, handType }
      : { action: "3bet", sizeBB: fourBetSize, reason: `${handType}: 4-bet por valor vs 3-bet.`, handType };
  }

  // Stack curto: joga jam/fold. Premium+ jamam; o resto folda (não se paga 3-bet raso).
  if (short) {
    const jamPct = Math.min(0.14, Math.max(0.06, (25 - eff) * 0.006 + 0.06));
    if (freqIn(buildTopRange(jamPct), handType) > 0) {
      return { action: "jam", sizeBB: eff, reason: `${handType}: com stack curto, 4-bet all-in vs 3-bet.`, handType };
    }
    return { action: "fold", sizeBB: 0, reason: `${handType}: folda vs 3-bet com stack curto — fora do jam.`, handType };
  }

  // Blefe de 4-bet (só com stack jogável): bloqueadores de ás — MISTO, nunca 100%.
  // Era aqui que A5s/A4s davam 4-bet de blefe SEMPRE (o print do "O Doidão"); agora
  // é frequência baixa, escalada pelo perfil e amortecida por ICM. Na maioria FOLDA.
  if (VS3BET_BLUFF.has(handType)) {
    const bf = blockerBluffFreq(ctx.profile, icmFactor, 0.32);
    const mix = [{ action: "3bet", freq: bf }, { action: "fold", freq: 1 - bf }];
    if (fireBluff(ctx, bf)) {
      return {
        action: "3bet",
        sizeBB: fourBetSize,
        reason: `${handType}: 4-bet de blefe (bloqueador de ás) vs 3-bet — jogada mista (~${Math.round(bf * 100)}%).`,
        handType,
        mix,
      };
    }
    return {
      action: "fold",
      sizeBB: 0,
      reason: `${handType}: blefe fino — na maioria FOLDA vs 3-bet (4-bet só ~${Math.round(bf * 100)}%, bloqueador de ás).`,
      handType,
      mix,
    };
  }

  // Pagar: só EM POSIÇÃO e com um leque estreito de broadways/pares.
  if (inPos && VS3BET_IP_CALL.has(handType)) {
    return { action: "call", sizeBB: openSize, reason: `${handType}: paga o 3-bet em posição.`, handType };
  }

  // Todo o resto folda — contra a re-agressão, a maioria das mãos não continua.
  return { action: "fold", sizeBB: 0, reason: `${handType}: folda vs 3-bet — contra a re-agressão, aperte.`, handType };
}

function vsThreeBetDecision(ctx: PreflopContext, handType: string, sd: any, icmFactor: number): PreflopDecision {
  // STACK ULTRACURTO (push/fold): se pagar já significa ir all-in (ou quase), a
  // decisão é de POT ODDS — não de "aperto por tamanho". Com poucos bb as odds
  // são ótimas e não há fold equity, então a range de call ALARGA conforme o
  // stack encolhe (ex.: ATo com 4bb paga o shove tranquilo). O ICM aperta perto
  // do dinheiro. Isso corrige o fold irreal com stack curtíssimo.
  // Pagar o 3-bet já significa ir all-in? Então é pot-odds puro (pagar/foldar),
  // nunca 4-bet. Vale em qualquer profundidade — não só no push/fold.
  const callIsAllIn = (ctx.openSizeBB ?? 0) >= ctx.effectiveBB * 0.9;
  if (callIsAllIn) {
    const depthWidth = Math.max(0.14, Math.min(0.6, 0.62 - ctx.effectiveBB * 0.032));
    const profAdj = 0.7 + 0.3 * ctx.profile.defendFactor; // station paga mais largo
    const rawWidth = Math.min(0.9, depthWidth * profAdj * icmFactor);
    const mw = multiwayAllInTighten(rawWidth, ctx.allInsAhead ?? 0);
    const callRange = buildTopRange(mw.width);
    const depthTag = sd.pushFold ? "Stack ultracurto" : "Enfrentando all-in";
    if (freqIn(callRange, handType) > 0) {
      return {
        action: "call",
        sizeBB: ctx.effectiveBB,
        reason: `${depthTag} (${Math.round(ctx.effectiveBB)}bb): com o preço do pote, ${handType} paga o all-in${mw.note}.`,
        handType,
      };
    }
    return {
      action: "fold",
      sizeBB: 0,
      reason: mw.note
        ? `${handType} folda${mw.note}: contra vários shoves, só as mãos de topo pagam.`
        : `${depthTag} (${Math.round(ctx.effectiveBB)}bb): ${handType} não bate a range que dá all-in — foldar.`,
      handType,
    };
  }

  // Hold'em vs 3-bet: range apertado de verdade (4-bet valor + poucos calls só
  // em posição + o resto folda). Omaha nunca chega aqui — tem cérebro próprio.
  return holdemVsThreeBet(ctx, handType, sd, icmFactor);
}


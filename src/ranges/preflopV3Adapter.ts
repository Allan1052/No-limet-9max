import { comboToHandType } from "./types";
import {
  preflopDecision,
  type PreflopContext,
  type PreflopDecision,
  type PreflopFreq,
} from "./preflop";
import {
  livePreflopV3,
  type LivePreflopV3Result,
  type V3SemanticPreflopAction,
} from "../v3/livePreflopBridge";
import type { EvidenceLevel } from "../v3/evidence";
import type { TournamentContextV3 } from "../v3/tournamentContext";

export interface V3AwarePreflopContext extends PreflopContext {
  v3TournamentContext?: TournamentContextV3;
  v3PriorActions?: string[];
  v3Node?: string;
}

export interface V3AwarePreflopDecision extends PreflopDecision {
  semanticAction?: "limp";
  v3BenchmarkId?: string;
  v3EvidenceLevel?: EvidenceLevel;
}

function pureSemanticAction(
  mix: Partial<Record<V3SemanticPreflopAction, number>>,
): V3SemanticPreflopAction | null {
  const entries = Object.entries(mix) as Array<[V3SemanticPreflopAction, number | undefined]>;
  const valid = entries.filter((entry): entry is [V3SemanticPreflopAction, number] =>
    Number.isFinite(entry[1]) && (entry[1] ?? 0) > 0,
  );
  if (valid.length !== 1) return null;
  return valid[0][1] >= 0.999999 ? valid[0][0] : null;
}

function semanticMixToPreflopMix(
  mix: Partial<Record<V3SemanticPreflopAction, number>>,
): PreflopFreq[] {
  return Object.entries(mix)
    .filter((entry): entry is [string, number] => Number.isFinite(entry[1]))
    .map(([action, freq]) => ({ action, freq }));
}

/**
 * Converte somente uma estratégia PURA de mão certificada em uma decisão legal
 * do motor atual. Estratégias mistas continuam em shadow nesta entrega.
 * Raise só atravessa quando o próprio fixture traz sizing certificado explícito.
 */
export function mapCertifiedV3PreflopDecision(
  handType: string,
  result: LivePreflopV3Result,
  effectiveBB: number,
): V3AwarePreflopDecision | null {
  if (result.source !== "V3_CERTIFIED_HAND" || !result.semanticMix || !result.benchmarkId) {
    return null;
  }

  const semantic = pureSemanticAction(result.semanticMix);
  if (!semantic) return null;

  const common = {
    handType,
    reason: `${handType}: estratégia V3 certificada no solver para este contexto exato (${result.benchmarkId}).`,
    mix: semanticMixToPreflopMix(result.semanticMix),
    v3BenchmarkId: result.benchmarkId,
    v3EvidenceLevel: result.evidence.level,
  } as const;

  if (semantic === "fold") {
    return { ...common, action: "fold", sizeBB: 0 };
  }
  if (semantic === "limp") {
    return { ...common, action: "call", sizeBB: 1, semanticAction: "limp" };
  }
  if (semantic === "raise") {
    const sizeBB = result.actionSizeBB?.raise;
    if (!Number.isFinite(sizeBB) || (sizeBB ?? 0) <= 1) return null;
    return { ...common, action: "raise", sizeBB: sizeBB as number };
  }
  if (semantic === "jam" || semantic === "shove") {
    return { ...common, action: "jam", sizeBB: effectiveBB };
  }

  // Call/3bet/check precisam de preço/árvore/sizing certificados no boundary correspondente.
  return null;
}

/**
 * Boundary de migração: consulta V3 apenas em RFI Hold'em explicitamente
 * contextualizado. Qualquer ausência de evidência mão-a-mão, contexto diferente,
 * stack efetivo inconsistente ou ação não suportada cai integralmente no V2.
 */
export function preflopDecisionV3Aware(ctx: V3AwarePreflopContext): V3AwarePreflopDecision {
  if (
    ctx.variant === "holdem"
    && !ctx.raiserPosition
    && ctx.v3Node
    && ctx.v3TournamentContext
    && Math.abs(ctx.effectiveBB - ctx.v3TournamentContext.effectiveStackBB) <= 1e-9
  ) {
    const handType = comboToHandType(ctx.hand[0], ctx.hand[1]);
    const result = livePreflopV3({
      node: ctx.v3Node,
      context: ctx.v3TournamentContext,
      priorActions: ctx.v3PriorActions ?? [],
      handType,
    });
    const mapped = mapCertifiedV3PreflopDecision(handType, result, ctx.effectiveBB);
    if (mapped) return mapped;
  }

  return preflopDecision(ctx);
}

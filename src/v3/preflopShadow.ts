import { blindWarStrategyV3, type BlindWarStrategyInput } from "./blindWar";
import { livePreflopV3 } from "./livePreflopBridge";
import type { EvidenceLevel } from "./evidence";

export interface PreflopShadowResult {
  benchmarkId?: string;
  evidenceLevel: EvidenceLevel;
  globalActionFreq: Record<string, number>;
  mayDriveLiveHand: boolean;
}

export function preflopShadowV3(
  query: BlindWarStrategyInput,
  handType: string,
): PreflopShadowResult {
  const global = blindWarStrategyV3(query);
  const live = livePreflopV3({
    node: query.node,
    context: query.context,
    priorActions: query.priorActions,
    handType,
  });

  return {
    benchmarkId: global.benchmarkId,
    evidenceLevel: global.evidence.level,
    globalActionFreq: { ...global.actionFreq },
    mayDriveLiveHand: live.source === "V3_CERTIFIED_HAND",
  };
}

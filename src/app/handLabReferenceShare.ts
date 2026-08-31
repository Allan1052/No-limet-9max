import { analyzeHand, type HandAnalysis, type StageKey } from "../train/stage";
import {
  buildReferenceCardModel,
  type ReferenceCardFormat,
  type ReferenceCardSlide,
} from "./shareCardReference";

export interface HandLabReferenceShareSlide {
  slide: ReferenceCardSlide;
  filename: string;
}

export interface HandLabReferenceSharePlan {
  current: HandAnalysis;
  comparison?: HandAnalysis;
  model: ReturnType<typeof buildReferenceCardModel>;
  format: ReferenceCardFormat;
  slides: HandLabReferenceShareSlide[];
}

function comparisonCandidates(stage: StageKey): StageKey[] {
  if (stage === "mesa_final") return ["inicio", "meio", "bolha"];
  if (stage === "bolha") return ["inicio", "meio", "mesa_final"];
  if (stage === "inicio") return ["mesa_final", "bolha", "meio"];
  return ["mesa_final", "bolha", "inicio"];
}

function analyzeComparison(current: HandAnalysis, stage: StageKey): HandAnalysis {
  return analyzeHand({
    ...current.spec,
    stage,
    finalTable: stage === "bolha" || stage === "mesa_final" ? current.spec.finalTable : undefined,
  });
}

export function buildHandLabReferenceSharePlan(
  current: HandAnalysis,
  format: ReferenceCardFormat,
): HandLabReferenceSharePlan {
  let comparison: HandAnalysis | undefined;
  for (const stage of comparisonCandidates(current.spec.stage)) {
    const candidate = analyzeComparison(current, stage);
    if (candidate.recommended !== current.recommended) {
      comparison = candidate;
      break;
    }
  }

  return {
    current,
    comparison,
    model: buildReferenceCardModel(current, comparison),
    format,
    slides: [
      { slide: 1, filename: `call-ou-fold-${format}-1.png` },
      { slide: 2, filename: `call-ou-fold-${format}-2.png` },
    ],
  };
}

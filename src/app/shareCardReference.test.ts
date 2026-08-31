import { describe, expect, it } from "vitest";
import { analyzeHand, parseHand } from "../train/stage";
import {
  SHARE_CARD_FORMATS,
  buildReferenceCardModel,
  referenceMetricsFromAnalysis,
  renderReferenceCardSvg,
} from "./shareCardReference";

function a7s(stage: "inicio" | "mesa_final") {
  const hand = parseHand("As7s");
  if (!hand) throw new Error("A7s inválido");
  return analyzeHand({
    heroPosition: "BB",
    villainPosition: "BTN",
    situation: "vsallin",
    stage,
    stackBB: 15,
    hand,
    anteBB: 1,
  });
}

describe("Card de referência — dados reais do Motor", () => {
  it("A7s conta a história correta: fold na mesa final e call no início", () => {
    const finalTable = a7s("mesa_final");
    const early = a7s("inicio");

    expect(finalTable.recommended).toBe("fold");
    expect(early.recommended).toBe("call");
    expect(finalTable.confidence.level).toBe("aproximacao");
  });

  it("usa as métricas calculadas pelo mesmo motor do analyzeHand sem número digitado no card", () => {
    const analysis = a7s("mesa_final");
    const metrics = referenceMetricsFromAnalysis(analysis);

    expect(metrics?.heroEquity).toBeTypeOf("number");
    expect(metrics?.potOdds).toBeTypeOf("number");
    expect(metrics?.requiredEquity).toBeTypeOf("number");
    expect(metrics?.icmPremium).toBeTypeOf("number");

    const model = buildReferenceCardModel(analysis, a7s("inicio"));
    expect(model.verdict).toBe(analysis.recommended);
    expect(model.equity).toBe(metrics?.heroEquity);
    expect(model.potOdds).toBe(metrics?.potOdds);
    expect(model.requiredEquity).toBe(metrics?.requiredEquity);
    expect(model.icmPremium).toBe(metrics?.icmPremium);
    expect(model.confidence).toBe(analysis.confidence);

    console.log("[SHARE PREVIEW DATA]", JSON.stringify({
      hand: "As7s",
      finalVerdict: analysis.recommended,
      earlyVerdict: a7s("inicio").recommended,
      confidence: analysis.confidence,
      metrics,
      simple: analysis.simple,
    }));
  });

  it("exporta feed e stories nas dimensões aprovadas e sem foreignObject", () => {
    expect(SHARE_CARD_FORMATS.feed).toEqual({ width: 1080, height: 1350, aspectRatio: "4:5" });
    expect(SHARE_CARD_FORMATS.story).toEqual({ width: 1080, height: 1920, aspectRatio: "9:16" });

    const model = buildReferenceCardModel(a7s("mesa_final"), a7s("inicio"));
    for (const format of ["feed", "story"] as const) {
      for (const slide of [1, 2] as const) {
        const svg = renderReferenceCardSvg(model, format, slide);
        expect(svg).toContain(`width="${SHARE_CARD_FORMATS[format].width}"`);
        expect(svg).toContain(`height="${SHARE_CARD_FORMATS[format].height}"`);
        expect(svg).not.toContain("foreignObject");
        expect(svg).toContain("CALL OU FOLD");
        expect(svg).toContain("calloufold.com.br");
      }
    }
  });
});

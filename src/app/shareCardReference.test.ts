import { describe, expect, it } from "vitest";
import { analyzeHand, parseHand } from "../train/stage";
import {
  SHARE_CARD_FORMATS,
  buildReferenceCardModel,
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

  it("analyzeHand expõe as métricas calculadas pelo motor sem o card recalcular", () => {
    const analysis = a7s("mesa_final");

    expect(analysis.metrics?.heroEquity).toBeTypeOf("number");
    expect(analysis.metrics?.potOdds).toBeTypeOf("number");
    expect(analysis.metrics?.requiredEquity).toBeTypeOf("number");
    expect(analysis.metrics?.icmPremium).toBeTypeOf("number");

    const model = buildReferenceCardModel(analysis, a7s("inicio"));
    expect(model.verdict).toBe(analysis.recommended);
    expect(model.equity).toBe(analysis.metrics?.heroEquity);
    expect(model.potOdds).toBe(analysis.metrics?.potOdds);
    expect(model.requiredEquity).toBe(analysis.metrics?.requiredEquity);
    expect(model.confidence).toBe(analysis.confidence);
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

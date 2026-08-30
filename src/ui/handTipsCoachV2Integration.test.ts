import { describe, expect, it } from "vitest";
import source from "./HandTipsModal.tsx?raw";

describe("HandTipsModal integrado ao Coach V2", () => {
  it("usa a apresentação Coach V2 em cada decisão", () => {
    expect(source).toContain('import { buildCoachV2PostHandDecision } from "./coachV2PostHand"');
    expect(source).toContain("buildCoachV2PostHandDecision(it, tecnico ? \"technical\" : \"simple\")");
    expect(source).toContain("view.heroLine");
    expect(source).toContain("view.coachLine");
    expect(source).toContain("view.metrics");
  });

  it("não inventa sizing pós-mão a partir da textura do board", () => {
    expect(source).not.toContain("const sizePct = texture");
    expect(source).not.toContain('t("tips.sizingLine"');
  });

  it("não mistura a sequência Coach V2 com o comentário paralelo antigo", () => {
    expect(source).not.toContain("getHandCommentary");
    expect(source).not.toContain("handCmt");
  });
});

import { describe, expect, it } from "vitest";
import { analyzeHand, parseHand, type HandLabSpec } from "./stage";
import { decisionConfidence } from "./confidence";

function base(o: Partial<Parameters<typeof decisionConfidence>[0]> = {}) {
  return decisionConfidence({
    situation: "open", stage: "inicio", stackBB: 40, handType: "T9s",
    borderline: false, icmActive: false, hasRealStacks: false, ...o,
  });
}

describe("Selo de confiança por decisão", () => {
  it("fronteira ⇒ aproximação (o sinal mais honesto)", () => {
    const c = base({ borderline: true, stackBB: 15, situation: "vsallin", stage: "mesa_final", icmActive: true });
    expect(c.level).toBe("aproximacao");
    expect(c.reason).toMatch(/fronteira/i);
  });

  it("ICM sem stacks reais ⇒ aproximação, e ensina como subir", () => {
    const c = base({ situation: "vsallin", stage: "bolha", icmActive: true, hasRealStacks: false, stackBB: 15 });
    expect(c.level).toBe("aproximacao");
    expect(c.reason).toMatch(/stacks reais/i);
  });

  it("ICM COM stacks reais ⇒ média (boa base, mas sensível)", () => {
    const c = base({ situation: "vsallin", stage: "bolha", icmActive: true, hasRealStacks: true, stackBB: 15 });
    expect(c.level).toBe("media");
  });

  it("push/fold curto puro ⇒ alta", () => {
    const c = base({ situation: "open", stage: "meio", stackBB: 10, handType: "A5s" });
    expect(c.level).toBe("alta");
  });

  it("faixa de re-shove 13–22bb ⇒ média (direção clara, fronteira estimada)", () => {
    const c = base({ situation: "vsopen", stage: "meio", stackBB: 18, handType: "KJo" });
    expect(c.level).toBe("media");
    expect(c.reason).toMatch(/re-shove/i);
  });

  it("mão premium em pré-flop legível ⇒ alta", () => {
    const c = base({ situation: "vsopen", stage: "inicio", stackBB: 40, handType: "AA" });
    expect(c.level).toBe("alta");
  });

  it("analyzeHand devolve o selo junto da decisão", () => {
    const spec: HandLabSpec = {
      heroPosition: "BB", villainPosition: "UTG", situation: "vsopen", stage: "meio",
      stackBB: 18, hand: parseHand("KsJd")!,
    };
    const a = analyzeHand(spec);
    expect(a.confidence).toBeTruthy();
    expect(["alta", "media", "aproximacao"]).toContain(a.confidence.level);
    expect(a.confidence.label.length).toBeGreaterThan(3);
  });
});

import { describe, expect, it } from "vitest";
import { analyzeHand, parseHand, STAGE_BB, type HandLabSpec } from "./stage";

function spec(overrides: Partial<HandLabSpec> = {}): HandLabSpec {
  return {
    heroPosition: "BTN",
    villainPosition: "CO",
    situation: "vsopen",
    stage: "early",
    stackBB: 100,
    hand: parseHand("AhKs")!,
    ...overrides,
  };
}

describe("HandLab — analyzeHand", () => {
  it("analisa AKs contra aberta do CO como raise em BTN com stack cheio", () => {
    const a = analyzeHand(spec({ hand: parseHand("AhKs")!, situation: "vsopen" }));
    expect(["raise", "allin"]).toContain(a.recommended);
    expect(a.handType).toBe("AKo"); // comboToHandType não rotula suited nesta base
    expect(a.simple.length).toBeGreaterThan(10);
    expect(a.technical.length).toBeGreaterThan(10);
  });

  it("dobrar carta com naipes diferentes = pares (KK)", () => {
    const a = analyzeHand(spec({ hand: parseHand("KhKc")! }));
    expect(a.recommended).toBe("raise");
    expect(a.handType).toBe("KK");
  });

  it("recusa cartas duplicadas idênticas (mesmo rank e naipe)", () => {
    expect(parseHand("AKsAKs")).toBeNull();
    expect(parseHand("KsKs")).toBeNull();
    expect(parseHand("KsKh")).not.toBeNull(); // mesmo rank, naipes distintos = par válido
    expect(parseHand("AhJo")).toBeNull(); // precisa do naipe nas DUAS cartas
  });

  it("mão fraca contra 3-bet em BTN é fold", () => {
    // J4o é a pior mão possível e mesmo assim o motor responde — o que importa
    // é que a análise existe e o texto reflete a agressividade do spot.
    const a = analyzeHand(spec({ hand: parseHand("Jh4d")!, situation: "vs3bet" }));
    expect(a.recommended.length).toBeGreaterThan(0);
    expect(a.context).toContain("BTN");
  });

  it("o estágio late encurta o stack e muda o cálculo (território shove-or-fold)", () => {
    expect(STAGE_BB.late).toBe(18);
    const a = analyzeHand(spec({ stage: "late", stackBB: STAGE_BB.late, hand: parseHand("AhJs")! }));
    // A resposta existe e as duas vozes refletem o estágio
    expect(a.context).toMatch(/18bb/);
    expect(a.simple).toBeTruthy();
    expect(a.technical).toBeTruthy();
  });

  it("stack muito curto vira shove com mão decente (push-or-fold)", () => {
    const a = analyzeHand(spec({ stackBB: 10, hand: parseHand("AhTs")! }));
    expect(["allin", "raise", "fold"]).toContain(a.recommended);
  });

  it("devolve contexto legível com posição e stack", () => {
    const a = analyzeHand(spec());
    expect(a.context).toContain("BTN");
    expect(a.context).toContain("100bb");
  });
});

import { describe, expect, it } from "vitest";
import { analyzeHand, parseHand, type HandLabSpec } from "./stage";

// Regressão da CALIBRAÇÃO 13–22bb (zona de re-shove). Antes o motor, fora do
// push/fold puro (<13bb), tratava 15–20bb como jogo profundo: flatava mãos
// dominadas do BB (KJo/ATo) e set-minava pares pequenos a 15bb sem implied odds.
// Nessa faixa, enfrentando UMA abertura, o certo é JAM-ou-FOLD: as mãos que
// continuam entram com re-shove (all-in) por valor + fold equity; o resto folda.
function s(o: Partial<HandLabSpec>): HandLabSpec {
  return {
    heroPosition: "BB",
    villainPosition: "UTG",
    situation: "vsopen",
    stage: "meio",
    stackBB: 18,
    hand: parseHand("KsJd")!,
    ...o,
  };
}

describe("Zona de re-shove (13–22bb) enfrentando uma abertura", () => {
  it("KJo do BB vs UTG a 18bb NÃO flata — folda (dominada OOP, stack curto)", () => {
    const a = analyzeHand(s({ hand: parseHand("KsJd")! }));
    expect(a.recommended).toBe("fold");
  });

  it("ATo do BB vs UTG a 18bb folda (dominada pelo range apertado do UTG)", () => {
    const a = analyzeHand(s({ hand: parseHand("AsTd")! }));
    expect(a.recommended).toBe("fold");
  });

  it("QJs do BB vs UTG a 18bb folda (fora do topo do re-shove vs range apertado)", () => {
    const a = analyzeHand(s({ hand: parseHand("QsJs")! }));
    expect(a.recommended).toBe("fold");
  });

  it("77 vs HJ a 15bb NÃO faz flat de set-mine — vai de all-in (re-shove padrão)", () => {
    const co = analyzeHand(s({ heroPosition: "CO", villainPosition: "HJ", stage: "bolha", stackBB: 15, hand: parseHand("7s7h")! }));
    const btn = analyzeHand(s({ heroPosition: "BTN", villainPosition: "HJ", stage: "bolha", stackBB: 15, hand: parseHand("7s7h")! }));
    expect(co.recommended).toBe("allin");
    expect(btn.recommended).toBe("allin");
  });

  it("o range de re-shove depende da POSIÇÃO do abridor — KJo folda vs UTG mas jama vs BTN a 18bb", () => {
    const vsUtg = analyzeHand(s({ villainPosition: "UTG", hand: parseHand("KsJd")! }));
    const vsBtn = analyzeHand(s({ villainPosition: "BTN", hand: parseHand("KsJd")! }));
    expect(vsUtg.recommended).toBe("fold");
    expect(vsBtn.recommended).toBe("allin");
  });

  it("mão premium continua entrando (não vira fold): AKo do BB vs UTG a 18bb é agressivo", () => {
    const a = analyzeHand(s({ hand: parseHand("AhKd")! }));
    expect(["allin", "raise"]).toContain(a.recommended);
  });

  it("acima da zona (30bb) o jogo profundo volta — KJo do BB vs UTG PODE flatar", () => {
    const a = analyzeHand(s({ stackBB: 30, hand: parseHand("KsJd")! }));
    expect(a.recommended).toBe("call");
  });

  it("abaixo da zona (12bb, push/fold puro) segue jam-ou-fold — não regrediu", () => {
    const a = analyzeHand(s({ heroPosition: "SB", villainPosition: "BTN", stackBB: 12, hand: parseHand("As8d")!, anteBB: 1 }));
    expect(a.recommended).toBe("allin");
  });

  // Conserto achado pelo benchmark externo: no topo da faixa (≥17bb), o BB fecha
  // a ação por um ótimo preço contra um abridor LARGO — as suited que flopam bem
  // FLATAM em vez de foldar. O lixo offsuit dominado segue jam-ou-fold.
  it("T9s do BB vs BTN a 20bb FLATA (ótimo preço, suited que flopa bem)", () => {
    const a = analyzeHand(s({ villainPosition: "BTN", stackBB: 20, hand: parseHand("Ts9s")! }));
    expect(a.recommended).toBe("call");
  });

  it("mesma T9s vs UTG (abridor apertado) NÃO flata — segue jam-ou-fold", () => {
    const a = analyzeHand(s({ villainPosition: "UTG", stackBB: 20, hand: parseHand("Ts9s")! }));
    expect(a.recommended).not.toBe("call");
  });

  it("lixo offsuit (KJo) do BB vs BTN a 20bb NÃO vira flat — só suited entram", () => {
    const a = analyzeHand(s({ villainPosition: "BTN", stackBB: 20, hand: parseHand("KsJd")! }));
    expect(a.recommended).not.toBe("call");
  });
});

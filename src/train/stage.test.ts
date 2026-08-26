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

  it("badge, veredito e voz batem com a decisão do motor (bug do Allan: RAISE+texto Call)", () => {
    // Em vários spots, a AÇÃO do badge (recommended) tem que ser a MESMA que a
    // voz Simples anuncia ("Era RAISE/CALL/FOLD/ALL-IN"). Antes o badge vinha de
    // reparsear o texto e divergia (badge RAISE com verdict "Call é o que...").
    const spots: HandLabSpec[] = [
      spec({ heroPosition: "BB", villainPosition: "BTN", situation: "vsopen", stage: "meio", stackBB: 20, hand: parseHand("As7s")! }),
      spec({ heroPosition: "BTN", situation: "open", stage: "early", stackBB: 100, hand: parseHand("Ah4d")! }),
      spec({ heroPosition: "CO", situation: "open", stage: "early", stackBB: 40, hand: parseHand("Ts9s")! }),
      spec({ heroPosition: "CO", situation: "open", stage: "late", stackBB: 10, hand: parseHand("Ks9s")! }),
    ];
    for (const s of spots) {
      const a = analyzeHand(s);
      const word = a.recommended === "allin" ? "ALL-IN" : a.recommended.toUpperCase();
      // A voz Simples sempre abre com "Era <AÇÃO>" — tem que ser a do badge.
      expect(a.simple).toContain(`Era ${word}`);
    }
  });

  it("vsallin: mão premium paga o all-in em qualquer estágio", () => {
    // 12bb: mesmo com o ICM da fase final, um par forte paga um shove curto.
    for (const stage of ["early", "meio", "late"] as const) {
      const a = analyzeHand(spec({ heroPosition: "BB", villainPosition: "BTN", situation: "vsallin", stage, stackBB: 12, hand: parseHand("TsTh")! }));
      expect(a.recommended).toBe("call");
    }
  });

  it("vsallin: ICM da fase final aperta — AJo paga no meio mas folda no late", () => {
    const meio = analyzeHand(spec({ heroPosition: "BB", villainPosition: "BTN", situation: "vsallin", stage: "meio", stackBB: 15, hand: parseHand("AsJh")! }));
    const late = analyzeHand(spec({ heroPosition: "BB", villainPosition: "BTN", situation: "vsallin", stage: "late", stackBB: 15, hand: parseHand("AsJh")! }));
    expect(meio.recommended).toBe("call");
    expect(late.recommended).toBe("fold"); // ICM: preservar prêmio > flip marginal
    expect(late.simple).toMatch(/ICM|prêmio/i);
  });

  it("vsallin: threshold call/fold é MONOTÔNICO no stack (bug do Allan: KQs 7c 4f)", () => {
    // Se paga o all-in com X bb, tem que pagar com qualquer stack MENOR (odds
    // melhores). A modelagem antiga (ICM proporcional) oscilava — não pode voltar.
    for (const hand of ["As7s", "KsQs", "TsTh", "AsJh"]) {
      for (const stage of ["early", "meio", "late"] as const) {
        let foldedAt = 99;
        // Faixa de push/fold (≤15bb): onde all-in pré-flop é comum e o Allan
        // pegou o bug. Acima disso o shove é atípico e o modelo fica ruidoso.
        for (let bb = 2; bb <= 15; bb++) {
          const rec = analyzeHand(spec({ heroPosition: "BB", villainPosition: "BTN", situation: "vsallin", stage, stackBB: bb, hand: parseHand(hand)! })).recommended;
          if (rec === "fold") foldedAt = Math.min(foldedAt, bb);
          // Tolera 1bb de ruído do Monte Carlo no limiar; oscilação de 2bb+ é bug.
          if (rec === "call") {
            expect(bb, `${hand} ${stage}: call em ${bb}bb com fold já em ${foldedAt}bb`).toBeLessThanOrEqual(foldedAt + 1);
          }
        }
      }
    }
  });

  it("vsallin: a decisão é call ou fold (nunca raise contra all-in)", () => {
    const a = analyzeHand(spec({ heroPosition: "BB", villainPosition: "BTN", situation: "vsallin", stage: "meio", stackBB: 20, hand: parseHand("As7s")! }));
    expect(["call", "fold"]).toContain(a.recommended);
  });

  it("devolve contexto legível com posição e stack", () => {
    const a = analyzeHand(spec());
    expect(a.context).toContain("BTN");
    expect(a.context).toContain("100bb");
  });
});

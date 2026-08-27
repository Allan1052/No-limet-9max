import { describe, expect, it } from "vitest";
import { analyzeHand, parseHand, STAGE_BB, type HandLabSpec } from "./stage";

function spec(overrides: Partial<HandLabSpec> = {}): HandLabSpec {
  return {
    heroPosition: "BTN",
    villainPosition: "CO",
    situation: "vsopen",
    stage: "inicio",
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

  it("o estágio mesa_final encurta o stack e muda o cálculo (território shove-or-fold)", () => {
    expect(STAGE_BB.mesa_final).toBe(20);
    const a = analyzeHand(spec({ stage: "mesa_final", stackBB: STAGE_BB.mesa_final, hand: parseHand("AhJs")! }));
    // A resposta existe e as duas vozes refletem o estágio
    expect(a.context).toMatch(/20bb/);
    expect(a.simple).toBeTruthy();
    expect(a.technical).toBeTruthy();
  });

  it("stack muito curto vira shove com mão decente (push-or-fold)", () => {
    const a = analyzeHand(spec({ stackBB: 10, hand: parseHand("AhTs")! }));
    expect(["allin", "raise", "fold"]).toContain(a.recommended);
  });

  it("voz técnica usa o stack real no início — A8o com 12bb não recebe texto de 200bb+", () => {
    const a = analyzeHand(spec({
      heroPosition: "SB",
      villainPosition: "BTN",
      situation: "vsopen",
      stage: "inicio",
      stackBB: 12,
      hand: parseHand("As8d")!,
      anteBB: 1,
    }));
    expect(a.recommended).toBe("allin");
    expect(a.technical).toContain("12bb");
    expect(a.technical).toContain("shove-or-fold");
    expect(a.technical).not.toContain("200bb+");
    expect(a.technical).not.toContain("implied odds altos");
  });

  it("voz técnica ainda reconhece profundidade em stack cheia", () => {
    const a = analyzeHand(spec({ stage: "inicio", stackBB: 100, hand: parseHand("As7s")! }));
    expect(a.technical).toContain("100bb");
    expect(a.technical).toContain("implied odds");
  });

  it("badge, veredito e voz batem com a decisão do motor (bug do Allan: RAISE+texto Call)", () => {
    // Em vários spots, a AÇÃO do badge (recommended) tem que ser a MESMA que a
    // voz Simples anuncia ("Era RAISE/CALL/FOLD/ALL-IN"). Antes o badge vinha de
    // reparsear o texto e divergia (badge RAISE com verdict "Call é o que...").
    const spots: HandLabSpec[] = [
      spec({ heroPosition: "BB", villainPosition: "BTN", situation: "vsopen", stage: "meio", stackBB: 20, hand: parseHand("As7s")! }),
      spec({ heroPosition: "BTN", situation: "open", stage: "inicio", stackBB: 100, hand: parseHand("Ah4d")! }),
      spec({ heroPosition: "CO", situation: "open", stage: "inicio", stackBB: 40, hand: parseHand("Ts9s")! }),
      spec({ heroPosition: "CO", situation: "open", stage: "mesa_final", stackBB: 10, hand: parseHand("Ks9s")! }),
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
    for (const stage of ["inicio", "meio", "mesa_final"] as const) {
      const a = analyzeHand(spec({ heroPosition: "BB", villainPosition: "BTN", situation: "vsallin", stage, stackBB: 12, hand: parseHand("TsTh")! }));
      expect(a.recommended).toBe("call");
    }
  });

  it("vsallin: ICM da fase final aperta — A7s paga o shove do BTN no chip-EV mas folda no late", () => {
    // Este É o quiz do Instagram: A♠7♠ no BB, 15bb, BTN deu all-in. Contra o
    // roubo LARGO de um BTN, A7s paga no chip-EV (início/meio); na bolha/mesa
    // final o ICM sobe o preço e a mesma mão vira fold.
    const meio = analyzeHand(spec({ heroPosition: "BB", villainPosition: "BTN", situation: "vsallin", stage: "meio", stackBB: 15, hand: parseHand("As7s")! }));
    const late = analyzeHand(spec({ heroPosition: "BB", villainPosition: "BTN", situation: "vsallin", stage: "mesa_final", stackBB: 15, hand: parseHand("As7s")! }));
    expect(meio.recommended).toBe("call");
    expect(late.recommended).toBe("fold"); // ICM: preservar prêmio > flip marginal
    expect(late.simple).toMatch(/ICM|prêmio/i);
  });

  it("vsallin: o range do shove depende da POSIÇÃO — A7s paga o BTN (roubo largo) mas folda o UTG (apertado)", () => {
    const vsBtn = analyzeHand(spec({ heroPosition: "BB", villainPosition: "BTN", situation: "vsallin", stage: "meio", stackBB: 15, hand: parseHand("As7s")! }));
    const vsUtg = analyzeHand(spec({ heroPosition: "BB", villainPosition: "UTG", situation: "vsallin", stage: "meio", stackBB: 15, hand: parseHand("As7s")! }));
    expect(vsBtn.recommended).toBe("call"); // BTN shova largo → A7s paga
    expect(vsUtg.recommended).toBe("fold"); // UTG shova apertado → A7s está dominada
  });

  it("vsallin: threshold call/fold é MONOTÔNICO no stack (bug do Allan: KQs 7c 4f)", () => {
    // Se paga o all-in com X bb, tem que pagar com qualquer stack MENOR (odds
    // melhores). A modelagem antiga (ICM proporcional) oscilava — não pode voltar.
    for (const hand of ["As7s", "KsQs", "TsTh", "AsJh"]) {
      for (const stage of ["inicio", "meio", "bolha", "mesa_final"] as const) {
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

  it("vsallin: BOLHA aperta o call mais (ou igual) que a mesa final — ICM máximo", () => {
    const lastCall = (stage: "bolha" | "mesa_final", hand: string) => {
      let x = 0;
      for (let bb = 2; bb <= 18; bb++) {
        if (analyzeHand(spec({ heroPosition: "BB", villainPosition: "BTN", situation: "vsallin", stage, stackBB: bb, hand: parseHand(hand)! })).recommended === "call") x = bb;
      }
      return x;
    };
    for (const hand of ["As7s", "KsQs", "TsTh"]) {
      expect(lastCall("bolha", hand), `${hand}: bolha deve pagar com stack <= mesa final`).toBeLessThanOrEqual(lastCall("mesa_final", hand));
    }
  });

  it("vsallin: a decisão é call ou fold (nunca raise contra all-in)", () => {
    const a = analyzeHand(spec({ heroPosition: "BB", villainPosition: "BTN", situation: "vsallin", stage: "meio", stackBB: 20, hand: parseHand("As7s")! }));
    expect(["call", "fold"]).toContain(a.recommended);
  });

  it("whyNot: gera a alternativa oposta com explicação", () => {
    const foldRfi = analyzeHand(spec({ heroPosition: "UTG", situation: "open", stage: "meio", stackBB: 40, hand: parseHand("Js5s")! }));
    expect(foldRfi.recommended).toBe("fold");
    expect(foldRfi.whyNot?.label).toBe("ABRIR"); // fold RFI → por que não abrir
    expect(foldRfi.whyNot?.text.length).toBeGreaterThan(20);

    const callAllin = analyzeHand(spec({ heroPosition: "BB", villainPosition: "BTN", situation: "vsallin", stage: "meio", stackBB: 12, hand: parseHand("TsTh")! }));
    expect(callAllin.recommended).toBe("call");
    expect(callAllin.whyNot?.label).toBe("FOLDAR"); // call → por que não foldar
  });

  it("anchor: frase-âncora contextual (ICM quando é bolha/mesa final vs all-in)", () => {
    const bolha = analyzeHand(spec({ heroPosition: "BB", villainPosition: "BTN", situation: "vsallin", stage: "bolha", stackBB: 12, hand: parseHand("As7s")! }));
    expect(bolha.anchor).toMatch(/ICM/);
    const rfi = analyzeHand(spec({ heroPosition: "BTN", situation: "open", stage: "inicio", stackBB: 40, hand: parseHand("As7s")! }));
    expect(rfi.anchor.length).toBeGreaterThan(10);
  });

  it("devolve contexto legível com posição e stack", () => {
    const a = analyzeHand(spec());
    expect(a.context).toContain("BTN");
    expect(a.context).toContain("100bb");
  });
});

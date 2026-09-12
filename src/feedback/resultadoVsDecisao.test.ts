import { describe, expect, it } from "vitest";
import type { FeedbackItem, Rating } from "./analyzer";
import { compararResultadoEDecisao } from "./resultadoVsDecisao";

function item(rating: Rating): FeedbackItem {
  return { street: "Flop", heroAction: "Call", advice: "Fold", rating, text: "x", kind: "postflop" } as FeedbackItem;
}

describe("resultado ≠ decisão", () => {
  it("sem decisão avaliada, não há o que comparar", () => {
    expect(compararResultadoEDecisao([], { netBB: -18 })).toBeUndefined();
  });

  it("sem desfecho conhecido, a faixa não nasce", () => {
    expect(compararResultadoEDecisao([item("boa")], {})).toBeUndefined();
  });

  it("PERDEU E JOGOU CERTO — o caso que mais ensina", () => {
    const r = compararResultadoEDecisao([item("boa"), item("ok")], { netBB: -18 })!;
    expect(r.veredito).toBe("acertouEPerdeu");
    expect(r.linhaResultado).toBe("−18bb");
    expect(r.linhaDecisao).toBe("Decisão: no padrão");
    expect(r.texto).toContain("jogou certo");
  });

  it("GANHOU E ERROU — o caso que mais engana", () => {
    const r = compararResultadoEDecisao([item("boa"), item("ruim")], { netBB: 24.5 })!;
    expect(r.veredito).toBe("errouEGanhou");
    expect(r.linhaResultado).toBe("+24,5bb");
    expect(r.texto).toContain("Ganhar esconde erro");
  });

  it("'ok' conta como no padrão; 'imprecisa' não", () => {
    expect(compararResultadoEDecisao([item("ok")], { netBB: 1 })!.decisaoOk).toBe(true);
    expect(compararResultadoEDecisao([item("imprecisa")], { netBB: 1 })!.decisaoOk).toBe(false);
  });

  it("empate EXATO não é resultado: a faixa não nasce", () => {
    // Sem esta trava a tela dizia "Mão empatada" no resultado e "perdeu a mão"
    // no texto, ao mesmo tempo. Sem resultado, não há confronto a mostrar.
    expect(compararResultadoEDecisao([item("boa")], { netBB: 0 })).toBeUndefined();
  });

  it("o texto do 'jogou certo' serve também para quem só foldou (não afirma derrota)", () => {
    const r = compararResultadoEDecisao([item("boa")], { netBB: -1 })!;
    expect(r.texto).toContain("não levou esse pote");
    expect(r.texto).not.toContain("Perdeu a mão");
  });

  it("MÃO IMPORTADA: sem líquido reconstruível, fala em pote — nunca inventa bb", () => {
    const r = compararResultadoEDecisao([item("boa")], { levouOPote: false })!;
    expect(r.linhaResultado).toBe("Não levou o pote");
    expect(r.linhaResultado).not.toMatch(/bb/);
    expect(r.veredito).toBe("acertouEPerdeu");
  });

  it("netBB inválido (NaN) conta como ausente — cai no pote, não vira número", () => {
    const r = compararResultadoEDecisao([item("boa")], { netBB: NaN, levouOPote: true })!;
    expect(r.linhaResultado).toBe("Levou o pote");
  });

  it("os quatro vereditos existem e cada um tem recado próprio", () => {
    const casos = [
      [[item("boa")], { netBB: 5 }, "acertouEGanhou"],
      [[item("boa")], { netBB: -5 }, "acertouEPerdeu"],
      [[item("ruim")], { netBB: 5 }, "errouEGanhou"],
      [[item("ruim")], { netBB: -5 }, "errouEPerdeu"],
    ] as const;
    const textos = new Set<string>();
    for (const [items, res, esperado] of casos) {
      const r = compararResultadoEDecisao([...items], res)!;
      expect(r.veredito).toBe(esperado);
      textos.add(r.texto);
    }
    expect(textos.size).toBe(4);
  });
});

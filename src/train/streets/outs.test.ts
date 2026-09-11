// ---------------------------------------------------------------------------
// "Cartas que te salvavam". Os testes checam o que dá para checar com certeza:
// casos onde a resposta é conhecida de antemão, e as recusas honestas.
// ---------------------------------------------------------------------------
import { describe, it, expect } from "vitest";
import { cardsFromString } from "../../engine/cards";
import { contarOuts } from "./outs";
import { preflopOpenRange } from "./dynamicRanges";

const range = preflopOpenRange("BTN", 40);

describe("contarOuts", () => {
  // 7♠6♠ num A♠K♦2♠: projeto de flush, mas ATRÁS do range do BTN (equity
  // medida: 38,6%). É o caso clássico de "quais cartas me salvam".
  it("projeto de flush estando atrás: acha as cartas do naipe", () => {
    const r = contarOuts(cardsFromString("7s6s"), cardsFromString("AsKd2s"), range);
    expect(r).toBeDefined();
    const espadas = r!.labels.filter((l) => l.endsWith("♠")).length;
    expect(espadas).toBeGreaterThanOrEqual(8);
    expect(r!.cartasRestantes).toBe(47);
  });

  // A♠K♠ no 9♠4♠2♦ tem equity de 76,6%: já está MUITO na frente. Aqui a
  // resposta certa é não responder — "cartas que te salvam" não faz sentido
  // para quem não precisa ser salvo.
  it("mão forte com projeto NÃO vira lista de salvação", () => {
    expect(contarOuts(cardsFromString("AsKs"), cardsFromString("9s4s2d"), range)).toBeUndefined();
  });

  it("a chance da próxima carta bate com a conta de outs/restantes", () => {
    const r = contarOuts(cardsFromString("7s6s"), cardsFromString("AsKd2s"), range)!;
    expect(r.chanceProximaCarta).toBeCloseTo(r.outs / r.cartasRestantes, 10);
  });

  it("quem já está na frente NÃO recebe lista de salvação", () => {
    // Trinca de 9 num board 9-4-2: já está muito à frente.
    expect(contarOuts(cardsFromString("9h9c"), cardsFromString("9s4s2d"), range)).toBeUndefined();
  });

  it("no river não existe carta por vir", () => {
    expect(contarOuts(cardsFromString("7s6s"), cardsFromString("AsKd2s7h3c"), range)).toBeUndefined();
  });

  it("sem range do vilão, não inventa", () => {
    expect(contarOuts(cardsFromString("7s6s"), cardsFromString("AsKd2s"), {})).toBeUndefined();
  });

  it("é determinístico: o mesmo spot responde sempre igual", () => {
    const a = contarOuts(cardsFromString("7s6s"), cardsFromString("AsKd2s"), range)!;
    const b = contarOuts(cardsFromString("7s6s"), cardsFromString("AsKd2s"), range)!;
    expect(a.outs).toBe(b.outs);
    expect(a.labels).toEqual(b.labels);
  });

  it("mão sem nada e sem projeto tem MENOS salvação que um projeto de flush", () => {
    const projeto = contarOuts(cardsFromString("7s6s"), cardsFromString("AsKd2s"), range)!;
    const lixo = contarOuts(cardsFromString("7h3c"), cardsFromString("As9d4c"), range);
    const nLixo = lixo ? lixo.outs : 0;
    expect(projeto.outs).toBeGreaterThan(nLixo);
  });
});

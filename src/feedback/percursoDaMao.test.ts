import { describe, expect, it } from "vitest";
import type { FeedbackItem, Rating } from "./analyzer";
import { percursoDaMao } from "./percursoDaMao";

function item(street: string, rating: Rating, extra: Partial<FeedbackItem> = {}): FeedbackItem {
  return {
    street,
    heroAction: "Call",
    advice: "Fold",
    rating,
    text: "motivo",
    kind: "postflop",
    ...extra,
  } as FeedbackItem;
}

describe("percurso da mão — onde ela saiu do caminho", () => {
  it("sem decisão avaliada, não há percurso", () => {
    expect(percursoDaMao([])).toBeUndefined();
  });

  it("monta sempre as quatro ruas, na ordem, mesmo sem decisão em todas", () => {
    const p = percursoDaMao([item("Pré-flop", "boa")])!;
    expect(p.ruas.map((r) => r.rua)).toEqual(["preflop", "flop", "turn", "river"]);
    expect(p.ruas[0].nota).toBe("boa");
    expect(p.ruas[1].nota).toBe("semDecisao");
  });

  it("'sem decisão' NÃO vira acerto — é ausência de decisão, não acerto", () => {
    const p = percursoDaMao([item("Pré-flop", "boa")])!;
    expect(p.ruas[3].nota).toBe("semDecisao");
    expect(p.piorIdx).toBeUndefined(); // e não conta como erro tampouco
  });

  it("aponta a rua do erro", () => {
    const p = percursoDaMao([
      item("Pré-flop", "boa"),
      item("Flop", "boa"),
      item("Turn", "ruim"),
    ])!;
    expect(p.piorIdx).toBe(2);
    expect(p.ondeSaiu).toContain("No Turn");
  });

  it("'ok' é alternativa aceitável, não erro: sozinho não aponta nada", () => {
    const p = percursoDaMao([item("Pré-flop", "ok"), item("Flop", "ok")])!;
    expect(p.piorIdx).toBeUndefined();
    expect(p.ondeSaiu).toBeUndefined();
  });

  it("no empate de gravidade, aponta a rua MAIS TARDE", () => {
    const p = percursoDaMao([
      item("Flop", "ruim"),
      item("River", "ruim"),
    ])!;
    expect(p.ruas[p.piorIdx!].rua).toBe("river");
  });

  it("erro claro ganha de imprecisão, mesmo vindo antes", () => {
    const p = percursoDaMao([
      item("Flop", "ruim"),
      item("River", "imprecisa"),
    ])!;
    expect(p.ruas[p.piorIdx!].rua).toBe("flop");
  });

  it("duas decisões na MESMA rua: vale a pior delas", () => {
    const p = percursoDaMao([
      item("Pré-flop", "boa"),
      item("Pré-flop", "ruim"),
    ])!;
    expect(p.ruas[0].nota).toBe("ruim");
  });

  it("a frase traz a conta quando ela existe — e só então", () => {
    const comConta = percursoDaMao([
      item("Turn", "ruim", { equity: 0.25, potOdds: 0.34 }),
    ])!;
    expect(comConta.ondeSaiu).toContain("precisava de 34%");
    expect(comConta.ondeSaiu).toContain("tinha 25%");

    const semConta = percursoDaMao([item("Turn", "ruim")])!;
    expect(semConta.ondeSaiu).not.toContain("%");
    expect(semConta.ondeSaiu).toContain("o padrão era FOLD");
  });

  it("rótulos que não são rua de decisão (showdown) são ignorados", () => {
    expect(percursoDaMao([item("Showdown", "boa")])).toBeUndefined();
  });
});

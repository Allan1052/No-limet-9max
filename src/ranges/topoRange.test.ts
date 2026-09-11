import { describe, expect, it } from "vitest";
import { cardsFromString } from "../engine/cards";
import { Category } from "../engine/evaluator";
import { buildTopRange } from "./build";
import { topoDoRange } from "./topoRange";

describe("topoDoRange — quanto do range dele forma trinca ou melhor", () => {
  it("sem board suficiente não existe medida (devolve undefined)", () => {
    expect(topoDoRange({ AA: 1 }, [])).toBeUndefined();
    expect(topoDoRange({ AA: 1 }, cardsFromString("As Kd"))).toBeUndefined();
  });

  it("conta pesando pela frequência da mão no range", () => {
    // Board 2s 3d 7h. AA faz só um par (não conta). 22 faz trinca.
    // 22 tem 6 combos, mas 3 usam o 2s do board → sobram 3, cada um pesando 0.5.
    // total = 6 (AA) + 1.5 (22) = 7.5 · topo = 1.5 → 20%.
    const r = topoDoRange({ AA: 1, 22: 0.5 }, cardsFromString("2s 3d 7h"));
    expect(r).toBeDefined();
    expect(r!.total).toBeCloseTo(7.5, 5);
    expect(r!.combos).toBeCloseTo(1.5, 5);
    expect(r!.fracao).toBeCloseTo(0.2, 5);
    expect(r!.limiarLabel).toBe("trinca");
  });

  it("as SUAS cartas removem combos dele — você bloqueia o topo", () => {
    const board = cardsFromString("2s 3d 7h");
    // Sem bloqueio: 77 tem 6 combos, 3 deles usam o 7h do board → sobram 3.
    expect(topoDoRange({ 77: 1 }, board)!.total).toBe(3);
    // Com 7c na sua mão sobra um único 77 pra ele (7s7d).
    const com = topoDoRange({ 77: 1 }, board, cardsFromString("7c 2h"))!;
    expect(com.total).toBe(1);
    expect(com.fracao).toBe(1);
    // E se você tem os dois 7 que faltavam, não sobra combo nenhum: sem
    // denominador não há fração honesta, então não há frase.
    expect(topoDoRange({ 77: 1 }, board, cardsFromString("7c 7d"))).toBeUndefined();
  });

  it("board com trinca na mesa: TODO range dele chega ao limiar", () => {
    const r = topoDoRange(buildTopRange(0.3), cardsFromString("As Ad Ac"))!;
    expect(r.fracao).toBe(1);
  });

  it("range SÓ de cartas altas é limitado de verdade num board baixo: 0%", () => {
    // É o caso que o comentarista narra: pela linha dele, só sobraram cartas
    // altas — nesse board não existe trinca nenhuma no range dele.
    const r = topoDoRange({ AKo: 1, AQo: 1, AKs: 1, AQs: 1 }, cardsFromString("2c 3d 7h"))!;
    expect(r.fracao).toBe(0);
    expect(r.combos).toBe(0);
    expect(r.total).toBeGreaterThan(0);
  });

  it("o mesmo range deixa de ser limitado quando o board bate nele", () => {
    const range = { AKo: 1, AQo: 1, AKs: 1, AQs: 1 };
    const baixo = topoDoRange(range, cardsFromString("2c 3d 7h"))!;
    const alto = topoDoRange(range, cardsFromString("Ac Ad 7h"))!;
    expect(baixo.fracao).toBe(0);
    expect(alto.fracao).toBeGreaterThan(0.5); // todo A? vira trinca de ases
  });

  it("num board baixo, range largo de verdade chega ao topo mais vezes que só-cartas-altas", () => {
    const board = cardsFromString("2c 3d 7h");
    const soAltas = topoDoRange({ AKo: 1, AQo: 1, KQo: 1, AJo: 1 }, board)!;
    const largo = topoDoRange(buildTopRange(0.5), board)!;
    expect(largo.fracao).toBeGreaterThan(soAltas.fracao);
  });

  it("o limiar é configurável e mais exigente devolve fração menor ou igual", () => {
    const board = cardsFromString("9s 8d 4h");
    const range = buildTopRange(0.4);
    const doisPares = topoDoRange(range, board, [], Category.TwoPair)!;
    const trinca = topoDoRange(range, board, [], Category.Trips)!;
    expect(trinca.fracao).toBeLessThanOrEqual(doisPares.fracao);
    expect(doisPares.limiarLabel).toBe("dois pares");
  });
});

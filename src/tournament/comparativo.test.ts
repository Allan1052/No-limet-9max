// ---------------------------------------------------------------------------
// O comparativo do fim de torneio — "você × o padrão", nas MESMAS mãos.
// Pedido do Allan em 14/09/2026 depois de jogar um torneio às cegas.
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import {
  compararComOPadrao,
  compararComESemDica,
  AMOSTRA_MINIMA_COMPARATIVO,
  type DecisaoComparavel,
} from "./comparativo";

const d = (
  heroFam: DecisaoComparavel["heroFam"],
  adviceFam: DecisaoComparavel["adviceFam"],
  semDica = true,
  kind: "preflop" | "postflop" = "preflop",
): DecisaoComparavel => ({ heroFam, adviceFam, semDica, kind });

const repetir = (n: number, x: DecisaoComparavel) => Array.from({ length: n }, () => ({ ...x }));

describe("você × o padrão do app", () => {
  it("os dois lados saem das MESMAS decisões", () => {
    const c = compararComOPadrao([
      ...repetir(8, d("fold", "fold")),
      ...repetir(1, d("call", "call")),
      ...repetir(1, d("aggro", "fold")), // abriu onde o padrão largava
    ]);
    expect(c.amostra).toBe(10);
    expect(c.voce).toEqual({ fold: 80, call: 10, raise: 10 });
    expect(c.padrao).toEqual({ fold: 90, call: 10, raise: 0 });
  });

  it("check conta como 'largou' dos dois lados (igual à anatomia)", () => {
    const c = compararComOPadrao([...repetir(5, d("check", "check")), ...repetir(5, d("call", "call"))]);
    expect(c.voce.fold).toBe(50);
    expect(c.padrao.fold).toBe(50);
  });

  it("decisão sem padrão conhecido fica de fora (não inventa metade do gráfico)", () => {
    const c = compararComOPadrao([
      ...repetir(10, d("fold", "fold")),
      { heroFam: "fold", adviceFam: undefined, semDica: true },
      { heroFam: undefined, adviceFam: "fold", semDica: true },
    ]);
    expect(c.amostra).toBe(10);
  });

  it("amostra curta não vira diagnóstico", () => {
    const c = compararComOPadrao(repetir(AMOSTRA_MINIMA_COMPARATIVO - 1, d("aggro", "fold")));
    expect(c.confiavel).toBe(false);
    expect(c.maiorGap).toBeUndefined();
    expect(c.leitura).toMatch(/pouco para tirar conclusão/i);
  });

  it("aponta a maior diferença e diz de que lado ela cai", () => {
    // 30 decisões: em 12 delas ele agrediu onde o padrão largava.
    const c = compararComOPadrao([...repetir(18, d("fold", "fold")), ...repetir(12, d("aggro", "fold"))]);
    expect(c.confiavel).toBe(true);
    expect(c.maiorGap?.rotulo).toBe("Agrediu");
    expect(c.maiorGap!.diferenca).toBeGreaterThan(0);
    expect(c.leitura).toMatch(/agrediu 40 pontos a mais/i);
  });

  it("jogo colado no padrão não vira crítica", () => {
    const c = compararComOPadrao([...repetir(25, d("fold", "fold")), ...repetir(5, d("call", "call"))]);
    expect(c.maiorGap).toBeUndefined();
    expect(c.leitura).toMatch(/colada na do padrão/i);
  });

  it("o recorte 'às cegas' separa mesmo as mãos com dica", () => {
    const todas = [...repetir(25, d("fold", "fold", true)), ...repetir(25, d("aggro", "fold", false))];
    expect(compararComOPadrao(todas, { semDica: true }).voce.fold).toBe(100);
    expect(compararComOPadrao(todas, { semDica: false }).voce.raise).toBe(100);
  });

  it("o recorte por rua também separa", () => {
    const todas = [
      ...repetir(25, d("fold", "fold", true, "preflop")),
      ...repetir(25, d("call", "call", true, "postflop")),
    ];
    expect(compararComOPadrao(todas, { kind: "preflop" }).amostra).toBe(25);
    expect(compararComOPadrao(todas, { kind: "postflop" }).voce.call).toBe(100);
  });

  it("as três fatias somam 100 (ou 99/101 por arredondamento)", () => {
    const c = compararComOPadrao([...repetir(7, d("fold", "fold")), ...repetir(7, d("call", "aggro")), ...repetir(7, d("aggro", "call"))]);
    for (const lado of [c.voce, c.padrao]) {
      const soma = lado.fold + lado.call + lado.raise;
      expect(soma).toBeGreaterThanOrEqual(99);
      expect(soma).toBeLessThanOrEqual(101);
    }
  });
});

describe("com dica × sem dica", () => {
  it("o caso do Allan: torneio quase todo às cegas", () => {
    // 99 decisões às cegas (81 certas) e 38 com dica (35 certas).
    const r = compararComESemDica(99, 81, 38, 35);
    expect(r.semDica.pct).toBe(82);
    expect(r.comDica.pct).toBe(92);
    expect(r.diferenca).toBe(-10);
    expect(r.confiavel).toBe(true);
    expect(r.leitura).toMatch(/10 pontos/);
  });

  it("torneio 100% às cegas diz isso em vez de comparar com o vazio", () => {
    const r = compararComESemDica(99, 81, 0, 0);
    expect(r.confiavel).toBe(false);
    expect(r.leitura).toMatch(/todo às cegas/i);
    expect(r.leitura).toContain("81 de 99");
  });

  it("um lado curto não vira comparação", () => {
    const r = compararComESemDica(99, 81, 4, 4);
    expect(r.confiavel).toBe(false);
    expect(r.leitura).toMatch(/poucas decisões/i);
  });

  it("jogo igual com e sem dica é elogio, não alarme", () => {
    const r = compararComESemDica(50, 43, 50, 44);
    expect(Math.abs(r.diferenca)).toBeLessThan(5);
    expect(r.leitura).toMatch(/praticamente o mesmo jogo/i);
  });

  it("nunca divide por zero", () => {
    const r = compararComESemDica(0, 0, 0, 0);
    expect(r.semDica.pct).toBe(0);
    expect(r.comDica.pct).toBe(0);
    expect(r.leitura).toMatch(/com as dicas na tela/i);
  });
});

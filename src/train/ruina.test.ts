// ---------------------------------------------------------------------------
// O número da ruína é MEDIDO (sim/_ruinaRun.test.ts). Estes testes guardam que
// ele não vira palpite: não extrapola fora da faixa simulada e não suaviza o
// caso real do Allan ($70 jogando $11 = 6 buy-ins).
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import {
  riscoDeRuina,
  retratoDaRuina,
  buyInsDeReserva,
  gravidade,
  DESVIO_POR_TORNEIO,
  LUCRO_POR_TORNEIO,
  TORNEIOS_ATE_O_SINAL,
} from "./ruina";

describe("O caso real que ele descreveu", () => {
  it("$70 jogando $11 é ~6 buy-ins e ~93% de chance de zerar", () => {
    const r = retratoDaRuina(70, 11);
    expect(r.buyIns).toBeCloseTo(6.36, 2);
    expect(r.risco).toBeGreaterThan(90);
    expect(r.gravidade).toBe("quase_certo");
  });

  it("$70 jogando $7 é 10 buy-ins e ~89%", () => {
    const r = retratoDaRuina(70, 7);
    expect(r.buyIns).toBe(10);
    expect(r.risco).toBeCloseTo(88.7, 1);
  });

  it("a regra de 100 buy-ins derruba para ~19% — não para zero", () => {
    expect(riscoDeRuina(100)).toBeCloseTo(19, 1);
    expect(gravidade(riscoDeRuina(100))).toBe("apertado");
  });

  it("os 834 buy-ins medidos no histórico dele zeram o risco", () => {
    expect(riscoDeRuina(834)).toBe(0);
  });
});

describe("Não inventa número", () => {
  it("abaixo e acima da faixa medida, usa a ponta e avisa", () => {
    expect(riscoDeRuina(1)).toBe(riscoDeRuina(6));
    expect(riscoDeRuina(5000)).toBe(riscoDeRuina(834));
    expect(retratoDaRuina(10, 11).dentroDaFaixaMedida).toBe(false); // 0,9 buy-in
    expect(retratoDaRuina(20_000, 11).dentroDaFaixaMedida).toBe(false); // 1.818 buy-ins
    expect(retratoDaRuina(1100, 11).dentroDaFaixaMedida).toBe(true); // 100 buy-ins
    expect(retratoDaRuina(5000, 11).dentroDaFaixaMedida).toBe(true); // 454, dentro
  });

  it("banca zerada ou buy-in inválido não explode", () => {
    expect(riscoDeRuina(0)).toBe(100);
    expect(riscoDeRuina(NaN)).toBe(100);
    expect(buyInsDeReserva(100, 0)).toBe(0);
  });

  it("o risco só cai quando a banca sobe — nunca o contrário", () => {
    let anterior = 101;
    for (const b of [6, 10, 20, 35, 50, 75, 100, 150, 200, 400, 834]) {
      const r = riscoDeRuina(b);
      expect(r).toBeLessThanOrEqual(anterior);
      anterior = r;
    }
  });
});

describe("O ruído de uma sessão", () => {
  it("guarda os números medidos para a tela poder ser honesta", () => {
    expect(DESVIO_POR_TORNEIO).toBeCloseTo(3.39, 2);
    expect(LUCRO_POR_TORNEIO).toBeCloseTo(0.0464, 4);
    // O ruído de UM torneio é ~73× o lucro esperado dele. É por isso que o
    // resultado de um dia não diz nada sobre quem joga bem.
    expect(DESVIO_POR_TORNEIO / LUCRO_POR_TORNEIO).toBeGreaterThan(50);
  });

  it("os torneios até o sinal batem com a conta (desvio ÷ lucro)²", () => {
    const esperado = Math.pow(DESVIO_POR_TORNEIO / LUCRO_POR_TORNEIO, 2);
    expect(Math.abs(TORNEIOS_ATE_O_SINAL - esperado) / esperado).toBeLessThan(0.02);
  });
});

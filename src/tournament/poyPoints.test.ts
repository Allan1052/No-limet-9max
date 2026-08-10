import { describe, it, expect } from "vitest";
import { computePoyPoints, sumBestResults, tierForBuyIn } from "./poyPoints";

// Tabela de referência do documento de entrega (faixa $5, cravar = 1º lugar).
// Se estes números baterem, a fórmula WSOP POY está correta.
const REF_5 = [
  { entrants: 30, champion: 548 },
  { entrants: 60, champion: 775 },
  { entrants: 100, champion: 1000 },
  { entrants: 180, champion: 1342 },
  { entrants: 300, champion: 1732 },
  { entrants: 500, champion: 2236 },
  { entrants: 800, champion: 2828 },
  { entrants: 1200, champion: 3464 },
  { entrants: 1600, champion: 4000 },
  { entrants: 2000, champion: 4472 },
];

describe("POY — fórmula bate com a tabela de referência", () => {
  it("faixa $5: cravar cada etapa dá os pontos do documento (±1)", () => {
    for (const r of REF_5) {
      const p = computePoyPoints({ stage: "inicio", entrants: r.entrants, buyIn: 5, finishPosition: 1 });
      expect(p.eligible).toBe(true);
      expect(Math.abs(p.points - r.champion)).toBeLessThanOrEqual(1);
    }
  });

  it("circuito completo $5 soma ~22.397 pts", () => {
    const total = REF_5.reduce(
      (s, r) => s + computePoyPoints({ stage: "inicio", entrants: r.entrants, buyIn: 5, finishPosition: 1 }).points,
      0,
    );
    expect(Math.abs(total - 22397)).toBeLessThanOrEqual(3);
  });

  it("faixa $11: confere os pontos cruzados do documento", () => {
    const cases = [
      { entrants: 30, pts: 812 },
      { entrants: 60, pts: 1149 },
      { entrants: 100, pts: 1483 },
      { entrants: 300, pts: 2569 },
      { entrants: 2000, pts: 6633 },
    ];
    for (const c of cases) {
      const p = computePoyPoints({ stage: "inicio", entrants: c.entrants, buyIn: 11, finishPosition: 1 });
      expect(Math.abs(p.points - c.pts)).toBeLessThanOrEqual(1);
    }
  });

  it("só o Início pontua; Meio/Bolha/Mesa Final não valem ranking", () => {
    for (const stage of ["meio", "bolha", "mesa_final"] as const) {
      const p = computePoyPoints({ stage, entrants: 100, buyIn: 5, finishPosition: 1 });
      expect(p.eligible).toBe(false);
      expect(p.points).toBe(0);
    }
  });

  it("fora do dinheiro (abaixo dos lugares pagos) não pontua", () => {
    const p = computePoyPoints({ stage: "inicio", entrants: 100, buyIn: 5, finishPosition: 90 });
    expect(p.eligible).toBe(false);
    expect(p.reason).toBe("no_cash");
  });

  it("ranking anual soma só os 10 melhores resultados", () => {
    const twelve = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 5, 1];
    // melhores 10 = tudo menos o 5 e o 1
    expect(sumBestResults(twelve, 10)).toBe(100 + 90 + 80 + 70 + 60 + 50 + 40 + 30 + 20 + 10);
  });

  it("faixas por buy-in seguem a decisão do projeto", () => {
    expect(tierForBuyIn(5)).toBe("micro");
    expect(tierForBuyIn(11)).toBe("baixa");
    expect(tierForBuyIn(22)).toBe("media");
    expect(tierForBuyIn(55)).toBe("media");
    expect(tierForBuyIn(109)).toBe("alta");
  });
});

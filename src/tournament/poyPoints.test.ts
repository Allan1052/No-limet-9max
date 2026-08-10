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

  it("faixa $11: buy-in amortecido na raiz 4,5 (como a WSOP)", () => {
    const cases = [
      { entrants: 30, pts: 653 },
      { entrants: 60, pts: 923 },
      { entrants: 100, pts: 1191 },
      { entrants: 300, pts: 2064 },
      { entrants: 2000, pts: 5329 },
    ];
    for (const c of cases) {
      const p = computePoyPoints({ stage: "inicio", entrants: c.entrants, buyIn: 11, finishPosition: 1 });
      expect(Math.abs(p.points - c.pts)).toBeLessThanOrEqual(1);
    }
  });

  it("o buy-in NÃO domina o placar: $109 vale ~2x um $5, não 21x", () => {
    // Campo neutro (100 inscritos), cravando. A razão dos pontos deve refletir
    // a raiz 4,5 do buy-in — perto de 2x, longe do 21,8x do preço bruto.
    const p5 = computePoyPoints({ stage: "inicio", entrants: 100, buyIn: 5, finishPosition: 1 }).points;
    const p109 = computePoyPoints({ stage: "inicio", entrants: 100, buyIn: 109, finishPosition: 1 }).points;
    const ratio = p109 / p5;
    expect(ratio).toBeGreaterThan(1.8);
    expect(ratio).toBeLessThan(2.2);
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

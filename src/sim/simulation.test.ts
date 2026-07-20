import { describe, it, expect } from "vitest";
import { runSimulation, formatReport, type SimProfileResult } from "./runSimulation";

// Suíte de simulação em massa: milhares de mãos validando o comportamento dos
// perfis. Mantemos as iterações de equity baixas para rodar rápido; as
// estatísticas de pré-flop (VPIP/PFR/3-bet) independem disso.
const HANDS = 2500;
const report = runSimulation(HANDS, { equityIterations: 200, seed: 20260718 });

function byId(id: string): SimProfileResult {
  const r = report.byProfile.find((x) => x.id === id);
  if (!r) throw new Error(`perfil ${id} não encontrado`);
  return r;
}

describe(`simulação em massa (${HANDS} mãos)`, () => {
  it("imprime o relatório", () => {
    console.log(formatReport(report));
    expect(report.hands).toBe(HANDS);
  });

  it("as fichas se conservam em todas as mãos", () => {
    expect(report.chipConserved).toBe(true);
  });

  it("todo perfil jogou todas as mãos (amostra limpa)", () => {
    for (const r of report.byProfile) expect(r.hands).toBe(HANDS);
  });

  it("VPIP: os soltos entram em muito mais potes que os apertados", () => {
    expect(byId("station").vpip).toBeGreaterThan(byId("nit").vpip);
    expect(byId("recreativo").vpip).toBeGreaterThan(byId("abc").vpip);
  });

  it("3-bet: os agressivos dão bem mais 3-bet que os passivos/tight", () => {
    expect(byId("spewy").threeBet).toBeGreaterThan(byId("station").threeBet);
    expect(byId("lag").threeBet).toBeGreaterThan(byId("nit").threeBet);
  });

  it("PFR ≤ VPIP para todos (não se aumenta mais do que se entra)", () => {
    for (const r of report.byProfile) expect(r.pfr).toBeLessThanOrEqual(r.vpip);
  });

  it("todo VPIP fica numa faixa plausível de 9-max (5%..60%)", () => {
    for (const r of report.byProfile) {
      expect(r.vpip).toBeGreaterThanOrEqual(5);
      expect(r.vpip).toBeLessThanOrEqual(60);
    }
  });

  it("a soma dos resultados (bb/100) é ~0: é um jogo de soma zero entre eles", () => {
    const totalBb = report.byProfile.reduce((s, r) => s + r.bb100, 0);
    // Não é exatamente zero por causa do arredondamento e do rake inexistente,
    // mas deve ficar bem perto.
    expect(Math.abs(totalBb)).toBeLessThan(5);
  });
});

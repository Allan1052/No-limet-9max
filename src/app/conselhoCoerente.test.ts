// ---------------------------------------------------------------------------
// O CONSELHO NÃO PODE BRIGAR COM A MEDIÇÃO.
//
// 🐞 14/09/2026. O Allan fechou um torneio em 4º de 100 e a tela disse:
//   "Você jogou bem apertado (VPIP 14%): sólido, mas dá para roubar mais blinds
//    abrindo um pouco a range em posição."
// Na MESMA tela, as mãos para rever eram quatro aberturas FORA do range (LJ,
// BTN, UTG+1, LJ) e o gráfico por posição marcava LJ e SB como "agressivo
// demais". O app mandou abrir mais justamente onde tinha acabado de medir que
// ele já abria demais.
//
// A causa: o conselho de estilo saía só do VPIP, que conta QUANTAS mãos você
// jogou e não QUAIS.
// ---------------------------------------------------------------------------
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameController } from "./gameController";
import { seededRng } from "../engine/cards";

function comLocalStorage() {
  const store: Record<string, string> = {};
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  });
}

/** Injeta decisões já avaliadas direto na base do comparativo. */
function comDecisoes(g: GameController, aberturasForaDoRange: number, folds: number) {
  const base = (g as any).sessionComparativo as Array<Record<string, unknown>>;
  for (let i = 0; i < aberturasForaDoRange; i++) {
    base.push({ heroFam: "aggro", adviceFam: "fold", kind: "preflop", semDica: true });
  }
  for (let i = 0; i < folds; i++) {
    base.push({ heroFam: "fold", adviceFam: "fold", kind: "preflop", semDica: true });
  }
}

describe("o conselho de estilo olha as aberturas medidas", () => {
  beforeEach(comLocalStorage);

  const montar = (aberturasRuins: number) => {
    const g = new GameController({ rng: seededRng(4242) });
    g.configureTournament({ buyIn: 11, entrants: 100, stage: "inicio" });
    // VPIP baixo, como no torneio do Allan.
    // VPIP = vpip/handsDealt (ver toRow em feedback/stats.ts): 17/121 = 14%.
    const s = (g as any).stats[(g as any).heroSeat];
    s.handsDealt = 121;
    s.vpip = 17;
    s.pfr = 12;
    comDecisoes(g, aberturasRuins, 100);
    return g.tournamentSummary()!;
  };

  it("com aberturas fora do range, NÃO manda abrir mais", () => {
    const sum = montar(4);
    expect(sum.vpip).toBeLessThanOrEqual(15);
    expect(sum.styleNote).not.toMatch(/abrindo um pouco a range|roubar mais blinds/i);
    expect(sum.styleNote).toMatch(/fora do range/i);
    expect(sum.styleNote).toContain("4");
  });

  it("apertado e SEM aberturas fora do range: o conselho de abrir volta a valer", () => {
    const sum = montar(0);
    expect(sum.styleNote).toMatch(/roubar mais blinds/i);
  });

  it("uma única abertura fora do range é ruído, não diagnóstico", () => {
    const sum = montar(1);
    expect(sum.styleNote).toMatch(/roubar mais blinds/i);
  });
});

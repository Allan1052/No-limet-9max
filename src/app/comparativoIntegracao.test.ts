// ---------------------------------------------------------------------------
// O comparativo de fim de torneio sai do MESMO lugar que a nota de cada mão.
// Se essas duas contas divergirem, a tela passa a contar duas histórias.
// ---------------------------------------------------------------------------
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameController } from "./gameController";
import { seededRng } from "../engine/cards";
import { compararComOPadrao, compararComESemDica } from "../tournament/comparativo";

function comLocalStorage() {
  const store: Record<string, string> = {};
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  });
}

/** Joga um torneio de verdade: o herói toma a ação mais barata e os bots agem
 *  pelo `botStep` (sem ele a mão nunca anda e nada é avaliado). */
function jogar(g: GameController, passos: number) {
  g.newHand();
  for (let i = 0; i < passos; i++) {
    if (g.tournamentOver) break;
    if (g.phase === "handOver") {
      g.newHand();
      continue;
    }
    if (g.isHeroTurn()) {
      const la = g.legal();
      g.heroAct(la.canCheck ? { type: "check" } : { type: "fold" });
    } else {
      g.botStep();
    }
  }
}

describe("comparativo alimentado pelo torneio de verdade", () => {
  beforeEach(comLocalStorage);

  it("cada decisão avaliada entra no comparativo — nem uma a mais, nem a menos", () => {
    const g = new GameController({ rng: seededRng(20260914) });
    g.configureTournament({ buyIn: 11, entrants: 100, stage: "inicio" });
    jogar(g, 420);
    const sum = g.tournamentSummary()!;
    const r = sum.ratings;
    const avaliadas = r.boa + r.ok + r.imprecisa + r.ruim;
    expect(sum.comparativo!.length).toBe(avaliadas);
  });

  it("às cegas + com dica = todas as decisões avaliadas", () => {
    const g = new GameController({ rng: seededRng(777) });
    g.configureTournament({ buyIn: 11, entrants: 100, stage: "inicio" });
    g.setDicasLigadas(false); // jogando sozinho
    jogar(g, 260);
    g.setDicasLigadas(true);
    jogar(g, 260);
    const sum = g.tournamentSummary()!;
    const r = sum.ratings;
    const avaliadas = r.boa + r.ok + r.imprecisa + r.ruim;
    expect(sum.semDica!.total + sum.comDica!.total).toBe(avaliadas);
    // E os dois lados aparecem: o torneio teve mãos dos dois jeitos.
    expect(sum.semDica!.total).toBeGreaterThan(0);
  });

  it("o comparativo nunca passa de 100% em nenhum lado", () => {
    const g = new GameController({ rng: seededRng(31415) });
    g.configureTournament({ buyIn: 11, entrants: 100, stage: "inicio" });
    jogar(g, 420);
    const c = compararComOPadrao(g.tournamentSummary()!.comparativo ?? []);
    for (const lado of [c.voce, c.padrao]) {
      expect(lado.fold + lado.call + lado.raise).toBeLessThanOrEqual(101);
      expect(lado.fold + lado.call + lado.raise).toBeGreaterThanOrEqual(c.amostra > 0 ? 99 : 0);
    }
  });

  it("o placar 'às cegas' da tela bate com o do comparativo", () => {
    const g = new GameController({ rng: seededRng(99) });
    g.configureTournament({ buyIn: 11, entrants: 100, stage: "inicio" });
    g.setDicasLigadas(false);
    jogar(g, 320);
    const sum = g.tournamentSummary()!;
    const d = compararComESemDica(
      sum.semDica!.total, sum.semDica!.certas, sum.comDica!.total, sum.comDica!.certas,
    );
    expect(d.semDica.total).toBe(sum.semDica!.total);
    expect(d.semDica.certas).toBe(sum.semDica!.certas);
  });

  it("torneio novo zera o comparativo (senão a conta do próximo vem contaminada)", () => {
    const g = new GameController({ rng: seededRng(5150) });
    g.configureTournament({ buyIn: 11, entrants: 100, stage: "inicio" });
    jogar(g, 260);
    expect(g.tournamentSummary()!.comparativo!.length).toBeGreaterThan(0);
    g.configureTournament({ buyIn: 11, entrants: 100, stage: "inicio" });
    expect(g.tournamentSummary()!.comparativo!.length).toBe(0);
    expect(g.tournamentSummary()!.semDica!.total).toBe(0);
    expect(g.tournamentSummary()!.comDica!.total).toBe(0);
  });
});

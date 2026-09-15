// ---------------------------------------------------------------------------
// A MEMÓRIA TEM DE CHEGAR NOS BOTS — não pode ficar só na frase.
//
// 🐞 15/09/2026, bug meu, pego medindo. A memória entre sessões alimentava
// apenas a leitura falada ("ele te leu"); a adaptação dos bots continuava
// olhando só as estatísticas da sessão em curso. A mesa dizia que te conhecia
// e jogava exatamente igual. Este teste existe para isso não voltar.
// ---------------------------------------------------------------------------
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameController } from "./gameController";
import { seededRng } from "../engine/cards";
import { gravar as gravarMemoria, memoriaVazia } from "../bots/memoriaDaMesa";
import { dossieVazio } from "../bots/leituraDoHeroi";

function comLocalStorage() {
  const store: Record<string, string> = {};
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  });
}

/** Acessa o método privado que entrega a leitura aos bots. */
const leitura = (g: GameController) => (g as any).heroReadForBots();

describe("a memória da mesa chega até os bots", () => {
  beforeEach(comLocalStorage);

  it("sem memória e sem mãos, não há leitura (não se inventa adversário)", () => {
    const g = new GameController({ rng: seededRng(1) });
    g.configureTournament({ buyIn: 11, entrants: 100, stage: "inicio" });
    expect(leitura(g)).toBeUndefined();
  });

  it("com memória de sessões anteriores, os bots JÁ te leem na primeira mão", () => {
    gravarMemoria({
      ...memoriaVazia(),
      dossie: { ...dossieVazio(), maos: 420, vpip: 0.13, pfr: 0.11, threeBet: 0.02 },
      sessoes: 7,
    });
    const g = new GameController({ rng: seededRng(2) });
    g.configureTournament({ buyIn: 11, entrants: 100, stage: "inicio" });
    const r = leitura(g);
    expect(r, "a memória não chegou nos bots").toBeDefined();
    expect(r.hands).toBeGreaterThanOrEqual(420);
    // E é a leitura CERTA: jogador apertado que não 3-beta.
    expect(r.vpip).toBeCloseTo(0.13, 2);
    expect(r.threeBet).toBeCloseTo(0.02, 2);
  });

  it("o dossiê NUNCA estoura o teto, por mais torneios que passem", () => {
    gravarMemoria({
      ...memoriaVazia(),
      dossie: { ...dossieVazio(), maos: 600, flopsComAposta: 200, flopsLargados: 160 },
      sessoes: 40,
    });
    const g = new GameController({ rng: seededRng(3) });
    g.configureTournament({ buyIn: 11, entrants: 100, stage: "inicio" });
    for (let i = 0; i < 40; i++) g.newHand();
    const m = JSON.parse(localStorage.getItem("cof_memoria_mesa")!);
    // Medido antes da correção: chegava a 180.583 mãos em 24 torneios.
    expect(m.dossie.maos).toBeLessThanOrEqual(600);
  });

  it("a sessão de hoje manda quando já tem mãos suficientes", () => {
    gravarMemoria({
      ...memoriaVazia(),
      dossie: { ...dossieVazio(), maos: 500, vpip: 0.12, pfr: 0.10, threeBet: 0.01 },
      sessoes: 9,
    });
    const g = new GameController({ rng: seededRng(4) });
    g.configureTournament({ buyIn: 11, entrants: 100, stage: "inicio" });
    // Jogador de hoje está MUITO mais solto que o do arquivo.
    const st = (g as any).stats[(g as any).heroSeat];
    st.handsDealt = 60;
    st.vpip = 30;
    st.pfr = 22;
    st.threeBetOpp = 20;
    st.threeBet = 4;
    const r = leitura(g);
    expect(r.vpip).toBeCloseTo(0.5, 2);   // 30/60 — o de hoje
    expect(r.hands).toBe(560);            // mas a amostra soma os dois
  });
});

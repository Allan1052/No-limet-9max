// ---------------------------------------------------------------------------
// A MESA NÃO TE ESQUECE — mas também não te prende ao que você era.
// ---------------------------------------------------------------------------
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  carregar, gravar, juntar, memoriaVazia, oQuantoTeConhece, comoAMesaTeVe,
  VALIDADE_DIAS,
} from "./memoriaDaMesa";
import { dossieVazio, type DossieDoHeroi } from "./leituraDoHeroi";

function comLocalStorage() {
  const store: Record<string, string> = {};
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  });
}

const d = (o: Partial<DossieDoHeroi>): DossieDoHeroi => ({ ...dossieVazio(), ...o });
const DIA = 24 * 60 * 60 * 1000;

describe("memória da mesa entre sessões", () => {
  beforeEach(comLocalStorage);

  it("o que a mesa viu hoje sobrevive para amanhã", () => {
    gravar({ dossie: d({ maos: 120, flopsComAposta: 30, flopsLargados: 24 }), sessoes: 2, quando: Date.now() });
    const m = carregar();
    expect(m.dossie.maos).toBe(120);
    expect(m.dossie.flopsLargados).toBe(24);
    expect(m.sessoes).toBe(2);
  });

  it("memória velha demais não conta mais (você já mudou de jogo)", () => {
    const agora = Date.now();
    // Escrito direto no armazenamento: `gravar` sempre carimba AGORA (é o
    // certo — enquanto você joga, a memória não envelhece). O caso real é o
    // aparelho que ficou meses parado com um dossiê antigo dentro.
    localStorage.setItem(
      "cof_memoria_mesa",
      JSON.stringify({ dossie: d({ maos: 300 }), sessoes: 9, quando: agora - (VALIDADE_DIAS + 1) * DIA }),
    );
    expect(carregar(agora).dossie.maos).toBe(0);
    // E a de ontem continua valendo.
    localStorage.setItem(
      "cof_memoria_mesa",
      JSON.stringify({ dossie: d({ maos: 300 }), sessoes: 9, quando: agora - DIA }),
    );
    expect(carregar(agora).dossie.maos).toBe(300);
  });

  it("localStorage quebrado não derruba a mesa", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new Error("bloqueado"); },
      setItem: () => { throw new Error("bloqueado"); },
      removeItem: () => {},
    });
    expect(() => gravar(memoriaVazia())).not.toThrow();
    expect(carregar().dossie.maos).toBe(0);
  });

  it("lixo gravado não vira leitura", () => {
    localStorage.setItem("cof_memoria_mesa", "{\"nada\":1}");
    expect(carregar().dossie.maos).toBe(0);
    localStorage.setItem("cof_memoria_mesa", "isso não é json");
    expect(carregar().dossie.maos).toBe(0);
  });
});

describe("juntar sessão com o que a mesa já sabia", () => {
  it("as observações somam", () => {
    const j = juntar(
      d({ maos: 100, flopsComAposta: 20, flopsLargados: 15 }),
      d({ maos: 50, flopsComAposta: 10, flopsLargados: 4 }),
    );
    expect(j.maos).toBe(150);
    expect(j.flopsComAposta).toBe(30);
    expect(j.flopsLargados).toBe(19);
  });

  it("as frequências da sessão de HOJE mandam nas de pré-flop", () => {
    const j = juntar(d({ maos: 200, vpip: 0.12 }), d({ maos: 40, vpip: 0.30 }));
    expect(j.vpip).toBe(0.30);
  });

  it("sessão vazia não apaga o que a mesa sabia", () => {
    const j = juntar(d({ maos: 200, vpip: 0.22, pfr: 0.18 }), dossieVazio());
    expect(j.vpip).toBe(0.22);
    expect(j.pfr).toBe(0.18);
  });

  it("⚠️ passando do teto, o passado PERDE peso — quem corrige o vazamento é lido de novo", () => {
    // Um jogador que largava tudo por 600 mãos e passou a defender.
    const velho = d({ maos: 600, flopsComAposta: 200, flopsLargados: 180 });
    const hoje = d({ maos: 200, flopsComAposta: 60, flopsLargados: 6 });
    const j = juntar(velho, hoje);
    expect(j.maos).toBe(600); // teto
    const taxa = j.flopsLargados / j.flopsComAposta;
    // A taxa junta os dois períodos, mas o dossiê não cresce sem fim: a cada
    // nova sessão o passado vale proporcionalmente menos.
    expect(taxa).toBeLessThan(180 / 200);
    expect(taxa).toBeGreaterThan(6 / 60);
    const j2 = juntar(j, hoje);
    expect(j2.flopsLargados / j2.flopsComAposta).toBeLessThan(taxa);
  });
});

describe("o quanto a mesa te conhece", () => {
  it("cresce com as mãos e satura", () => {
    expect(oQuantoTeConhece(d({ maos: 0 }))).toBe(0);
    expect(oQuantoTeConhece(d({ maos: 150 }))).toBeCloseTo(0.5, 2);
    expect(oQuantoTeConhece(d({ maos: 300 }))).toBe(1);
    expect(oQuantoTeConhece(d({ maos: 5000 }))).toBe(1);
  });

  it("a frase acompanha o estágio e nunca mente sobre a amostra", () => {
    expect(comoAMesaTeVe({ dossie: d({ maos: 5 }), sessoes: 1, quando: 0 })).toMatch(/ainda não te conhece/i);
    expect(comoAMesaTeVe({ dossie: d({ maos: 80 }), sessoes: 2, quando: 0 })).toContain("80 mãos");
    const cheia = comoAMesaTeVe({ dossie: d({ maos: 400 }), sessoes: 6, quando: 0 });
    expect(cheia).toMatch(/te conhece bem/i);
    expect(cheia).toContain("6 sessões");
  });
});

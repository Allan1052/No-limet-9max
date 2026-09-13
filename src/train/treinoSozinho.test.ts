import { describe, expect, it, vi, beforeEach } from "vitest";
import { seededRng } from "../engine/cards";
import { criarTreinoPorProfundidade } from "./leakTraining";
import { treinoParaBalde } from "./treinoSozinho";

describe("do diagnóstico sozinho para o treino", () => {
  it("cada faixa de stack vira um drill NAQUELA profundidade", () => {
    const casos: [string, number][] = [
      ["stk_curto", 9], ["stk_1020", 16], ["stk_2040", 30], ["stk_fundo", 55],
    ];
    for (const [id, bb] of casos) {
      const a = treinoParaBalde(id)!;
      expect(a.tipo).toBe("drill");
      expect(a.tipo === "drill" && a.effectiveBB).toBe(bb);
    }
  });

  it("a profundidade é o MEIO da faixa, não a borda fácil", () => {
    // "≤12bb" treinando 12bb pegaria só o caso mais confortável da faixa.
    const a = treinoParaBalde("stk_curto")!;
    expect(a.tipo === "drill" && a.effectiveBB).toBeLessThan(12);
  });

  it("bolha e mesa final vão para o treino PRÓPRIO deles (que tem ICM)", () => {
    expect(treinoParaBalde("stg_bolha")!.tipo).toBe("mesaFinal");
    expect(treinoParaBalde("stg_mesa_final")!.tipo).toBe("mesaFinal");
  });

  it("SEM ALVO, SEM BOTÃO: o que não dá para treinar direito devolve null", () => {
    // "treine pré-flop" não é alvo — é o app inteiro.
    for (const id of ["rua_pre", "rua_pos", "stg_inicio", "stg_meio", "inventado"]) {
      expect(treinoParaBalde(id), `${id} não deveria virar treino`).toBeNull();
    }
  });

  it("todo alvo traz uma frase de foco para a tela mostrar", () => {
    for (const id of ["stk_curto", "stk_fundo", "stg_bolha"]) {
      expect(treinoParaBalde(id)!.foco.length).toBeGreaterThan(20);
    }
  });
});

describe("o drill gerado é mesmo da profundidade pedida", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    });
  });

  it("todas as mãos saem no stack do alvo", () => {
    const s = criarTreinoPorProfundidade(9, 12, seededRng(7))!;
    expect(s.hands).toHaveLength(12);
    for (const h of s.hands) expect(h.spot.effectiveBB).toBe(9);
  });

  it("mistura posições (não treina um spot só)", () => {
    const s = criarTreinoPorProfundidade(30, 24, seededRng(3))!;
    const posicoes = new Set(s.hands.map((h) => h.spot.heroPosition));
    expect(posicoes.size).toBeGreaterThan(1);
  });

  it("é uma sessão de drill normal — o fluxo existente continua servindo", () => {
    const s = criarTreinoPorProfundidade(16, 5, seededRng(1))!;
    expect(s.currentIndex).toBe(0);
    expect(s.correctCount).toBe(0);
    expect(s.done).toBe(false);
    for (const h of s.hands) expect(h.advice?.action).toBeTruthy();
  });

  it("profundidade inválida não vira treino", () => {
    expect(criarTreinoPorProfundidade(0)).toBeNull();
    expect(criarTreinoPorProfundidade(NaN)).toBeNull();
  });
});

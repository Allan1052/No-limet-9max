import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AMOSTRA_MINIMA,
  lerPlacarSozinho,
  registrarDecisao,
  relatorioSozinho,
  zerarPlacarSozinho,
} from "./soloMode";

function encher(semDica: boolean, total: number, certas: number) {
  for (let i = 0; i < total; i++) registrarDecisao(semDica, i < certas);
}

describe("placar do Jogar sozinho", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    });
    zerarPlacarSozinho();
  });

  it("começa zerado e sem número nenhum", () => {
    const r = relatorioSozinho();
    expect(r.totalSozinho).toBe(0);
    expect(r.acertoSozinho).toBeNull();
    expect(r.amostraSuficiente).toBe(false);
    expect(r.faltam).toBe(AMOSTRA_MINIMA);
  });

  it("SEM AMOSTRA, SEM NÚMERO: um lance abaixo do mínimo ainda não vira %", () => {
    encher(true, AMOSTRA_MINIMA - 1, AMOSTRA_MINIMA - 1);
    const r = relatorioSozinho();
    expect(r.acertoSozinho).toBeNull();
    expect(r.faltam).toBe(1);
    // 100% de 29 acertos seria o número mais bonito e mais enganoso do app.
  });

  it("fechada a amostra, o número aparece", () => {
    encher(true, AMOSTRA_MINIMA, Math.round(AMOSTRA_MINIMA * 0.6));
    const r = relatorioSozinho();
    expect(r.amostraSuficiente).toBe(true);
    expect(r.acertoSozinho).toBe(60);
    expect(r.faltam).toBe(0);
  });

  it("separa os dois lados — é a razão de este módulo existir", () => {
    encher(false, 40, 36); // com dica: 90%
    encher(true, 40, 24); // sozinho: 60%
    const r = relatorioSozinho();
    expect(r.acertoComDica).toBe(90);
    expect(r.acertoSozinho).toBe(60);
    expect(r.distancia).toBe(30); // a dica está carregando 30 pontos
  });

  it("não compara com o nada: sem um dos lados, a distância é null", () => {
    encher(true, AMOSTRA_MINIMA, 20);
    const r = relatorioSozinho();
    expect(r.acertoSozinho).not.toBeNull();
    expect(r.acertoComDica).toBeNull();
    expect(r.distancia).toBeNull();
  });

  it("o placar sobrevive entre sessões (fica guardado no aparelho)", () => {
    encher(true, 5, 3);
    expect(lerPlacarSozinho().sozinho).toEqual({ total: 5, certas: 3 });
  });

  it("dado corrompido no aparelho não vira número na tela", () => {
    localStorage.setItem("cof-sozinho-v1", "{isso não é json");
    expect(lerPlacarSozinho()).toEqual({
      sozinho: { total: 0, certas: 0 },
      comDica: { total: 0, certas: 0 },
    });
    localStorage.setItem("cof-sozinho-v1", JSON.stringify({ sozinho: "xx" }));
    expect(relatorioSozinho().acertoSozinho).toBeNull();
  });

  it("distância zero significa que você já joga como joga com ajuda", () => {
    encher(false, 50, 35);
    encher(true, 50, 35);
    expect(relatorioSozinho().distancia).toBe(0);
  });
});

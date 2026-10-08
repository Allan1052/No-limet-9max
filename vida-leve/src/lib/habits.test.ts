import { describe, expect, it } from "vitest";
import { CATALOGO, gerarMissoesDoDia, nivelDaMissao } from "./habits";
import type { Rotina } from "./types";

const base: Rotina = { transporte: "onibus", horas_sentado: 8, sobe_escadas: false, pratica_atividade: false };
const ids = (r: Rotina, data = "2026-10-08", conclusoes = {}, ontem: string[] = []) =>
  gerarMissoesDoDia(r, data, "semente", conclusoes, ontem).map((m) => m.missao_id);

describe("gerarMissoesDoDia", () => {
  it("5 missões, sem repetição, com uma de transporte compatível", () => {
    const m = gerarMissoesDoDia(base, "2026-10-08", "semente");
    expect(m).toHaveLength(5);
    expect(new Set(m.map((x) => x.missao_id)).size).toBe(5);
    expect(m[0]!.missao_id).toBe("descer_ponto");
  });

  it("é determinístico: mesmo dia → mesmas missões", () => {
    expect(ids(base)).toEqual(ids(base));
  });

  it("muda ao longo dos dias", () => {
    const dias = Array.from({ length: 14 }, (_, i) => `2026-10-${String(i + 1).padStart(2, "0")}`);
    const conjuntos = new Set(dias.map((d) => ids(base, d).join(",")));
    expect(conjuntos.size).toBeGreaterThan(5);
  });

  it("só sorteia missões que servem para a rotina", () => {
    for (let d = 1; d <= 28; d++) {
      const r: Rotina = { transporte: "carro", horas_sentado: 1, sobe_escadas: true, pratica_atividade: false };
      const sorteadas = ids(r, `2026-10-${String(d).padStart(2, "0")}`);
      expect(sorteadas).not.toContain("descer_ponto");
      expect(sorteadas).not.toContain("pular_corda");
      expect(sorteadas).not.toContain("pausa_sentado");
    }
  });

  it("evita repetir as missões de ontem quando há alternativa", () => {
    const hoje = ids(base, "2026-10-08");
    const amanha = ids(base, "2026-10-09", {}, hoje);
    const movimentoHoje = hoje[1]!;
    expect(amanha[1]).not.toBe(movimentoHoje);
  });

  it("todas as missões do catálogo têm id único", () => {
    expect(new Set(CATALOGO.map((m) => m.id)).size).toBe(CATALOGO.length);
  });
});

describe("progressão de nível", () => {
  it("sobe 1 nível a cada 5 conclusões, até o nível 4", () => {
    expect(nivelDaMissao(0)).toBe(1);
    expect(nivelDaMissao(4)).toBe(1);
    expect(nivelDaMissao(5)).toBe(2);
    expect(nivelDaMissao(15)).toBe(4);
    expect(nivelDaMissao(99)).toBe(4);
  });

  it("caminhada fica mais longa conforme o nível", () => {
    const caminhada = CATALOGO.find((m) => m.id === "caminhada_rapida")!;
    expect(caminhada.texto(1, base)).toMatch(/^15 minutos/);
    expect(caminhada.texto(4, base)).toMatch(/^30 minutos/);
  });

  it("o nível vem do histórico de conclusões", () => {
    const m = gerarMissoesDoDia(base, "2026-10-08", "semente", { descer_ponto: 12 });
    expect(m[0]).toMatchObject({ missao_id: "descer_ponto", nivel: 3 });
    expect(m[0]!.descricao_habito).toMatch(/2 pontos/);
  });
});

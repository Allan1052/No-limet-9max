import { describe, expect, it } from "vitest";
import { estaConcluidaHoje, gerarMissoes } from "./habits";
import type { Rotina } from "./types";

const base: Rotina = { transporte: "onibus", horas_sentado: 8, sobe_escadas: false, pratica_atividade: false };
const textos = (r: Rotina) => gerarMissoes(r).map((m) => m.descricao_habito);

describe("gerarMissoes", () => {
  it("ônibus → descer 1 ponto antes", () => {
    expect(textos(base)).toContain("Descer 1 ponto antes e caminhar o resto do trajeto");
  });

  it("muito tempo sentado → pausa a cada hora", () => {
    expect(textos(base)).toContain("Levantar e andar 5 minutos a cada hora sentado");
    expect(textos({ ...base, horas_sentado: 1 }).some((t) => t.includes("sentado"))).toBe(false);
  });

  it("sedentário → caminhada rápida; ativo → pular corda", () => {
    expect(textos(base)).toContain("15 minutos de caminhada rápida");
    expect(textos({ ...base, pratica_atividade: true })).toContain(
      "10 minutos pulando corda (ou intervalado) além do treino",
    );
  });

  it("home office tem missão própria de transporte", () => {
    expect(textos({ ...base, transporte: "home_office" })[0]).toMatch(/antes de começar o expediente/);
  });

  it("não gera missões duplicadas", () => {
    const t = textos(base);
    expect(new Set(t).size).toBe(t.length);
  });
});

describe("estaConcluidaHoje", () => {
  it("só vale se a conclusão foi no dia de hoje", () => {
    expect(estaConcluidaHoje({ concluido_hoje: true, data_conclusao: "2026-10-08" }, "2026-10-08")).toBe(true);
    expect(estaConcluidaHoje({ concluido_hoje: true, data_conclusao: "2026-10-07" }, "2026-10-08")).toBe(false);
    expect(estaConcluidaHoje({ concluido_hoje: false, data_conclusao: "2026-10-08" }, "2026-10-08")).toBe(false);
  });
});

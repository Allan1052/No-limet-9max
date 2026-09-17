import { describe, expect, it } from "vitest";
import {
  CAMADAS_NA_MESA, camadasEmOrdem, construirCamadas, ORDEM_DAS_CAMADAS,
  type CamadasView, type FonteCamadas,
} from "./coachCamadas";

// Uma mão cheia de informação: o motor provou tudo que sabe provar.
const MAO_RICA: FonteCamadas = {
  equity: 0.44, requiredEquity: 0.40, villainRangePct: 0.28, topoRangePct: 0.12,
  icmDelta: { comIcm: "fold", semIcm: "call" },
  breakEvenCallBB: 8, adviceFam: "fold", outs: { outs: 9, chance: 0.35 },
  potBB: 12, toCallBB: 5, oponentes: 1,
  mapa: { heroBB: 31, cobre: 5, cobertoPor: 1, menorBB: 7, shorts: 1,
          aindaFalam: 2, vivos: 7, maiorDaMesa: false, menorDaMesa: false },
};

describe("torneio curto, review completo", () => {
  it("na mesa o coach fala pouco", () => {
    const v = construirCamadas(MAO_RICA, "simple", "aoVivo");
    expect(camadasEmOrdem(v, "curta").length).toBe(CAMADAS_NA_MESA);
  });

  it("no review ele abre tudo que provou", () => {
    const v = construirCamadas(MAO_RICA, "simple", "posMao");
    const completa = camadasEmOrdem(v, "completa");
    expect(completa.length).toBeGreaterThan(CAMADAS_NA_MESA);
  });

  it("o review é SUPERCONJUNTO da mesa — nada some ao aprofundar", () => {
    const v = construirCamadas(MAO_RICA, "simple", "posMao");
    const curta = camadasEmOrdem(v, "curta");
    const completa = camadasEmOrdem(v, "completa");
    const chavesCompletas = completa.map((c) => c.chave);
    for (const c of curta) expect(chavesCompletas).toContain(c.chave);
  });

  it("o ICM que virou a decisão vem primeiro — é o que mais importa", () => {
    const v = construirCamadas(MAO_RICA, "simple", "aoVivo");
    expect(camadasEmOrdem(v, "curta")[0].texto).toBe(v.pesoDaBolha);
  });

  it("sem ICM, o mapa da mesa assume a frente", () => {
    const semIcm = { ...MAO_RICA, icmDelta: undefined };
    const v = construirCamadas(semIcm, "simple", "aoVivo");
    expect(camadasEmOrdem(v, "curta")[0].texto).toBe(v.mapaDaMesa);
  });
});

describe("a profundidade não inventa nada", () => {
  it("mão pobre em dados não ganha frase por estar no review", () => {
    const v = construirCamadas({} as FonteCamadas, "simple", "posMao");
    expect(camadasEmOrdem(v, "completa")).toEqual([]);
    expect(camadasEmOrdem(v, "curta")).toEqual([]);
  });

  it("toda camada tem rótulo", () => {
    const v = construirCamadas(MAO_RICA, "simple", "posMao");
    for (const c of camadasEmOrdem(v, "completa")) {
      expect(c.rotulo.length).toBeGreaterThan(0);
    }
  });

  it("toda camada da view está na ordem — nenhuma frase fica órfã", () => {
    const v = construirCamadas(MAO_RICA, "simple", "posMao");
    const naView = (Object.keys(v) as (keyof CamadasView)[])
      .filter((k) => typeof v[k] === "string" && (v[k] as string).length > 0);
    for (const k of naView) expect(ORDEM_DAS_CAMADAS).toContain(k);
  });

  it("a ordem não tem repetidas", () => {
    expect(new Set(ORDEM_DAS_CAMADAS).size).toBe(ORDEM_DAS_CAMADAS.length);
  });
});

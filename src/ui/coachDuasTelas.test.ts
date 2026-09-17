import { describe, expect, it } from "vitest";
import { buildCoachV2PostHandDecision } from "./coachV2PostHand";
import { camadasEmOrdem, construirCamadas, CAMADAS_NA_MESA, type FonteCamadas } from "./coachCamadas";
import type { FeedbackItem } from "../feedback/analyzer";

const MAO: FeedbackItem = {
  street: "Flop", heroAction: "Call", advice: "Fold", rating: "imprecisa",
  text: "Você pagou caro demais.",
  equity: 0.31, potOdds: 0.40, villainRangePct: 0.22, topoRangePct: 0.14,
  breakEvenCallBB: 4, adviceFam: "fold", heroFam: "call",
  outs: { outs: 8, chance: 0.31 },
  icmDelta: { comIcm: "fold", semIcm: "call" },
  importancia: { nivel: "excepcional", sinais: ["icmVirou", "errouAFamilia"] },
};

describe("a mesa fala pouco, o review fala tudo", () => {
  it("o review devolve as camadas já ordenadas", () => {
    const v = buildCoachV2PostHandDecision(MAO, "simple");
    expect(v.camadasCompletas).toBeDefined();
    expect(v.camadasCompletas!.length).toBeGreaterThan(CAMADAS_NA_MESA);
  });

  it("no review, a primeira camada é a que mais decidiu", () => {
    const v = buildCoachV2PostHandDecision(MAO, "simple");
    expect(v.camadasCompletas![0].chave).toBe("pesoDaBolha");
  });

  it("toda camada do review tem rótulo e texto", () => {
    const v = buildCoachV2PostHandDecision(MAO, "simple");
    for (const c of v.camadasCompletas!) {
      expect(c.rotulo.length).toBeGreaterThan(0);
      expect(c.texto.length).toBeGreaterThan(0);
    }
  });

  it("a mesa mostra no máximo duas camadas da MESMA fonte", () => {
    const fonte: FonteCamadas = {
      equity: 0.31, requiredEquity: 0.40, villainRangePct: 0.22,
      icmDelta: { comIcm: "fold", semIcm: "call" }, potBB: 10, toCallBB: 4,
      mapa: { heroBB: 20, cobre: 3, cobertoPor: 2, menorBB: 6, shorts: 1,
              aindaFalam: 1, vivos: 6, maiorDaMesa: false, menorDaMesa: false },
    };
    const v = construirCamadas(fonte, "simple", "aoVivo");
    expect(camadasEmOrdem(v, "curta").length).toBe(CAMADAS_NA_MESA);
    expect(camadasEmOrdem(v, "completa").length).toBeGreaterThan(CAMADAS_NA_MESA);
  });

  it("a marca de review vem da régua de importância, não de palpite", () => {
    expect(buildCoachV2PostHandDecision(MAO, "simple").importancia?.nivel).toBe("excepcional");
    const simples = { ...MAO, importancia: { nivel: "obvia" as const, sinais: [] } };
    expect(buildCoachV2PostHandDecision(simples, "simple").importancia?.nivel).toBe("obvia");
  });

  it("mão sem dado não ganha camada nenhuma em nenhuma das telas", () => {
    const vazio: FeedbackItem = {
      street: "Pré-flop", heroAction: "Fold", advice: "Fold", rating: "boa", text: "Fold.",
    };
    const v = buildCoachV2PostHandDecision(vazio, "simple");
    expect(v.camadasCompletas).toEqual([]);
  });
});

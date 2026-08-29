import { describe, expect, it } from "vitest";
import { buildWeakSpotRecommendation } from "./weakSpotRecommendation";

describe("Etapa 5 — recomendação de treino por ponto fraco", () => {
  it("prioriza o vazamento mais grave e limita a dois focos", () => {
    const recommendation = buildWeakSpotRecommendation([
      { id: "loose_preflop", title: "Entrando com mãos demais", count: 5, badCount: 2, severity: 8 },
      { id: "tight_preflop", title: "Foldando mãos jogáveis", count: 4, badCount: 1, severity: 6 },
      { id: "passive_preflop", title: "Passividade pré-flop", count: 2, badCount: 0, severity: 3 },
    ]);

    expect(recommendation?.primary.id).toBe("loose_preflop");
    expect(recommendation?.secondary?.id).toBe("tight_preflop");
    expect(recommendation?.label).toContain("Treino recomendado");
  });

  it("não inventa recomendação sem vazamento recorrente", () => {
    expect(buildWeakSpotRecommendation([])).toBeNull();
  });
});

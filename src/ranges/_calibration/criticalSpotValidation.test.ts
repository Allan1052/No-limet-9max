import { describe, expect, it } from "vitest";
import { runCriticalSpotValidation } from "./criticalSpotValidation";

describe("Etapa 6 — validação sistemática dos spots críticos", () => {
  const report = runCriticalSpotValidation();

  it("separa os 61 spots existentes por família crítica e mantém o piso de confiança", () => {
    expect(report.total).toBe(61);
    expect(report.categories.map((c) => c.id)).toEqual([
      "rfi_deep",
      "push_fold",
      "defend_vs_open",
      "vs_3bet",
    ]);
    for (const category of report.categories) {
      expect(category.total).toBeGreaterThan(0);
      expect(category.score).toBeGreaterThanOrEqual(0.95);
    }
  });

  it("declara explicitamente o que ainda não tem referência independente suficiente", () => {
    expect(report.coverage).toBe("partial");
    expect(report.uncovered).toContain("ICM de bolha e mesa final");
    expect(report.disclaimer).toContain("não é certificação externa");
  });
});

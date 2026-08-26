import { describe, it, expect } from "vitest";
import { buildSessionDiagnosis, MIN_SAMPLE } from "./sessionDiagnosis";
import type { SessionReport } from "./analyzeSession";

// Bug da auditoria: uma mão importada recebia "94/100 — Excelente" com 100% de
// VPIP/PFR/precisão. Abaixo do piso de amostra, a nota grande não deve aparecer.
function report(evaluated: number, boa: number): SessionReport {
  return {
    totalHands: evaluated,
    evaluated,
    vpip: 100,
    pfr: 100,
    counts: { boa, ok: 0, imprecisa: 0, ruim: 0 } as SessionReport["counts"],
    hands: [],
    leaks: [],
  };
}

describe("diagnóstico — piso de amostra mínima", () => {
  it("1 mão perfeita NÃO vira 'Excelente' — marca amostra insuficiente", () => {
    const d = buildSessionDiagnosis(report(1, 1));
    expect(d.insufficientSample).toBe(true);
    expect(d.grade).toBe("Amostra insuficiente");
    expect(d.grade).not.toBe("Excelente");
    expect(d.headline).toMatch(/importe|mín\. 20|confiável/i);
    expect(d.minSample).toBe(MIN_SAMPLE);
  });

  it("logo abaixo do piso ainda é insuficiente", () => {
    expect(buildSessionDiagnosis(report(MIN_SAMPLE - 1, MIN_SAMPLE - 1)).insufficientSample).toBe(true);
  });

  it("no piso ou acima, a nota volta a valer", () => {
    const d = buildSessionDiagnosis(report(MIN_SAMPLE, MIN_SAMPLE));
    expect(d.insufficientSample).toBe(false);
    expect(d.grade).not.toBe("Amostra insuficiente");
    expect(d.score).toBeGreaterThan(0);
  });
});

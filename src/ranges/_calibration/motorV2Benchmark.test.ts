import { describe, expect, it } from "vitest";
import { runMotorV2Benchmark } from "./motorV2Benchmark";

describe("Motor V2 — benchmark comparativo interno", () => {
  it("preserva integralmente o banco crítico pré-flop existente", () => {
    const report = runMotorV2Benchmark();
    expect(report.preflop.total).toBe(61);
    expect(report.preflop.matched).toBe(61);
  });

  it("registra diferenças reais do V2 contra referências legadas de sizing e range", () => {
    const report = runMotorV2Benchmark();
    expect(report.deltas.sizingSprResponsive).toBe(true);
    expect(report.deltas.actionLineResponsive).toBe(true);
    expect(report.deltas.incrementalIcmAvailable).toBe(true);
  });

  it("é determinístico e deixa explícito que não é solver/GTO certificado", () => {
    const a = runMotorV2Benchmark();
    const b = runMotorV2Benchmark();
    expect(a).toEqual(b);
    expect(a.integrity.deterministic).toBe(true);
    expect(a.integrity.usesHiddenHeroKnowledge).toBe(false);
    expect(a.disclaimer.toLowerCase()).toContain("não é certificação");
  });
});

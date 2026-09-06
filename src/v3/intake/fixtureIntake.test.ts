import { describe, expect, it } from "vitest";
import { validateCertifiedFixture, isCertifiedFixtureValid } from "./fixtureIntake";
import type { ExternalBenchmarkFixture } from "../benchmarks/types";
import { BLIND_WAR_BENCHMARKS } from "../benchmarks/blindWar";
import { BLIND_BATTLE_HAND_FIXTURES } from "../benchmarks/blindBattleHands";

// O molde/validador cobre o schema PRÉ-FLOP (ExternalBenchmarkFixture) — que é o
// que dirige o live. Blind War + a biblioteca de fixtures mão-a-mão (alimentada
// pelo ChatGPT via o molde) usam esse schema. As famílias pós-flop têm schema
// próprio (trilha #4, mais pra frente).
const PREFLOP_FIXTURES: ExternalBenchmarkFixture[] = [
  ...BLIND_WAR_BENCHMARKS,
  ...BLIND_BATTLE_HAND_FIXTURES,
];

const bw5 = BLIND_WAR_BENCHMARKS.find((f) => f.id === "BW5")!;

describe("Validador de transcrição V3 — os fixtures REAIS passam", () => {
  it("todos os fixtures pré-flop certificados são válidos (sem falso positivo)", () => {
    for (const fixture of PREFLOP_FIXTURES) {
      const errors = validateCertifiedFixture(fixture);
      expect(errors, `${fixture.id}: ${errors.join(" | ")}`).toEqual([]);
    }
  });
});

describe("Validador de transcrição V3 — pega transcrição RUIM", () => {
  it("frequências globais que não somam 1", () => {
    const bad: ExternalBenchmarkFixture = { ...bw5, id: "BAD_SUM", actionFreq: { raise: 0.5, fold: 0.2 } };
    expect(validateCertifiedFixture(bad).some((e) => e.includes("somam"))).toBe(true);
  });

  it("mão-a-mão com mão inexistente", () => {
    const bad: ExternalBenchmarkFixture = {
      ...bw5,
      id: "BAD_HAND",
      handActionFreq: { ...bw5.handActionFreq, ZZ9: { fold: 1 } },
    };
    expect(validateCertifiedFixture(bad).some((e) => e.includes("mão inválida"))).toBe(true);
  });

  it("mão-a-mão cuja mistura não soma 1", () => {
    const bad: ExternalBenchmarkFixture = {
      ...bw5,
      id: "BAD_HANDMIX",
      handActionFreq: { A5s: { raise: 0.4, call: 0.2 } },
    };
    expect(validateCertifiedFixture(bad).some((e) => e.includes("A5s"))).toBe(true);
  });

  it("CERTIFICADO sem evidência rastreável", () => {
    const bad: ExternalBenchmarkFixture = {
      ...bw5,
      id: "BAD_EVIDENCE",
      evidence: { level: "CERTIFIED", solver: "GTO_WIZARD" },
    };
    expect(validateCertifiedFixture(bad).some((e) => e.includes("evidence"))).toBe(true);
  });

  it("raise com sizing <= 1bb (incremento em vez de total)", () => {
    const bad: ExternalBenchmarkFixture = {
      ...bw5,
      id: "BAD_SIZE",
      actionSizing: { raise: [{ sizeBB: 1, freq: 1 }] },
    };
    expect(validateCertifiedFixture(bad).some((e) => e.includes("raise"))).toBe(true);
  });

  it("contexto sem stack de uma posição listada", () => {
    const bad: ExternalBenchmarkFixture = {
      ...bw5,
      id: "BAD_CTX",
      context: { ...bw5.context, stacksBB: { SB: 40 } },
    };
    expect(validateCertifiedFixture(bad).some((e) => e.includes("stacksBB"))).toBe(true);
  });

  it("um fixture válido passa pelo atalho isCertifiedFixtureValid", () => {
    expect(isCertifiedFixtureValid(bw5)).toBe(true);
  });
});

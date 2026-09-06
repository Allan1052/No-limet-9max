import { describe, expect, it } from "vitest";
import { validateCertifiedFixture, isCertifiedFixtureValid, assessLiveReadiness } from "./fixtureIntake";
import type { ExternalBenchmarkFixture } from "../benchmarks/types";
import { BLIND_WAR_BENCHMARKS } from "../benchmarks/blindWar";
import { BLIND_BATTLE_HAND_FIXTURES } from "../benchmarks/blindBattleHands";
import { ICM_SHORT_STACK_FIXTURES } from "../benchmarks/icmShortStack";
import { EVIDENCE_BANK } from "../benchmarks/evidenceBank";

// O molde/validador cobre o schema PRÉ-FLOP (ExternalBenchmarkFixture) — que é o
// que dirige o live. Blind War + a biblioteca de fixtures mão-a-mão (alimentada
// pelo ChatGPT via o molde) usam esse schema. As famílias pós-flop têm schema
// próprio (trilha #4, mais pra frente).
const PREFLOP_FIXTURES: ExternalBenchmarkFixture[] = [
  ...BLIND_WAR_BENCHMARKS,
  ...BLIND_BATTLE_HAND_FIXTURES,
  ...ICM_SHORT_STACK_FIXTURES,
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

  it("stack inválido (<= 0) numa posição é malformado", () => {
    const bad: ExternalBenchmarkFixture = {
      ...bw5,
      id: "BAD_CTX",
      context: { ...bw5.context, stacksBB: { SB: 40, BB: 0 } },
    };
    expect(validateCertifiedFixture(bad).some((e) => e.includes("stacksBB"))).toBe(true);
  });

  it("um fixture válido passa pelo atalho isCertifiedFixtureValid", () => {
    expect(isCertifiedFixtureValid(bw5)).toBe(true);
  });

  it("barra global PARCIAL (só shove 12%) é malformada — vai pra notes, não pra actionFreq", () => {
    const bad: ExternalBenchmarkFixture = { ...bw5, id: "PARTIAL", actionFreq: { shove: 0.12 } };
    expect(validateCertifiedFixture(bad).some((e) => e.includes("somam"))).toBe(true);
  });
});

describe("Dois níveis: evidência × pronto-pro-live", () => {
  it("o banco de evidências é BEM-FORMADO mas EVIDENCE_ONLY (não dirige o live)", () => {
    for (const f of EVIDENCE_BANK) {
      expect(validateCertifiedFixture(f), `${f.id}: bem-formado`).toEqual([]);
      expect(assessLiveReadiness(f).readiness, `${f.id}: prontidão`).toBe("EVIDENCE_ONLY");
    }
  });

  it("BUB3 (tem células puras + stacks completos) é LIVE_READY", () => {
    const bub3 = BLIND_BATTLE_HAND_FIXTURES.find((f) => f.id === "BUB3_LJ8_VS_UTG1_SHOVE")!;
    expect(assessLiveReadiness(bub3).readiness).toBe("LIVE_READY");
  });

  it("contexto incompleto (falta stack de uma posição) NÃO é live-ready", () => {
    const bub4 = EVIDENCE_BANK.find((f) => f.id === "BUB4_HJ8_VS_OPEN")!;
    const r = assessLiveReadiness(bub4);
    expect(r.readiness).toBe("EVIDENCE_ONLY");
    expect(r.blockers.some((b) => b.includes("contexto incompleto"))).toBe(true);
  });
});

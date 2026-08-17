import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createLeakDrillSession,
  planForLeak,
  recordLeakTraining,
  leakTrainingTrend,
  loadLeakTraining,
} from "./leakTraining";
import { seededRng } from "../engine/cards";

// família da ação (mesma regra do módulo, pré-flop sem "check")
const fam = (a: string) => (a === "fold" ? "fold" : a === "call" ? "call" : "aggro");

describe("leakTraining — drill dirigido ao vazamento", () => {
  it("todo spot gerado tem a jogada certa NA família-alvo do vazamento", () => {
    for (const leakId of ["tight_preflop", "loose_preflop", "passive_preflop", "overaggro_preflop"]) {
      const plan = planForLeak(leakId)!;
      const s = createLeakDrillSession(leakId, 12, seededRng(42));
      expect(s).not.toBeNull();
      expect(s!.hands.length).toBe(12);
      for (const h of s!.hands) {
        // cada mão é EXATAMENTE um spot onde o certo é a família que o jogador erra
        expect(plan.targetFams).toContain(fam(h.advice.action));
      }
    }
  });

  it("tight_preflop treina só spots de continuar (nunca fold como certo)", () => {
    const s = createLeakDrillSession("tight_preflop", 15, seededRng(7))!;
    for (const h of s.hands) expect(h.advice.action).not.toBe("fold");
  });

  it("loose_preflop treina só spots onde o certo é foldar", () => {
    const s = createLeakDrillSession("loose_preflop", 15, seededRng(9))!;
    for (const h of s.hands) expect(h.advice.action).toBe("fold");
  });

  it("vazamento de pós-flop não gera drill pré-flop (vai pro treino de ruas)", () => {
    expect(createLeakDrillSession("loose_call_postflop")).toBeNull();
    expect(createLeakDrillSession("missed_value_postflop")).toBeNull();
  });

  it("id desconhecido devolve null (sem quebrar a UI)", () => {
    expect(createLeakDrillSession("nao_existe")).toBeNull();
    expect(planForLeak("nao_existe")).toBeNull();
  });
});

describe("leakTraining — evolução (localStorage)", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    });
  });

  it("mede a curva primeira→última rodada", () => {
    recordLeakTraining("tight_preflop", 45);
    recordLeakTraining("tight_preflop", 60);
    recordLeakTraining("tight_preflop", 82);
    const t = leakTrainingTrend("tight_preflop")!;
    expect(t.attempts).toBe(3);
    expect(t.first).toBe(45);
    expect(t.last).toBe(82);
    expect(t.best).toBe(82);
    expect(t.delta).toBe(37);
    expect(t.improved).toBe(true); // 2+ rodadas e última >=75%
  });

  it("uma rodada fraca não conta como corrigido", () => {
    recordLeakTraining("loose_preflop", 50);
    const t = leakTrainingTrend("loose_preflop")!;
    expect(t.attempts).toBe(1);
    expect(t.improved).toBe(false);
  });

  it("vazamento nunca treinado não tem curva", () => {
    expect(leakTrainingTrend("passive_preflop")).toBeNull();
    expect(loadLeakTraining()).toEqual({});
  });
});

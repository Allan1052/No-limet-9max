import { describe, expect, it } from "vitest";
import type { ProgressSummary } from "./progress";
import { calculateSessionProgress, loadOrCreateSessionBaseline, type SessionStorageLike } from "./sessionProgress";

function summary(hands: number, decisions: number, boa: number, ok: number): ProgressSummary {
  return {
    hands,
    decisions,
    goodRateAll: 0,
    goodRateWeek: 0,
    weekDecisions: 0,
    trend: 0,
    counts: { boa, ok, imprecisa: Math.max(0, decisions - boa - ok), ruim: 0 },
    chipsLostThisWeek: 0,
    chipsLostAllTime: 0,
    preflopFoldsThisWeek: 0,
    vpip: 0,
    cbetsThisWeek: 0,
    botsFoldedThisWeek: 0,
    evolutionLevel: 1,
    weeksCounts: {},
  };
}

function memoryStorage(): SessionStorageLike {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

describe("progresso visível da sessão", () => {
  it("mantém mãos, decisões e precisão quando a aba é desmontada e aberta novamente", () => {
    const storage = memoryStorage();
    const initial = summary(100, 200, 120, 40);
    const baseline1 = loadOrCreateSessionBaseline(initial, storage);
    expect(calculateSessionProgress(initial, baseline1)).toEqual({ hands: 0, decisions: 0, good: 0, accuracy: 0 });

    const later = summary(102, 205, 123, 41);
    const beforeLeaving = calculateSessionProgress(later, baseline1);
    expect(beforeLeaving).toEqual({ hands: 2, decisions: 5, good: 4, accuracy: 80 });

    const baseline2 = loadOrCreateSessionBaseline(later, storage);
    expect(calculateSessionProgress(later, baseline2)).toEqual(beforeLeaving);
  });

  it("cria uma sessão nova quando não existe baseline salvo", () => {
    const storage = memoryStorage();
    const current = summary(18, 27, 15, 5);
    const baseline = loadOrCreateSessionBaseline(current, storage);
    expect(calculateSessionProgress(current, baseline)).toEqual({ hands: 0, decisions: 0, good: 0, accuracy: 0 });
  });
});

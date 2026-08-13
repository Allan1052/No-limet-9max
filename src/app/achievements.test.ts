import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  processXpEvent,
  loadXpState,
  resetXpState,
  xpToLevel,
  xpForNextLevel,
  getXpSummary,
  ACHIEVEMENT_DEFS,
  type XpState,
  type XpEvent,
} from "./achievements";

// Mock localStorage
beforeEach(() => {
  const store: Record<string, string> = {};
  vi.stubGlobal(
    "localStorage",
    {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
      get length() { return Object.keys(store).length; },
      key: (i: number) => Object.keys(store)[i] ?? null,
    },
  );
  resetXpState();
});

function defaultState(): XpState {
  return loadXpState();
}

describe("XP calculations", () => {
  it("level 1 at 0 XP", () => {
    expect(xpToLevel(0)).toBe(1);
    expect(xpForNextLevel(0)).toBe(100);
  });

  it("level 2 at 100 XP", () => {
    expect(xpToLevel(100)).toBe(2);
    expect(xpForNextLevel(100)).toBe(100);
  });

  it("level 3 at 250 XP", () => {
    expect(xpToLevel(250)).toBe(3);
    expect(xpForNextLevel(250)).toBe(50);
  });
});

describe("processXpEvent decision", () => {
  it("adds 10 XP for 'boa' decision", () => {
    const state = defaultState();
    const event: XpEvent = { type: "decision", rating: "boa" };
    const { state: s } = processXpEvent(state, event);
    expect(s.xp).toBe(10);
  });

  it("adds 5 XP for 'ok' decision", () => {
    const state = defaultState();
    const event: XpEvent = { type: "decision", rating: "ok" };
    const { state: s } = processXpEvent(state, event);
    expect(s.xp).toBe(5);
  });

  it("adds 0 XP for 'imprecisa'", () => {
    const state = defaultState();
    const event: XpEvent = { type: "decision", rating: "imprecisa" };
    const { state: s } = processXpEvent(state, event);
    expect(s.xp).toBe(0);
  });

  it("subtracts 5 XP for 'ruim' but never goes below 0", () => {
    const state = defaultState();
    const event1: XpEvent = { type: "decision", rating: "ruim" };
    const { state: s1 } = processXpEvent(state, event1);
    expect(s1.xp).toBe(0); // can't go negative
  });

  it("resets correctStreak on bad decision", () => {
    let state = defaultState();
    const good: XpEvent = { type: "decision", rating: "boa" };
    const bad: XpEvent = { type: "decision", rating: "ruim" };

    state = processXpEvent(state, good).state;
    expect(state.correctStreak).toBe(1);

    state = processXpEvent(state, bad).state;
    expect(state.correctStreak).toBe(0);
  });
});

describe("achievements unlock", () => {
  it("unlocks 'first_hand' after 1 hand", () => {
    const state = defaultState();
    const event: XpEvent = { type: "handOver" };
    const { state: s, newAchievements } = processXpEvent(state, event);
    expect(s.handsPlayed).toBe(1);
    expect(newAchievements.some((a) => a.id === "first_hand")).toBe(true);
  });

  it("unlocks 'hands_50' after 50 hands", () => {
    let state = defaultState();
    let allNew: string[] = [];
    const event: XpEvent = { type: "handOver" };
    for (let i = 0; i < 50; i++) {
      const result = processXpEvent(state, event);
      state = result.state;
      allNew.push(...result.newAchievements.map((a) => a.id));
    }
    expect(state.handsPlayed).toBe(50);
    expect(allNew.includes("hands_50")).toBe(true);
  });

  it("unlocks 'champion' when finishPlace === 1", () => {
    const state = defaultState();
    const event: XpEvent = { type: "tournamentOver", finishPlace: 1, inMoney: true };
    const { newAchievements } = processXpEvent(state, event);
    expect(newAchievements.some((a) => a.id === "champion")).toBe(true);
  });

  it("unlocks 'iron_discipline' after 10 consecutive good decisions", () => {
    let state = defaultState();
    const good: XpEvent = { type: "decision", rating: "boa" };
    let found = false;
    for (let i = 0; i < 10; i++) {
      const result = processXpEvent(state, good);
      state = result.state;
      if (result.newAchievements.some((a) => a.id === "iron_discipline")) found = true;
    }
    expect(found).toBe(true);
  });

  it("unlocks 'fold_master' after 20 preflop fold corrects", () => {
    let state = defaultState();
    const foldPf: XpEvent = { type: "decision", rating: "boa", heroType: "fold", isPreflop: true };
    let found = false;
    for (let i = 0; i < 20; i++) {
      const result = processXpEvent(state, foldPf);
      state = result.state;
      if (result.newAchievements.some((a) => a.id === "fold_master")) found = true;
    }
    expect(found).toBe(true);
  });

  it("unlocks 'first_replay' on replayOpen event", () => {
    const state = defaultState();
    const event: XpEvent = { type: "replayOpen" };
    const { newAchievements } = processXpEvent(state, event);
    expect(newAchievements.some((a) => a.id === "first_replay")).toBe(true);
  });

  it("unlocks 'hand_share' on shareHand event", () => {
    const state = defaultState();
    const event: XpEvent = { type: "shareHand" };
    const { newAchievements } = processXpEvent(state, event);
    expect(newAchievements.some((a) => a.id === "hand_share")).toBe(true);
  });
});

// Conquistas que ANTES eram impossíveis (check auto-referente, nunca setado) ou
// mal atribuídas. Estes testes travam o conserto: elas precisam ser ganháveis e
// disparar o toast (aparecer em newAchievements).
describe("conquistas corrigidas (antes impossíveis/furadas)", () => {
  it("'high_roller' desbloqueia ao jogar um torneio de $109", () => {
    const state = defaultState();
    const event: XpEvent = { type: "decision", rating: "ok", buyIn: 109 };
    const { newAchievements } = processXpEvent(state, event);
    expect(newAchievements.some((a) => a.id === "high_roller")).toBe(true);
  });

  it("'high_roller' NÃO desbloqueia num torneio barato", () => {
    const state = defaultState();
    const event: XpEvent = { type: "decision", rating: "ok", buyIn: 11 };
    const { newAchievements } = processXpEvent(state, event);
    expect(newAchievements.some((a) => a.id === "high_roller")).toBe(false);
  });

  it("'deep_run' desbloqueia na mesa final com menos de 20bb", () => {
    const state = defaultState();
    const event: XpEvent = { type: "decision", rating: "ok", finalTable: true, heroBB: 14 };
    const { newAchievements } = processXpEvent(state, event);
    expect(newAchievements.some((a) => a.id === "deep_run")).toBe(true);
  });

  it("'deep_run' NÃO desbloqueia com stack fundo na mesa final", () => {
    const state = defaultState();
    const event: XpEvent = { type: "decision", rating: "ok", finalTable: true, heroBB: 45 };
    const { newAchievements } = processXpEvent(state, event);
    expect(newAchievements.some((a) => a.id === "deep_run")).toBe(false);
  });

  it("'short_stack' desbloqueia após 10 decisões com menos de 10bb", () => {
    let state = defaultState();
    let unlocked = false;
    for (let i = 0; i < 10; i++) {
      const r = processXpEvent(state, { type: "decision", rating: "ok", heroBB: 8 });
      state = r.state;
      if (r.newAchievements.some((a) => a.id === "short_stack")) unlocked = true;
    }
    expect(unlocked).toBe(true);
  });

  it("'bluff_catcher' desbloqueia SÓ num call contra all-in (não em call normal)", () => {
    // Call normal (sem all-in) NÃO conta.
    let state = defaultState();
    let r = processXpEvent(state, { type: "decision", rating: "boa", heroType: "call", facingAllin: false });
    expect(r.newAchievements.some((a) => a.id === "bluff_catcher")).toBe(false);
    // Call contra all-in conta E dispara o toast.
    r = processXpEvent(r.state, { type: "decision", rating: "boa", heroType: "call", facingAllin: true });
    expect(r.newAchievements.some((a) => a.id === "bluff_catcher")).toBe(true);
  });

  it("'circuit_complete' só desbloqueia após 4 torneios (não no primeiro)", () => {
    let state = defaultState();
    let r = processXpEvent(state, { type: "tournamentOver", inMoney: false });
    expect(r.newAchievements.some((a) => a.id === "circuit_complete")).toBe(false);
    for (let i = 0; i < 3; i++) r = processXpEvent(r.state, { type: "tournamentOver", inMoney: false });
    expect(r.state.unlocked.includes("circuit_complete")).toBe(true);
  });
});

describe("getXpSummary", () => {
  it("returns correct structure", () => {
    const summary = getXpSummary();
    expect(summary.level).toBe(1);
    expect(summary.xp).toBe(0);
    expect(summary.unlockedCount).toBe(0);
    expect(summary.totalCount).toBe(ACHIEVEMENT_DEFS.length);
    expect(summary.achievements.length).toBe(ACHIEVEMENT_DEFS.length);
  });
});

describe("persistence", () => {
  it("survives reload (load after save)", () => {
    let state = defaultState();
    const event: XpEvent = { type: "decision", rating: "boa" };
    state = processXpEvent(state, event).state;
    expect(state.xp).toBe(10);

    // Simulate reload
    const loaded = loadXpState();
    expect(loaded.xp).toBe(10);
  });
});

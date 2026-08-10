import { describe, it, expect, beforeEach } from "vitest";
import { saveSlot, loadSlot, removeSlot, listSlots } from "./tournamentSlots";
import type { GameSnapshot } from "./gameController";

// Mock simples de localStorage (o ambiente node do vitest não tem um).
class MemStorage {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

function fakeSnap(buyIn: number, savedAt: string, heroStack = 5000): GameSnapshot {
  return {
    v: 1,
    seats: [{ name: "Você", isHero: true, stack: heroStack }],
    buttonSeat: 0,
    blinds: { sb: 25, bb: 50, ante: 0 },
    stats: {},
    tournament: {
      buyIn,
      entrants: 500,
      stage: "meio",
      levelIndex: 2,
      prizePool: 5000,
      ladder: [1000],
      handsPerLevel: 12,
      handsThisLevel: 3,
      fieldRemaining: 200,
      bubbleBurst: false,
    },
    heroRatings: { boa: 0, ok: 0, imprecisa: 0, ruim: 0 },
    sessionMistakes: [],
    tournamentResult: null,
    tournamentFinishPlace: null,
    savedAt,
  };
}

describe("torneios salvos (um por faixa de buy-in)", () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: MemStorage }).localStorage = new MemStorage();
  });

  it("salva um slot por buy-in e mantém vários ao mesmo tempo", () => {
    saveSlot(fakeSnap(5, "2026-07-24T10:00:00Z"));
    saveSlot(fakeSnap(11, "2026-07-24T11:00:00Z"));
    saveSlot(fakeSnap(109, "2026-07-24T09:00:00Z"));
    const slots = listSlots();
    expect(slots.map((s) => s.buyIn).sort((a, b) => a - b)).toEqual([5, 11, 109]);
    // Mais recente primeiro.
    expect(slots[0].buyIn).toBe(11);
  });

  it("resgatar um buy-in traz o progresso salvo daquela faixa", () => {
    saveSlot(fakeSnap(22, "2026-07-24T10:00:00Z", 8000));
    const snap = loadSlot(22);
    expect(snap?.tournament.buyIn).toBe(22);
    expect(snap?.seats[0].stack).toBe(8000);
    expect(snap?.tournament.handsThisLevel).toBe(3); // o "relógio" das blinds foi preservado
  });

  it("iniciar novo no mesmo buy-in substitui só aquele slot", () => {
    saveSlot(fakeSnap(11, "2026-07-24T10:00:00Z", 5000));
    saveSlot(fakeSnap(11, "2026-07-24T12:00:00Z", 9000)); // substitui
    expect(listSlots().filter((s) => s.buyIn === 11)).toHaveLength(1);
    expect(loadSlot(11)?.seats[0].stack).toBe(9000);
  });

  it("descartar remove apenas aquele buy-in", () => {
    saveSlot(fakeSnap(5, "2026-07-24T10:00:00Z"));
    saveSlot(fakeSnap(55, "2026-07-24T11:00:00Z"));
    removeSlot(5);
    expect(loadSlot(5)).toBeNull();
    expect(loadSlot(55)).toBeTruthy();
  });
});

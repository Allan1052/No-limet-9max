import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  recordTournamentWin,
  isBuyInUnlocked,
  unlockRequirement,
  loadEliteWins,
} from "./eliteUnlock";

beforeEach(() => {
  const store: Record<string, string> = {};
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  });
});

describe("Torneios de elite — desbloqueio por conquista", () => {
  it("por padrão, elite está TRAVADA e o resto liberado", () => {
    expect(isBuyInUnlocked(109)).toBe(true);
    expect(isBuyInUnlocked(1000)).toBe(false);
    expect(isBuyInUnlocked(10300)).toBe(false);
  });

  it("ganhar $109 com 100+ (do início) libera o $1.000, mas NÃO o $10.300", () => {
    const novo = recordTournamentWin(109, 180, "inicio");
    expect(novo).toBe(true);
    expect(isBuyInUnlocked(1000)).toBe(true);
    expect(isBuyInUnlocked(10300)).toBe(false);
  });

  it("ganhar $1.000 com 100+ libera o $10.300", () => {
    recordTournamentWin(1000, 120, "inicio");
    expect(isBuyInUnlocked(10300)).toBe(true);
  });

  it("vitória com menos de 100 inscritos NÃO conta", () => {
    recordTournamentWin(109, 60, "inicio");
    expect(isBuyInUnlocked(1000)).toBe(false);
  });

  it("vitória fora do 'início' (pulou pra bolha) NÃO conta", () => {
    recordTournamentWin(109, 300, "bolha");
    expect(isBuyInUnlocked(1000)).toBe(false);
  });

  it("o requisito é descrito corretamente", () => {
    expect(unlockRequirement(1000)).toMatch(/\$109.*100/);
    expect(unlockRequirement(10300)).toMatch(/\$1\.000.*100/);
    expect(unlockRequirement(109)).toBeNull();
  });

  it("persiste (fica salvo) entre leituras", () => {
    recordTournamentWin(109, 200, "inicio");
    expect(loadEliteWins()["109"]).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Testes do Cash Game config — validação básica.
// ---------------------------------------------------------------------------
import { describe, it, expect } from "vitest";
import {
  CASH_MAX_PLAYERS,
  CASH_STARTING_BB,
  CASH_BLIND_STRUCTURES,
  cashStartingStack,
  cashRebuyStack,
  isCashUnlocked,
  tryUnlockCash,
  CASH_DEV_UNLOCK_KEY,
} from "./config";

describe("Cash Game config", () => {
  it("deve ter 6 jogadores (6-max)", () => {
    expect(CASH_MAX_PLAYERS).toBe(6);
  });

  it("deve ter stack inicial de 100bb", () => {
    expect(CASH_STARTING_BB).toBe(100);
  });

  it("deve ter múltiplas estruturas de blinds", () => {
    expect(CASH_BLIND_STRUCTURES.length).toBeGreaterThan(0);
    // Todas devem ter ante 0 (cash sem ante é padrão)
    for (const bl of CASH_BLIND_STRUCTURES) {
      expect(bl.ante).toBe(0);
      expect(bl.bb).toBeGreaterThan(bl.sb);
    }
  });

  it("deve calcular stack inicial corretamente", () => {
    const bl = CASH_BLIND_STRUCTURES[0]; // sb=5, bb=10
    expect(cashStartingStack(bl)).toBe(1000); // 100bb * 10
  });

  it("deve calcular rebuy stack corretamente (abaixo do máximo)", () => {
    const bl = CASH_BLIND_STRUCTURES[0]; // bb=10
    const currentBB = 30; // abaixo de 100bb
    const stack = cashRebuyStack(currentBB, bl);
    expect(stack).toBe(1000); // 100bb * 10
  });

  it("deve calcular rebuy stack corretamente (acima do máximo — mantém)", () => {
    const bl = CASH_BLIND_STRUCTURES[0]; // bb=10
    const currentBB = 150; // acima de 100bb
    const stack = cashRebuyStack(currentBB, bl);
    expect(stack).toBe(1500); // mantém 150bb * 10
  });

  it("tryUnlockCash com código correto retorna true (localStorage mockado)", () => {
    const original = globalThis.localStorage;
    const store: Record<string, string> = {};
    const mock = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { for (const k of Object.keys(store)) delete store[k]; },
      length: Object.keys(store).length,
      key: () => null,
    };
    globalThis.localStorage = mock as unknown as Storage;
    expect(tryUnlockCash("cash2026")).toBe(true);
    expect(store[CASH_DEV_UNLOCK_KEY]).toBe("true");
    expect(isCashUnlocked()).toBe(true);
    globalThis.localStorage = original;
  });

  it("tryUnlockCash com código errado retorna false (localStorage mockado)", () => {
    const original = globalThis.localStorage;
    const store: Record<string, string> = {};
    const mock = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { for (const k of Object.keys(store)) delete store[k]; },
      length: Object.keys(store).length,
      key: () => null,
    };
    globalThis.localStorage = mock as unknown as Storage;
    expect(tryUnlockCash("wrong")).toBe(false);
    expect(isCashUnlocked()).toBe(false);
    globalThis.localStorage = original;
  });
});

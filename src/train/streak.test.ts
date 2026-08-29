import { beforeEach, describe, expect, it } from "vitest";
import { getTrainingDayStatus, markActiveToday } from "./streak";

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
  clear() { this.data.clear(); }
}

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    value: new MemoryStorage(),
    configurable: true,
  });
});

describe("sequência diária de treino", () => {
  it("conta apenas uma vez no mesmo dia", () => {
    const day = new Date(2026, 7, 29, 12);
    expect(markActiveToday(day)).toMatchObject({ current: 1, incremented: true });
    expect(markActiveToday(day)).toMatchObject({ current: 1, incremented: false });
    expect(getTrainingDayStatus(day)).toMatchObject({ trainedToday: true, current: 1 });
  });

  it("aumenta em dias consecutivos", () => {
    expect(markActiveToday(new Date(2026, 7, 28, 12)).current).toBe(1);
    expect(markActiveToday(new Date(2026, 7, 29, 12)).current).toBe(2);
  });

  it("reinicia após pular um dia", () => {
    expect(markActiveToday(new Date(2026, 7, 27, 12)).current).toBe(1);
    expect(markActiveToday(new Date(2026, 7, 29, 12)).current).toBe(1);
  });
});

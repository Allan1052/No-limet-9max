import { describe, it, expect } from "vitest";
import {
  SNG3_BLIND_LEVELS,
  SNG3_HANDS_PER_LEVEL,
  SNG3_MAX_PLAYERS,
  SNG3_RANGE_WIDTH_MULTIPLIER,
  SNG3_SHOVE_DEPTH_BB,
  SNG3_STARTING_BB,
  sng3PayoutLadder,
  tryUnlockSng3,
  SNG3_DEV_UNLOCK_KEY,
} from "./config";

describe("SNG3 Config", () => {
  it("has 3 players", () => {
    expect(SNG3_MAX_PLAYERS).toBe(3);
  });

  it("blinds escalate quickly (turbo structure)", () => {
    // Level 1: 25/50, Level 12: 1500/3000 — 60x increase
    expect(SNG3_BLIND_LEVELS.length).toBeGreaterThan(5);
    expect(SNG3_BLIND_LEVELS[0].bb).toBe(50);
    const last = SNG3_BLIND_LEVELS[SNG3_BLIND_LEVELS.length - 1];
    expect(last.bb).toBe(3000);
    expect(last.sb).toBe(1500);
  });

  it("blinds increase monotonically", () => {
    for (let i = 1; i < SNG3_BLIND_LEVELS.length; i++) {
      expect(SNG3_BLIND_LEVELS[i].bb).toBeGreaterThan(SNG3_BLIND_LEVELS[i - 1].bb);
      expect(SNG3_BLIND_LEVELS[i].sb).toBeGreaterThan(SNG3_BLIND_LEVELS[i - 1].sb);
    }
  });

  it("hands per level is fast (turbo)", () => {
    expect(SNG3_HANDS_PER_LEVEL).toBe(10);
  });

  it("starting stack is shallow (25bb typical SNG)", () => {
    expect(SNG3_STARTING_BB).toBe(25);
  });

  it("payout winner-take-all gives all to 1st", () => {
    const ladder = sng3PayoutLadder(100, "winner-take-all");
    expect(ladder).toEqual([100]);
    expect(ladder.length).toBe(1);
  });

  it("payout top2-65-35 splits 65/35", () => {
    const ladder = sng3PayoutLadder(100, "top2-65-35");
    expect(ladder.length).toBe(2);
    expect(ladder[0]).toBe(65);
    expect(ladder[1]).toBe(35);
    expect(ladder[0] + ladder[1]).toBe(100);
  });

  it("payout top2-65-35 with pool 200", () => {
    const ladder = sng3PayoutLadder(200, "top2-65-35");
    expect(ladder[0]).toBe(130);
    expect(ladder[1]).toBe(70);
    expect(ladder[0] + ladder[1]).toBe(200);
  });

  it("payout top2-65-35 with pool 22", () => {
    const ladder = sng3PayoutLadder(22, "top2-65-35");
    expect(ladder[0]).toBe(14); // round(22 * 0.65) = 14
    expect(ladder[1]).toBe(8);
    expect(ladder[0] + ladder[1]).toBe(22);
  });

  it("range width multiplier is wider than 9-max", () => {
    expect(SNG3_RANGE_WIDTH_MULTIPLIER).toBeGreaterThan(1);
    expect(SNG3_RANGE_WIDTH_MULTIPLIER).toBe(2.5);
  });

  it("shove depth is deeper than 9-max (more aggressive)", () => {
    // 9-max uses ~15bb, SNG3 uses 20bb
    expect(SNG3_SHOVE_DEPTH_BB).toBe(20);
    expect(SNG3_SHOVE_DEPTH_BB).toBeGreaterThan(15);
  });

  it("tryUnlockSng3 with correct code returns true", () => {
    // Need to mock localStorage in browser-like test
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
    expect(tryUnlockSng3("sng32026")).toBe(true);
    expect(store[SNG3_DEV_UNLOCK_KEY]).toBe("true");
    globalThis.localStorage = original;
  });

  it("tryUnlockSng3 with wrong code returns false", () => {
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
    expect(tryUnlockSng3("wrong")).toBe(false);
    expect(store[SNG3_DEV_UNLOCK_KEY]).toBeUndefined();
    globalThis.localStorage = original;
  });
});

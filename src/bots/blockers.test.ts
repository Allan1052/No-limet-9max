import { describe, it, expect } from "vitest";
import { findBlockers } from "./blockers";
import { cardsFromString } from "../engine/cards";

describe("findBlockers", () => {
  it("A♠ com 3 espadas no board bloqueia o nut flush", () => {
    const hand = cardsFromString("AsKh"); // só 1 espada na mão
    const notes = findBlockers(hand, cardsFromString("7s2s9s")); // 3 espadas no flop
    expect(notes.some((n) => n.kind === "nutFlush" && n.label === "A♠")).toBe(true);
  });

  it("A♠ com 2 espadas no board bloqueia o PROJETO de nut flush", () => {
    const notes = findBlockers(cardsFromString("AsKh"), cardsFromString("7s2s9d"));
    expect(notes.some((n) => n.kind === "nutFlushDraw" && n.label === "A♠")).toBe(true);
  });

  it("NÃO é bloqueador se o herói tem o próprio flush (2 espadas na mão)", () => {
    const notes = findBlockers(cardsFromString("AsTs"), cardsFromString("7s2s9s"));
    // herói tem A♠ e T♠ → ele MESMO tem o flush, não é bloqueador
    expect(notes.some((n) => n.kind === "nutFlush")).toBe(false);
  });

  it("carta que pareia o board reduz trips/2 pares do vilão", () => {
    const notes = findBlockers(cardsFromString("KdQc"), cardsFromString("Kh7s2c"));
    expect(notes.some((n) => n.kind === "boardPair" && n.label === "K")).toBe(true);
  });

  it("par de bolso que vira set NÃO conta como bloqueador de board", () => {
    const notes = findBlockers(cardsFromString("KdKc"), cardsFromString("Kh7s2c"));
    expect(notes.some((n) => n.kind === "boardPair")).toBe(false);
  });

  it("board seco sem interação: sem bloqueadores", () => {
    const notes = findBlockers(cardsFromString("QdJc"), cardsFromString("7h2s9c"));
    expect(notes.length).toBe(0);
  });
});

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

  // 11/09/2026: quando o rank pareado é o MAIS ALTO do board, a nota passou a
  // ser `topRank` em vez de `boardPair` — bloquear o top par pesa muito mais do
  // que bloquear um par qualquer, e a dica precisa dizer isso.
  it("carta que pareia a MAIS ALTA do board vira bloqueio de top par", () => {
    const notes = findBlockers(cardsFromString("KdQc"), cardsFromString("Kh7s2c"));
    expect(notes.some((n) => n.kind === "topRank" && n.label === "K")).toBe(true);
  });

  it("carta que pareia um rank BAIXO do board segue como boardPair", () => {
    const notes = findBlockers(cardsFromString("7dQc"), cardsFromString("Kh7s2c"));
    expect(notes.some((n) => n.kind === "boardPair" && n.label === "7")).toBe(true);
    expect(notes.some((n) => n.kind === "topRank")).toBe(false);
  });

  it("bloqueador de ÁS: tem um Ás e não há Ás no board", () => {
    const notes = findBlockers(cardsFromString("AdQc"), cardsFromString("Kh7s2c"));
    expect(notes.some((n) => n.kind === "aceBlocker" && n.label === "A♦")).toBe(true);
  });

  it("com Ás NO BOARD não repete como bloqueador de ás", () => {
    const notes = findBlockers(cardsFromString("AdQc"), cardsFromString("Ah7s2c"));
    expect(notes.some((n) => n.kind === "aceBlocker")).toBe(false);
    // ali o caso certo é o de rank do board (e o Ás é a carta mais alta)
    expect(notes.some((n) => n.kind === "topRank" && n.label === "A")).toBe(true);
  });

  it("par de bolso que vira set NÃO conta como bloqueador de board", () => {
    const notes = findBlockers(cardsFromString("KdKc"), cardsFromString("Kh7s2c"));
    expect(notes.some((n) => n.kind === "boardPair")).toBe(false);
    expect(notes.some((n) => n.kind === "topRank")).toBe(false);
  });

  it("board seco sem interação: sem bloqueadores", () => {
    const notes = findBlockers(cardsFromString("QdJc"), cardsFromString("7h2s9c"));
    expect(notes.length).toBe(0);
  });
});

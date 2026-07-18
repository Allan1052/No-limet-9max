import { describe, it, expect } from "vitest";
import {
  allHandTypes,
  comboCount,
  handTypeCombos,
  comboToHandType,
} from "./types";
import { cardsFromString } from "../engine/cards";
import { handStrengthTable, handRank } from "./handStrength";
import { buildTopRange } from "./build";
import { rfiRange } from "./charts/rfi";

describe("types de mão", () => {
  it("existem exatamente 169 tipos", () => {
    expect(allHandTypes().length).toBe(169);
  });

  it("os combos somam 1326 (baralho completo de mãos)", () => {
    const total = allHandTypes().reduce((s, ht) => s + comboCount(ht), 0);
    expect(total).toBe(1326);
  });

  it("expande combos com as contagens certas", () => {
    expect(handTypeCombos("AA").length).toBe(6);
    expect(handTypeCombos("AKs").length).toBe(4);
    expect(handTypeCombos("AKo").length).toBe(12);
  });

  it("identifica o tipo canônico a partir das cartas", () => {
    const [a, b] = cardsFromString("AsKs");
    expect(comboToHandType(a, b)).toBe("AKs");
    const [c, d] = cardsFromString("KhAd");
    expect(comboToHandType(c, d)).toBe("AKo");
    const [e, f] = cardsFromString("7c7d");
    expect(comboToHandType(e, f)).toBe("77");
  });
});

describe("ranking de força", () => {
  it("AA é a mão mais forte", () => {
    expect(handStrengthTable()[0].handType).toBe("AA");
  });
  it("72o está entre as piores", () => {
    expect(handRank("72o")).toBeGreaterThan(160);
  });
  it("AKs é mais forte que AKo", () => {
    expect(handRank("AKs")).toBeLessThan(handRank("AKo"));
  });
  it("pares fortes vencem broadways suited", () => {
    expect(handRank("QQ")).toBeLessThan(handRank("AJs"));
  });
});

describe("construção de ranges", () => {
  it("buildTopRange fica perto do alvo de %", () => {
    const r = buildTopRange(0.2);
    const pct = Object.entries(r).reduce(
      (s, [ht, f]) => s + f * comboCount(ht),
      0,
    ) / 1326;
    expect(Math.abs(pct - 0.2)).toBeLessThan(0.02);
  });

  it("ranges são aninhadas: a estreita está contida na larga", () => {
    const tight = buildTopRange(0.1);
    const wide = buildTopRange(0.3);
    for (const ht of Object.keys(tight)) {
      expect((wide[ht] ?? 0)).toBeGreaterThan(0);
    }
  });
});

describe("ranges de abertura (RFI)", () => {
  it("UTG abre mais apertado que o botão", () => {
    const utg = Object.keys(rfiRange("UTG")).length;
    const btn = Object.keys(rfiRange("BTN")).length;
    expect(utg).toBeLessThan(btn);
  });
  it("AA está em toda range de abertura", () => {
    expect((rfiRange("UTG")["AA"] ?? 0)).toBeGreaterThan(0);
    expect((rfiRange("BTN")["AA"] ?? 0)).toBeGreaterThan(0);
  });
  it("72o não é aberto em UTG", () => {
    expect((rfiRange("UTG")["72o"] ?? 0)).toBe(0);
  });
});

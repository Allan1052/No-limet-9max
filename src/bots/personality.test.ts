import { describe, it, expect } from "vitest";
import { personalize } from "./personality";
import { profileById } from "./profiles";

const lag = () => profileById("lag");

describe("CAMADA 1 — personalidade única por bot", () => {
  it("sem semente devolve o perfil intacto (herói / fallback)", () => {
    const base = lag();
    expect(personalize(base, 0)).toBe(base);
  });

  it("sementes diferentes geram bots DIFERENTES do mesmo arquétipo", () => {
    const a = personalize(lag(), 101, 1);
    const b = personalize(lag(), 202, 1);
    // Pelo menos um traço de estilo difere de forma perceptível.
    const diff =
      Math.abs(a.aggression - b.aggression) +
      Math.abs(a.bluffFactor - b.bluffFactor) +
      Math.abs(a.threeBetFactor - b.threeBetFactor);
    expect(diff).toBeGreaterThan(0.05);
  });

  it("é ESTÁVEL: mesma semente → mesmo bot", () => {
    const a = personalize(lag(), 777, 0.5);
    const b = personalize(lag(), 777, 0.5);
    expect(a).toEqual(b);
  });

  it("na elite (toughness 1) o SKILL varia pouco entre bots", () => {
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
    const skills = seeds.map((s) => personalize(lag(), s, 1).skill);
    const spread = Math.max(...skills) - Math.min(...skills);
    expect(spread).toBeLessThan(0.2); // cluster apertado de skill alto
  });

  it("no micro (toughness 0) o SKILL varia MUITO mais que na elite", () => {
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
    const spreadMicro =
      Math.max(...seeds.map((s) => personalize(lag(), s, 0).skill)) -
      Math.min(...seeds.map((s) => personalize(lag(), s, 0).skill));
    const spreadElite =
      Math.max(...seeds.map((s) => personalize(lag(), s, 1).skill)) -
      Math.min(...seeds.map((s) => personalize(lag(), s, 1).skill));
    expect(spreadMicro).toBeGreaterThan(spreadElite);
  });

  it("mantém tudo em faixas sãs (0..1 nos fatores limitados)", () => {
    for (let s = 1; s <= 40; s++) {
      const p = personalize(lag(), s, 0.5);
      for (const v of [p.aggression, p.barrelTurn, p.barrelRiver, p.stickiness, p.skill]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(p.rfiWidth).toBeGreaterThan(0);
      expect(p.bluffFactor).toBeGreaterThanOrEqual(0);
    }
  });
});

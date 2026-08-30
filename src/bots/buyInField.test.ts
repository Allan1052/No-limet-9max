import { describe, it, expect } from "vitest";
import { buyInToughness, adjustProfileForBuyIn, profileById } from "./profiles";
import { preflopDecision } from "../ranges/preflop";
import { allHandTypes, handTypeCombos } from "../ranges/types";

describe("campo por buy-in — dureza escala com o valor", () => {
  it("micro é 0, alto é 1", () => {
    expect(buyInToughness(5)).toBe(0);
    expect(buyInToughness(undefined)).toBe(0);
    expect(buyInToughness(109)).toBeCloseTo(1, 5);
    const mid = buyInToughness(22);
    expect(mid).toBeGreaterThan(0.3);
    expect(mid).toBeLessThan(0.7);
  });

  it("no micro ($5) o perfil não muda", () => {
    const rec = profileById("recreativo");
    const adj = adjustProfileForBuyIn(rec, 5);
    expect(adj.limpFactor).toBe(rec.limpFactor);
    expect(adj.coldCallFactor).toBe(rec.coldCallFactor);
    expect(adj.threeBetFactor).toBe(rec.threeBetFactor);
  });

  it("no alto ($109) vê menos flops e rouba mais", () => {
    const rec = profileById("recreativo");
    const adj = adjustProfileForBuyIn(rec, 109);
    expect(adj.limpFactor).toBeLessThan(rec.limpFactor);
    expect(adj.coldCallFactor).toBeLessThan(rec.coldCallFactor);
    expect(adj.threeBetFactor).toBeGreaterThan(rec.threeBetFactor);
    expect(adj.positional.BTN).toBeGreaterThan(rec.positional.BTN);
    expect(adj.aggression).toBeGreaterThanOrEqual(rec.aggression);
  });

  it("stakes maiores = campo progressivamente mais apertado (menos limp)", () => {
    const rec = profileById("recreativo");
    const l5 = adjustProfileForBuyIn(rec, 5).limpFactor;
    const l22 = adjustProfileForBuyIn(rec, 22).limpFactor;
    const l109 = adjustProfileForBuyIn(rec, 109).limpFactor;
    expect(l22).toBeLessThan(l5);
    expect(l109).toBeLessThan(l22);
  });

  it("comportamento: o recreativo entra em MENOS mãos no $109 que no $5 (menos flops)", () => {
    const entered = (buyIn: number) => {
      const profile = adjustProfileForBuyIn(profileById("recreativo"), buyIn);
      let n = 0;
      for (const ht of allHandTypes()) {
        const d = preflopDecision({
          heroPosition: "MP",
          hand: handTypeCombos(ht)[0],
          effectiveBB: 40,
          profile,
          variant: "holdem",
        });
        if (d.action !== "fold") n++;
      }
      return n;
    };
    expect(entered(109)).toBeLessThan(entered(5));
  });

  it("Motor V2 RED: o mesmo TAG fica mais competente de $109 para $1k e $10.3k", () => {
    const base = profileById("tag");
    const p109 = adjustProfileForBuyIn(base, 109);
    const p1k = adjustProfileForBuyIn(base, 1000);
    const p10k = adjustProfileForBuyIn(base, 10300);

    expect(p1k.skill).toBeGreaterThan(p109.skill);
    expect(p10k.skill).toBeGreaterThan(p1k.skill);
    expect(p1k.threeBetFactor).toBeGreaterThan(p109.threeBetFactor);
    expect(p10k.threeBetFactor).toBeGreaterThan(p1k.threeBetFactor);
  });

  it("Motor V2 RED: LAG elite ganha pressão sem virar agressão ilimitada", () => {
    const base = profileById("lag");
    const p109 = adjustProfileForBuyIn(base, 109);
    const p1k = adjustProfileForBuyIn(base, 1000);
    const p10k = adjustProfileForBuyIn(base, 10300);

    expect(p1k.aggression).toBeGreaterThan(p109.aggression);
    expect(p10k.aggression).toBeGreaterThan(p1k.aggression);
    expect(p10k.aggression).toBeLessThanOrEqual(1);
    expect(p10k.bluffFactor).toBeLessThanOrEqual(base.bluffFactor * 1.6);
  });
});

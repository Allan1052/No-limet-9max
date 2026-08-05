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
    expect(adj.limpFactor).toBeLessThan(rec.limpFactor); // quase não limpa
    expect(adj.coldCallFactor).toBeLessThan(rec.coldCallFactor); // menos flat
    expect(adj.threeBetFactor).toBeGreaterThan(rec.threeBetFactor); // mais 3-bet
    expect(adj.positional.BTN).toBeGreaterThan(rec.positional.BTN); // mais roubo no botão
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
    // Conta VPIP (mãos que entram, não-fold) de MP, stack profundo.
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
});

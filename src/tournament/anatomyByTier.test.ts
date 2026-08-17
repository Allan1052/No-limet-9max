import { describe, it, expect } from "vitest";
import { idealDistribution, fieldDistribution, anatomyInsight, type AnatTier } from "./anatomy";

describe("anatomia por faixa — números reais do motor", () => {
  it("o ideal sai do motor: Fold é a maioria (~80%), Call baixo (~5%)", () => {
    const d = idealDistribution();
    expect(d.fold + d.call + d.raise).toBe(100);
    expect(d.fold).toBeGreaterThanOrEqual(75); // fold é a maioria
    expect(d.fold).toBeLessThanOrEqual(85);
    expect(d.call).toBeLessThanOrEqual(10); // o motor quase não paga pré-flop
    expect(d.raise).toBeGreaterThan(d.call);
  });

  it("o campo APERTA conforme sobe a faixa (Micro sangra, Elite quase no ideal)", () => {
    const tiers: AnatTier[] = ["micro", "baixa", "media", "alta", "elite"];
    const folds = tiers.map((t) => fieldDistribution(t).fold);
    // monotônico crescente: micro folda menos que baixa < ... < elite
    for (let i = 1; i < folds.length; i++) expect(folds[i]).toBeGreaterThan(folds[i - 1]);
    // Micro paga muito mais que Elite (o buraco do call encolhe por faixa)
    expect(fieldDistribution("micro").call).toBeGreaterThan(fieldDistribution("elite").call);
    // cada faixa soma 100
    for (const t of tiers) {
      const f = fieldDistribution(t);
      expect(f.fold + f.call + f.raise).toBe(100);
    }
  });

  it("o campo folda MENOS que o ideal em toda faixa (o leak universal)", () => {
    const ideal = idealDistribution();
    for (const t of ["micro", "baixa", "media", "alta", "elite"] as AnatTier[]) {
      expect(fieldDistribution(t).fold).toBeLessThan(ideal.fold);
    }
  });

  it("a lição é fold-cêntrica: aponta o fold que faltou, não 'raise demais'", () => {
    const ins = anatomyInsight(fieldDistribution("micro"));
    expect(ins.sharp).toBe(false);
    expect(ins.foldGap).toBeGreaterThan(0);
    expect(ins.headline.toLowerCase()).toContain("larga"); // centrado no fold
    expect(ins.detail.toLowerCase()).toContain("escorre");
  });

  it("jogo afiado (folda no ideal) é reconhecido como afiado", () => {
    const ideal = idealDistribution();
    const ins = anatomyInsight({ fold: ideal.fold, call: ideal.call, raise: ideal.raise }, ideal);
    expect(ins.sharp).toBe(true);
    expect(ins.foldGap).toBeLessThan(4);
  });
});

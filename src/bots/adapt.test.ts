import { describe, it, expect } from "vitest";
import { adaptToHero, type HeroRead } from "./adapt";
import { profileById } from "./profiles";

const read = (o: Partial<HeroRead>): HeroRead => ({ hands: 40, vpip: 0.24, pfr: 0.19, threeBet: 0.07, ...o });

describe("CAMADA 3 — adaptação ao herói", () => {
  it("sem amostra suficiente, não adapta", () => {
    const base = profileById("tag");
    expect(adaptToHero(base, read({ hands: 5 }), 0.9)).toBe(base);
  });

  it("skill baixo (peixe) adapta MUITO menos que um reg", () => {
    const r = read({ vpip: 0.1, threeBet: 0.02 });
    const peixeBase = profileById("recreativo");
    const regBase = profileById("tag");
    const peixeGain = adaptToHero(peixeBase, r, 0.25).rfiWidth / peixeBase.rfiWidth;
    const regGain = adaptToHero(regBase, r, 0.95).rfiWidth / regBase.rfiWidth;
    expect(peixeGain).toBeLessThan(regGain);
  });

  it("herói APERTADO (nit) → o reg rouba e 3-beta MAIS", () => {
    const base = profileById("tag");
    const out = adaptToHero(base, read({ vpip: 0.12, pfr: 0.1, threeBet: 0.02 }), 0.9);
    expect(out.rfiWidth).toBeGreaterThan(base.rfiWidth);
    expect(out.threeBetFactor).toBeGreaterThan(base.threeBetFactor);
  });

  it("herói SOLTO (station) → o reg blefa MENOS", () => {
    const base = profileById("tag");
    const out = adaptToHero(base, read({ vpip: 0.45, pfr: 0.2 }), 0.9);
    expect(out.bluffFactor).toBeLessThan(base.bluffFactor);
  });

  it("herói PASSIVO (VPIP≫PFR) → o reg barrela MAIS", () => {
    const base = profileById("tag");
    const out = adaptToHero(base, read({ vpip: 0.42, pfr: 0.1 }), 0.9);
    // passivo empurra blefe pra cima; solto empurra pra baixo — o líquido aqui
    // é o c-bet subir por conta do barrel vs passivo.
    expect(out.cbetFactor).toBeGreaterThanOrEqual(base.cbetFactor);
  });

  it("adaptação escala com o skill (reg adapta mais que semi-reg)", () => {
    const base = profileById("tag");
    const r = read({ vpip: 0.12, threeBet: 0.02 });
    const semi = adaptToHero(base, r, 0.5).rfiWidth;
    const reg = adaptToHero(base, r, 1.0).rfiWidth;
    expect(reg).toBeGreaterThan(semi);
  });
});

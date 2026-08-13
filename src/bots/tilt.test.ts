import { describe, it, expect } from "vitest";
import { freshTilt, updateTilt, decayTilt, tiltAdjust } from "./tilt";
import { profileById } from "./profiles";

describe("CAMADA 2 — tilt / estado emocional", () => {
  it("perder um pote grande faz o spewy STEAMAR (tilt positivo)", () => {
    const t = updateTilt(freshTilt(), "spewy", 0.6, true);
    expect(t.level).toBeGreaterThan(0.2);
  });

  it("perder grande faz o NIT ENCOLHER (tilt negativo — scared money)", () => {
    const t = updateTilt(freshTilt(), "nit", 0.6, true);
    expect(t.level).toBeLessThan(0);
  });

  it("perda pequena quase não move o tilt", () => {
    const t = updateTilt(freshTilt(), "lag", 0.05, false);
    expect(Math.abs(t.level)).toBeLessThan(0.05);
  });

  it("o tilt DECAI de volta pro zero (a calma volta)", () => {
    let t = { level: 0.8 };
    t = decayTilt(t);
    expect(t.level).toBeLessThan(0.8);
    for (let i = 0; i < 10; i++) t = decayTilt(t);
    expect(t.level).toBe(0);
  });

  it("steam (tilt>0) SOLTA a mão: mais blefe e agressão", () => {
    const base = profileById("tag");
    const hot = tiltAdjust(base, { level: 0.8 });
    expect(hot.bluffFactor).toBeGreaterThan(base.bluffFactor);
    expect(hot.aggression).toBeGreaterThanOrEqual(base.aggression);
  });

  it("medo (tilt<0) APERTA: menos blefe", () => {
    const base = profileById("lag");
    const scared = tiltAdjust(base, { level: -0.7 });
    expect(scared.bluffFactor).toBeLessThan(base.bluffFactor);
  });

  it("tilt 0 devolve o perfil intacto", () => {
    const base = profileById("lag");
    expect(tiltAdjust(base, { level: 0 })).toBe(base);
  });
});

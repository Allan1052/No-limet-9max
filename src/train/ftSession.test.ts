// Testes do modo Estudo de Mesa Final — lógica pura (sem UI).
import { describe, expect, it } from "vitest";
import {
  ftCoachLine,
  ftContextSummary,
  ftHeroContext,
  ftStackBand,
  makeFinalTableSession,
  type FtConfig,
} from "./ftSession";

const cfg = (overrides: Partial<FtConfig> = {}): FtConfig => ({
  heroStackBb: 20,
  nPlayers: 9,
  avgOppBb: 20,
  oppSpread: 0.4,
  pressure: "media",
  buyIn: 1000,
  entrants: 180,
  rng: () => 0.5,
  ...overrides,
});

describe("makeFinalTableSession", () => {
  it("cria mesa de 9 com stack do herói controlado", () => {
    const s = makeFinalTableSession(cfg());
    expect(s.seats.length).toBe(9);
    expect(s.seats[0].isHero).toBe(true);
    expect(Math.round(s.seats[0].stack / s.bigBlind)).toBe(20);
    expect(s.bigBlind).toBe(1200); // nível 8 = FT clássica
  });

  it("respeita os limites de stack do herói (10–30bb)", () => {
    expect(Math.round(makeFinalTableSession(cfg({ heroStackBb: 5 })).seats[0].stack / 1200)).toBe(10);
    expect(Math.round(makeFinalTableSession(cfg({ heroStackBb: 50 })).seats[0].stack / 1200)).toBe(30);
  });

  it("nº de jogadores fica entre 2 e 9", () => {
    expect(makeFinalTableSession(cfg({ nPlayers: 1 })).seats.length).toBe(2);
    expect(makeFinalTableSession(cfg({ nPlayers: 20 })).seats.length).toBe(9);
  });

  it("a soma dos stacks dos oponentes ≈ média × n", () => {
    const s = makeFinalTableSession(cfg({ avgOppBb: 25, oppSpread: 0.3 }));
    const oppTotalBb = s.stacksBb.slice(1).reduce((a, b) => a + b, 0);
    expect(oppTotalBb).toBeGreaterThan(25 * 7); // 8 oponentes ≈ 200bb
    expect(oppTotalBb).toBeLessThan(25 * 9);
  });

  it("pagamentos da FT: 9 posições com prêmios decrescentes", () => {
    const s = makeFinalTableSession(cfg());
    expect(s.payouts.length).toBe(9);
    expect(s.payouts[0]).toBeGreaterThan(0);
    // decrescente (ignora zeros no final)
    const nonzero = s.payouts.filter((p) => p > 0);
    for (let i = 1; i < nonzero.length; i++) {
      expect(nonzero[i - 1]).toBeGreaterThanOrEqual(nonzero[i]);
    }
  });

  it("pagamentos da FT = os 9 maiores prêmios da escada", () => {
    const s = makeFinalTableSession(cfg());
    const top9 = [...s.ladder].sort((a, b) => b - a).slice(0, 9);
    expect(s.payouts.slice(0, 9)).toEqual(top9);
  });

  it("ICM: stack maior vale mais em $", () => {
    // Seed variável garante stacks desiguais entre oponentes.
    let seed = 0.0001;
    const rng = () => {
      seed += 0.137;
      return seed - Math.floor(seed);
    };
    const s = makeFinalTableSession(cfg({ oppSpread: 0.6, rng }));
    const max = Math.max(...s.icmValues);
    const min = Math.min(...s.icmValues);
    expect(max).toBeGreaterThan(min);
  });
});

describe("ftHeroContext", () => {
  it("chip leader tem rank 1 e currentCash do 1º lugar", () => {
    const s = makeFinalTableSession(cfg({ heroStackBb: 30, avgOppBb: 12 }));
    const ctx = ftHeroContext(s);
    expect(ctx.heroRank).toBe(1);
    expect(ctx.currentCash).toBe(s.payouts[0]);
  });

  it("short stack tem rank último e cash do 9º", () => {
    const s = makeFinalTableSession(cfg({ heroStackBb: 10, avgOppBb: 30 }));
    const ctx = ftHeroContext(s);
    expect(ctx.heroRank).toBe(9);
    // fora do dinheiro ou mínimo pago — dependendo da escada
    expect(ctx.currentCash).toBeLessThanOrEqual(s.payouts[s.payouts.length - 1] || 0);
  });

  it("bubble factor > 1 quando alguém cobre o herói", () => {
    const s = makeFinalTableSession(cfg({ heroStackBb: 15, avgOppBb: 25 }));
    const ctx = ftHeroContext(s);
    expect(ctx.coverIndex).not.toBeNull();
    expect(ctx.bubble).toBeGreaterThan(1);
    expect(ctx.requiredEq).not.toBeNull();
  });

  it("chip leader não tem pressão ICM contra ninguém", () => {
    const s = makeFinalTableSession(cfg({ heroStackBb: 30, avgOppBb: 10 }));
    const ctx = ftHeroContext(s);
    expect(ctx.coverIndex).toBeNull();
    expect(ctx.bubble).toBe(1);
  });
});

describe("ftStackBand e ftCoachLine", () => {
  it("classifica as faixas de stack", () => {
    expect(ftStackBand(8 * 1200, 1200)).toBe("muito_curto");
    expect(ftStackBand(12 * 1200, 1200)).toBe("curto");
    expect(ftStackBand(20 * 1200, 1200)).toBe("medio");
    expect(ftStackBand(28 * 1200, 1200)).toBe("folgado");
  });

  it("coach menciona guarantee quando o herói já está ITM", () => {
    const s = makeFinalTableSession(cfg({ heroStackBb: 25, avgOppBb: 12 }));
    const line = ftCoachLine("medio", ftHeroContext(s), "media");
    expect(line).toContain("$");
    expect(line).toContain("15–25bb");
  });

  it("coach de stack muito curto recomenda shove/fold", () => {
    const s = makeFinalTableSession(cfg({ heroStackBb: 6, avgOppBb: 20 }));
    const line = ftCoachLine("muito_curto", ftHeroContext(s), "alta");
    expect(line.toLowerCase()).toContain("shove");
    expect(line).toContain("press\u00e3o de ICM alta");
  });

  it("press\u00e3o alta adiciona nota de prêmios encurtados", () => {
    const s = makeFinalTableSession(cfg({ heroStackBb: 20 }));
    expect(ftCoachLine("medio", ftHeroContext(s), "alta")).toContain("cada decis\u00e3o pesa mais");
    expect(ftCoachLine("medio", ftHeroContext(s), "baixa")).not.toContain("cada decis\u00e3o pesa mais");
  });
});

describe("ftContextSummary", () => {
  it("resumo traz blinds, stack, lugar e prêmio", () => {
    const s = makeFinalTableSession(cfg());
    const { lines, icmPercent } = ftContextSummary(s, ftHeroContext(s));
    expect(lines.some((l) => l.includes("Blinds"))).toBe(true);
    expect(lines.some((l) => l.includes("Seu stack"))).toBe(true);
    expect(lines.some((l) => l.includes("Se cair agora"))).toBe(true);
    expect(icmPercent).toBeGreaterThanOrEqual(0);
  });
});

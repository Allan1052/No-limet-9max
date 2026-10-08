import { describe, expect, it } from "vitest";
import { analisarRitmo, decidirAjuste, esperadoKgSemana, inclinacao, tendencia } from "./adaptive";
import type { WeightLog } from "./types";

const log = (data_registro: string, peso_kg: number): WeightLog => ({
  id: data_registro,
  user_id: "u",
  peso_kg,
  data_registro,
  created_at: `${data_registro}T08:00:00Z`,
});

const HOJE = "2026-10-29";

describe("inclinação e previsão", () => {
  it("regressão linear simples", () => {
    expect(inclinacao([{ x: 0, y: 10 }, { x: 1, y: 8 }, { x: 2, y: 6 }])).toBeCloseTo(-2);
    expect(inclinacao([{ x: 0, y: 5 }])).toBe(0);
  });

  it("450 kcal/dia ≈ −0,41 kg/semana", () => {
    expect(esperadoKgSemana(450)).toBe(-0.41);
    expect(esperadoKgSemana(0)).toBe(-0);
  });
});

describe("analisarRitmo", () => {
  it("dados insuficientes: menos de 3 registros ou menos de 14 dias", () => {
    expect(analisarRitmo([log("2026-10-22", 90), log("2026-10-29", 89)], 450, HOJE).status).toBe("dados_insuficientes");
    expect(
      analisarRitmo([log("2026-10-20", 90), log("2026-10-25", 89.5), log("2026-10-29", 89)], 450, HOJE).status,
    ).toBe("dados_insuficientes");
  });

  it("no ritmo: ~0,4 kg/semana com déficit de 450", () => {
    const a = analisarRitmo([log("2026-10-08", 90), log("2026-10-15", 89.6), log("2026-10-22", 89.2), log("2026-10-29", 88.8)], 450, HOJE);
    expect(a.status).toBe("no_ritmo");
    expect(a.ritmo_kg_semana).toBe(-0.4);
    expect(a.sugestao_kcal).toBe(0);
  });

  it("lento (parado) → sugere −100 kcal", () => {
    const a = analisarRitmo([log("2026-10-08", 90), log("2026-10-15", 90.2), log("2026-10-22", 89.9), log("2026-10-29", 90)], 450, HOJE);
    expect(a.status).toBe("lento");
    expect(a.sugestao_kcal).toBe(-100);
  });

  it("rápido demais (>1% do peso/semana) → sugere +100 kcal", () => {
    const a = analisarRitmo([log("2026-10-08", 90), log("2026-10-15", 88.8), log("2026-10-22", 87.6), log("2026-10-29", 86.4)], 450, HOJE);
    expect(a.status).toBe("rapido");
    expect(a.pct_peso_semana).toBeGreaterThan(1);
    expect(a.sugestao_kcal).toBe(100);
  });

  it("ignora registros fora da janela de 35 dias", () => {
    const a = analisarRitmo([log("2026-08-01", 100), log("2026-10-08", 90), log("2026-10-15", 89.6), log("2026-10-29", 88.8)], 450, HOJE);
    expect(a.ritmo_kg_semana).toBe(-0.4);
  });
});

describe("decidirAjuste", () => {
  const lento = analisarRitmo([log("2026-10-08", 90), log("2026-10-15", 90.2), log("2026-10-29", 90)], 450, HOJE);

  it("aplica o passo quando passou o intervalo", () => {
    expect(decidirAjuste(lento, 0, null, HOJE, false)).toMatchObject({ novo_ajuste_kcal: -100, aplicado: true });
    expect(decidirAjuste(lento, -100, "2026-10-10", HOJE, false)).toMatchObject({ novo_ajuste_kcal: -200, aplicado: true });
  });

  it("espera 14 dias entre ajustes", () => {
    const d = decidirAjuste(lento, -100, "2026-10-22", HOJE, false);
    expect(d).toMatchObject({ novo_ajuste_kcal: -100, aplicado: false });
    expect(d.motivo).toMatch(/7 dias/);
  });

  it("respeita o limite de ±300 kcal", () => {
    expect(decidirAjuste(lento, -300, null, HOJE, false)).toMatchObject({ novo_ajuste_kcal: -300, aplicado: false });
  });

  it("manutenção zera o ajuste", () => {
    expect(decidirAjuste(lento, -200, null, HOJE, true)).toMatchObject({ novo_ajuste_kcal: 0, aplicado: true });
  });
});

describe("tendencia", () => {
  it("suaviza picos", () => {
    const t = tendencia([90, 92, 89, 90]);
    expect(t[0]).toBe(90);
    expect(t[1]).toBeLessThan(92);
    expect(Math.max(...t) - Math.min(...t)).toBeLessThan(3);
  });
});

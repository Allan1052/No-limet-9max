import { describe, expect, it } from "vitest";
import {
  ErroDadosInvalidos,
  calcularCaloriasMeta,
  calcularGastoTotal,
  calcularIMC,
  calcularMetaAgua,
  calcularMetaProteina,
  calcularTMB,
  classificarIMC,
  progresso,
  recalcularPlano,
} from "./calculations";

describe("TMB — Mifflin-St Jeor", () => {
  it("homem: 10·peso + 6,25·altura − 5·idade + 5", () => {
    // 900 + 1093,75 − 175 + 5 = 1823,75
    expect(calcularTMB({ peso_kg: 90, altura_cm: 175, idade: 35, sexo: "masculino" })).toBe(1824);
  });

  it("mulher: 10·peso + 6,25·altura − 5·idade − 161", () => {
    // 700 + 1031,25 − 150 − 161 = 1420,25
    expect(calcularTMB({ peso_kg: 70, altura_cm: 165, idade: 30, sexo: "feminino" })).toBe(1420);
  });

  it("diferença entre os sexos é exatamente 166 kcal (antes do arredondamento)", () => {
    const base = { peso_kg: 80, altura_cm: 180, idade: 40 };
    expect(calcularTMB({ ...base, sexo: "masculino" }) - calcularTMB({ ...base, sexo: "feminino" })).toBe(166);
  });
});

describe("metas diárias", () => {
  it("água = peso × 35 ml", () => {
    expect(calcularMetaAgua(90)).toBe(3150);
    expect(calcularMetaAgua(72.4)).toBe(2534);
  });

  it("proteína = peso × 1,8 g", () => {
    expect(calcularMetaProteina(90)).toBe(162);
    expect(calcularMetaProteina(72.4)).toBe(130);
  });

  it("gasto total aplica o fator de atividade", () => {
    expect(calcularGastoTotal(1824, "sedentario")).toBe(2189);
    expect(calcularGastoTotal(1420, "leve")).toBe(1953);
    expect(calcularGastoTotal(1500, "muito_intenso")).toBe(2850);
  });
});

describe("calorias com déficit seguro", () => {
  it("aplica déficit padrão de 450 kcal", () => {
    expect(calcularCaloriasMeta(2189, "masculino")).toEqual({ calorias_meta: 1739, deficit_aplicado: 450 });
  });

  it("limita o déficit à faixa 400–500 kcal", () => {
    expect(calcularCaloriasMeta(2500, "masculino", { deficit: 900 }).deficit_aplicado).toBe(500);
    expect(calcularCaloriasMeta(2500, "masculino", { deficit: 100 }).deficit_aplicado).toBe(400);
  });

  it("aplica o ajuste adaptativo, limitado a ±300 kcal", () => {
    expect(calcularCaloriasMeta(2500, "masculino", { ajuste_kcal: -100 }).calorias_meta).toBe(1950);
    expect(calcularCaloriasMeta(2500, "masculino", { ajuste_kcal: 200 }).calorias_meta).toBe(2250);
    expect(calcularCaloriasMeta(2500, "masculino", { ajuste_kcal: -900 }).calorias_meta).toBe(1750);
  });

  it("o ajuste nunca fura o piso calórico", () => {
    expect(calcularCaloriasMeta(1700, "feminino", { ajuste_kcal: -300 }).calorias_meta).toBe(1200);
  });

  it("manutenção: sem déficit e sem ajuste", () => {
    expect(calcularCaloriasMeta(2200, "feminino", { modo: "manutencao", ajuste_kcal: -300 })).toEqual({
      calorias_meta: 2200,
      deficit_aplicado: 0,
    });
  });

  it("nunca desce do piso por sexo (1200 F / 1500 M) — o déficit encolhe", () => {
    expect(calcularCaloriasMeta(1500, "feminino")).toEqual({ calorias_meta: 1200, deficit_aplicado: 300 });
    expect(calcularCaloriasMeta(1800, "masculino")).toEqual({ calorias_meta: 1500, deficit_aplicado: 300 });
  });

  it("gasto abaixo do piso → déficit zero (não fica negativo)", () => {
    expect(calcularCaloriasMeta(1112, "feminino")).toEqual({ calorias_meta: 1200, deficit_aplicado: 0 });
  });
});

describe("IMC", () => {
  it("calcula com 1 casa decimal", () => {
    expect(calcularIMC(90, 175)).toBe(29.4);
    expect(calcularIMC(70, 165)).toBe(25.7);
  });

  it.each([
    [17.9, "abaixo"],
    [18.5, "normal"],
    [24.9, "normal"],
    [25, "sobrepeso"],
    [30, "obesidade_1"],
    [35, "obesidade_2"],
    [40, "obesidade_3"],
  ] as const)("IMC %s → %s", (imc, classe) => {
    expect(classificarIMC(imc).classe).toBe(classe);
  });
});

describe("recalcularPlano (recálculo adaptativo)", () => {
  const pessoa = { altura_cm: 175, idade: 35, sexo: "masculino" as const };

  it("produz o plano completo", () => {
    expect(recalcularPlano({ ...pessoa, peso_kg: 90 }, "sedentario")).toEqual({
      tmb: 1824,
      gasto_total: 2189,
      calorias_meta: 1739,
      deficit_aplicado: 450,
      meta_agua_ml: 3150,
      meta_proteina_g: 162,
      imc: 29.4,
      modo: "deficit",
    });
  });

  it("gestante/amamentando → manutenção (sem déficit)", () => {
    const p = recalcularPlano({ ...pessoa, peso_kg: 90, sexo: "feminino" }, "leve", { gestante_lactante: true });
    expect(p.modo).toBe("manutencao");
    expect(p.calorias_meta).toBe(p.gasto_total);
  });

  it("IMC abaixo de 18,5 → manutenção", () => {
    const p = recalcularPlano({ ...pessoa, peso_kg: 55 }, "leve");
    expect(p.imc).toBeLessThan(18.5);
    expect(p.modo).toBe("manutencao");
    expect(p.deficit_aplicado).toBe(0);
  });

  it("menor de 18 anos é recusado", () => {
    expect(() => recalcularPlano({ ...pessoa, peso_kg: 70, idade: 17 }, "leve")).toThrow(ErroDadosInvalidos);
  });

  it("perder peso reduz TMB, água, proteína e calorias", () => {
    const antes = recalcularPlano({ ...pessoa, peso_kg: 90 }, "moderado");
    const depois = recalcularPlano({ ...pessoa, peso_kg: 87 }, "moderado");
    expect(depois.tmb).toBe(antes.tmb - 30);
    expect(depois.meta_agua_ml).toBe(antes.meta_agua_ml - 105);
    expect(depois.meta_proteina_g).toBeLessThan(antes.meta_proteina_g);
    expect(depois.calorias_meta).toBeLessThan(antes.calorias_meta);
  });

  it("rejeita dados fora da faixa", () => {
    expect(() => recalcularPlano({ ...pessoa, peso_kg: 10 }, "leve")).toThrow(ErroDadosInvalidos);
    expect(() => recalcularPlano({ ...pessoa, peso_kg: Number.NaN }, "leve")).toThrow(ErroDadosInvalidos);
    expect(() => recalcularPlano({ ...pessoa, peso_kg: 80, idade: 12 }, "leve")).toThrow(ErroDadosInvalidos);
  });
});

describe("progresso", () => {
  it("fica entre 0 e 1 e tolera meta zero", () => {
    expect(progresso(500, 2000)).toBe(0.25);
    expect(progresso(3000, 2000)).toBe(1);
    expect(progresso(100, 0)).toBe(0);
  });
});

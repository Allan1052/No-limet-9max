import type { DadosCorporais, ModoPlano, NivelAtividade, PlanoMetas, Sexo } from "./types";

/**
 * Funções puras de cálculo. A MESMA lógica está espelhada em SQL no trigger
 * `calcular_metas_profile` (supabase/migrations/0001_init.sql). Se mudar aqui,
 * mude lá — os testes de calculations.test.ts documentam os valores esperados.
 */

export const ML_AGUA_POR_KG = 35;
export const G_PROTEINA_POR_KG = 1.8;

/** Déficit diário alvo (kcal). Faixa segura pedida: 400–500 kcal. */
export const DEFICIT_PADRAO_KCAL = 450;
export const DEFICIT_MIN_KCAL = 400;
export const DEFICIT_MAX_KCAL = 500;

/** Limite do ajuste automático do recálculo adaptativo (kcal). */
export const AJUSTE_MAX_KCAL = 300;

/** Abaixo deste IMC o app não propõe déficit (só manutenção). */
export const IMC_MIN_DEFICIT = 18.5;

/** Piso calórico: nunca recomendar abaixo disso sem acompanhamento profissional. */
export const PISO_CALORICO: Readonly<Record<Sexo, number>> = {
  feminino: 1200,
  masculino: 1500,
};

export const FATOR_ATIVIDADE: Readonly<Record<NivelAtividade, number>> = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  intenso: 1.725,
  muito_intenso: 1.9,
};

export const LIMITES = {
  peso_kg: { min: 30, max: 350 },
  altura_cm: { min: 120, max: 230 },
  // Menores de 18 estão em crescimento: dieta com déficit só com acompanhamento.
  idade: { min: 18, max: 100 },
  horas_sentado: { min: 0, max: 18 },
} as const;

export class ErroDadosInvalidos extends Error {
  constructor(public readonly campo: string, mensagem: string) {
    super(mensagem);
    this.name = "ErroDadosInvalidos";
  }
}

function exigirFaixa(campo: keyof typeof LIMITES, valor: number, rotulo: string): void {
  const { min, max } = LIMITES[campo];
  if (!Number.isFinite(valor) || valor < min || valor > max) {
    throw new ErroDadosInvalidos(campo, `${rotulo} deve estar entre ${min} e ${max}.`);
  }
}

export function validarDadosCorporais(d: DadosCorporais): void {
  exigirFaixa("peso_kg", d.peso_kg, "Peso (kg)");
  exigirFaixa("altura_cm", d.altura_cm, "Altura (cm)");
  exigirFaixa("idade", d.idade, "Idade");
}

/** Taxa Metabólica Basal — Mifflin-St Jeor (kcal/dia, arredondada). */
export function calcularTMB({ peso_kg, altura_cm, idade, sexo }: DadosCorporais): number {
  const base = 10 * peso_kg + 6.25 * altura_cm - 5 * idade;
  return Math.round(sexo === "masculino" ? base + 5 : base - 161);
}

/** Gasto energético total = TMB × fator de atividade. */
export function calcularGastoTotal(tmb: number, nivel: NivelAtividade): number {
  return Math.round(tmb * FATOR_ATIVIDADE[nivel]);
}

export interface OpcoesCalorias {
  deficit?: number;
  /** Ajuste do recálculo adaptativo, limitado a ±300 kcal. */
  ajuste_kcal?: number;
  modo?: ModoPlano;
}

/**
 * Calorias para déficit seguro. O déficit fica na faixa 400–500 kcal (mais o
 * ajuste adaptativo), mas a meta nunca desce do piso por sexo — se o piso
 * "come" o déficit, o déficit encolhe. Em manutenção não há déficit.
 */
export function calcularCaloriasMeta(
  gastoTotal: number,
  sexo: Sexo,
  { deficit = DEFICIT_PADRAO_KCAL, ajuste_kcal = 0, modo = "deficit" }: OpcoesCalorias = {},
): { calorias_meta: number; deficit_aplicado: number } {
  let base: number;
  if (modo === "manutencao") {
    base = gastoTotal;
  } else {
    const alvo = Math.min(DEFICIT_MAX_KCAL, Math.max(DEFICIT_MIN_KCAL, deficit));
    const ajuste = Math.min(AJUSTE_MAX_KCAL, Math.max(-AJUSTE_MAX_KCAL, Math.round(ajuste_kcal)));
    base = gastoTotal - alvo + ajuste;
  }
  const calorias = Math.max(PISO_CALORICO[sexo], base);
  return { calorias_meta: calorias, deficit_aplicado: Math.max(0, gastoTotal - calorias) };
}

export function calcularMetaAgua(peso_kg: number): number {
  return Math.round(peso_kg * ML_AGUA_POR_KG);
}

export function calcularMetaProteina(peso_kg: number): number {
  return Math.round(peso_kg * G_PROTEINA_POR_KG);
}

/** IMC com 1 casa decimal. */
export function calcularIMC(peso_kg: number, altura_cm: number): number {
  const m = altura_cm / 100;
  return Math.round((peso_kg / (m * m)) * 10) / 10;
}

export type ClasseIMC =
  | "abaixo"
  | "normal"
  | "sobrepeso"
  | "obesidade_1"
  | "obesidade_2"
  | "obesidade_3";

export interface ClassificacaoIMC {
  classe: ClasseIMC;
  rotulo: string;
  /** Classe Tailwind de cor para o selo. */
  cor: string;
}

/** Faixas da OMS para adultos. */
export function classificarIMC(imc: number): ClassificacaoIMC {
  if (imc < 18.5) return { classe: "abaixo", rotulo: "Abaixo do peso", cor: "bg-sky-100 text-sky-800" };
  if (imc < 25) return { classe: "normal", rotulo: "Peso adequado", cor: "bg-emerald-100 text-emerald-800" };
  if (imc < 30) return { classe: "sobrepeso", rotulo: "Sobrepeso", cor: "bg-amber-100 text-amber-800" };
  if (imc < 35) return { classe: "obesidade_1", rotulo: "Obesidade grau I", cor: "bg-orange-100 text-orange-800" };
  if (imc < 40) return { classe: "obesidade_2", rotulo: "Obesidade grau II", cor: "bg-red-100 text-red-800" };
  return { classe: "obesidade_3", rotulo: "Obesidade grau III", cor: "bg-red-200 text-red-900" };
}

export interface OpcoesPlano {
  ajuste_kcal?: number;
  gestante_lactante?: boolean;
}

/**
 * Manutenção (sem déficit) quando emagrecer não é indicado sem acompanhamento:
 * gestante/amamentando ou IMC abaixo de 18,5.
 */
export function definirModo(imc: number, gestante_lactante: boolean): ModoPlano {
  return gestante_lactante || imc < IMC_MIN_DEFICIT ? "manutencao" : "deficit";
}

/**
 * Recálculo completo do plano. Chamado no onboarding e a CADA novo check-in de
 * peso — é o "coração" do recálculo adaptativo.
 */
export function recalcularPlano(
  dados: DadosCorporais,
  nivel: NivelAtividade,
  { ajuste_kcal = 0, gestante_lactante = false }: OpcoesPlano = {},
): PlanoMetas {
  validarDadosCorporais(dados);
  const tmb = calcularTMB(dados);
  const gasto_total = calcularGastoTotal(tmb, nivel);
  const imc = calcularIMC(dados.peso_kg, dados.altura_cm);
  const modo = definirModo(imc, gestante_lactante);
  const { calorias_meta, deficit_aplicado } = calcularCaloriasMeta(gasto_total, dados.sexo, { ajuste_kcal, modo });
  return {
    tmb,
    gasto_total,
    calorias_meta,
    deficit_aplicado,
    meta_agua_ml: calcularMetaAgua(dados.peso_kg),
    meta_proteina_g: calcularMetaProteina(dados.peso_kg),
    imc,
    modo,
  };
}

/** Progresso 0–1 (limitado), seguro contra meta zero. */
export function progresso(valor: number, meta: number): number {
  if (meta <= 0) return 0;
  return Math.min(1, Math.max(0, valor / meta));
}

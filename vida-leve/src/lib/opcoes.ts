import type { NivelAtividade, Sexo, Transporte } from "./types";

export const OPCOES_SEXO: readonly { valor: Sexo; rotulo: string }[] = [
  { valor: "feminino", rotulo: "Feminino" },
  { valor: "masculino", rotulo: "Masculino" },
];

export const OPCOES_ATIVIDADE: readonly { valor: NivelAtividade; rotulo: string; detalhe: string }[] = [
  { valor: "sedentario", rotulo: "Sedentário", detalhe: "Pouco ou nenhum exercício" },
  { valor: "leve", rotulo: "Leve", detalhe: "Exercício 1–3× por semana" },
  { valor: "moderado", rotulo: "Moderado", detalhe: "Exercício 3–5× por semana" },
  { valor: "intenso", rotulo: "Intenso", detalhe: "Exercício 6–7× por semana" },
  { valor: "muito_intenso", rotulo: "Muito intenso", detalhe: "Trabalho físico pesado ou 2 treinos/dia" },
];

export const OPCOES_TRANSPORTE: readonly { valor: Transporte; rotulo: string }[] = [
  { valor: "onibus", rotulo: "🚌 Ônibus" },
  { valor: "metro", rotulo: "🚇 Metrô / trem" },
  { valor: "carro", rotulo: "🚗 Carro" },
  { valor: "moto", rotulo: "🏍️ Moto" },
  { valor: "bicicleta", rotulo: "🚲 Bicicleta" },
  { valor: "a_pe", rotulo: "🚶 A pé" },
  { valor: "home_office", rotulo: "🏠 Home office" },
];

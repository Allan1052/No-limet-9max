import { useState } from "react";
import { LIMITES } from "../lib/calculations";
import type { NivelAtividade, ProfileInput, Sexo, Transporte } from "../lib/types";

/** Campos numéricos ficam como texto enquanto o usuário digita (aceita vírgula). */
export interface FormPerfil {
  nome: string;
  idade: string;
  sexo: Sexo;
  altura_cm: string;
  peso_inicial: string;
  nivel_atividade: NivelAtividade;
  transporte: Transporte;
  horas_sentado: string;
  sobe_escadas: boolean;
  pratica_atividade: boolean;
}

export type ErrosForm = Partial<Record<keyof FormPerfil, string>>;

export const paraNumero = (s: string): number => Number(s.trim().replace(",", "."));

const vazio: FormPerfil = {
  nome: "",
  idade: "",
  sexo: "feminino",
  altura_cm: "",
  peso_inicial: "",
  nivel_atividade: "sedentario",
  transporte: "onibus",
  horas_sentado: "8",
  sobe_escadas: false,
  pratica_atividade: false,
};

export function deProfile(p: ProfileInput): FormPerfil {
  return {
    ...p,
    idade: String(p.idade),
    altura_cm: String(p.altura_cm),
    peso_inicial: String(p.peso_inicial).replace(".", ","),
    horas_sentado: String(p.horas_sentado),
  };
}

function faixa(campo: keyof typeof LIMITES, valor: number, rotulo: string): string | undefined {
  const { min, max } = LIMITES[campo];
  return Number.isFinite(valor) && valor >= min && valor <= max ? undefined : `${rotulo}: entre ${min} e ${max}`;
}

export function validarBasico(f: FormPerfil): ErrosForm {
  const e: ErrosForm = {};
  if (!f.nome.trim()) e.nome = "Como podemos te chamar?";
  const idade = paraNumero(f.idade);
  e.idade = faixa("idade", idade, "Idade") ?? (Number.isInteger(idade) ? undefined : "Idade em anos inteiros");
  e.altura_cm = faixa("altura_cm", paraNumero(f.altura_cm), "Altura em cm");
  e.peso_inicial = faixa("peso_kg", paraNumero(f.peso_inicial), "Peso em kg");
  return limpar(e);
}

export function validarRotina(f: FormPerfil): ErrosForm {
  return limpar({ horas_sentado: faixa("horas_sentado", paraNumero(f.horas_sentado), "Horas sentado") });
}

function limpar(e: ErrosForm): ErrosForm {
  return Object.fromEntries(Object.entries(e).filter(([, v]) => v)) as ErrosForm;
}

export function paraInput(f: FormPerfil): ProfileInput {
  return {
    nome: f.nome.trim(),
    idade: paraNumero(f.idade),
    sexo: f.sexo,
    altura_cm: paraNumero(f.altura_cm),
    peso_inicial: Math.round(paraNumero(f.peso_inicial) * 10) / 10,
    nivel_atividade: f.nivel_atividade,
    transporte: f.transporte,
    horas_sentado: paraNumero(f.horas_sentado),
    sobe_escadas: f.sobe_escadas,
    pratica_atividade: f.pratica_atividade,
  };
}

export function useProfileForm(inicial?: ProfileInput) {
  const [form, setForm] = useState<FormPerfil>(inicial ? deProfile(inicial) : vazio);
  const [erros, setErros] = useState<ErrosForm>({});
  const set = <K extends keyof FormPerfil>(campo: K, valor: FormPerfil[K]) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  };
  return { form, set, erros, setErros };
}

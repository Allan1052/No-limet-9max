export type Sexo = "masculino" | "feminino";

export type NivelAtividade = "sedentario" | "leve" | "moderado" | "intenso" | "muito_intenso";

export type Transporte = "carro" | "moto" | "onibus" | "metro" | "bicicleta" | "a_pe" | "home_office";

export type TipoHabito = "movimento" | "transporte" | "postura" | "hidratacao" | "alimentacao" | "sono";

/** Dados corporais mínimos para os cálculos metabólicos. */
export interface DadosCorporais {
  peso_kg: number;
  altura_cm: number;
  idade: number;
  sexo: Sexo;
}

/** Questionário de rotina diária (onboarding). */
export interface Rotina {
  transporte: Transporte;
  horas_sentado: number;
  sobe_escadas: boolean;
  pratica_atividade: boolean;
}

/** O que o usuário preenche no onboarding / edição de perfil. */
export interface ProfileInput extends Rotina {
  nome: string;
  idade: number;
  sexo: Sexo;
  altura_cm: number;
  peso_inicial: number;
  nivel_atividade: NivelAtividade;
}

/** Metas calculadas — sempre derivadas do peso atual. */
export interface PlanoMetas {
  tmb: number;
  gasto_total: number;
  calorias_meta: number;
  deficit_aplicado: number;
  meta_agua_ml: number;
  meta_proteina_g: number;
  imc: number;
}

export interface Profile extends ProfileInput {
  id: string;
  peso_atual: number;
  tmb: number;
  meta_agua_ml: number;
  meta_proteina_g: number;
  calorias_meta: number;
  created_at: string;
  updated_at: string;
}

export interface WeightLog {
  id: string;
  user_id: string;
  peso_kg: number;
  /** Data local no formato AAAA-MM-DD. */
  data_registro: string;
  created_at: string;
}

export interface WaterLog {
  id: string;
  user_id: string;
  quantidade_ml: number;
  data: string;
  created_at: string;
}

export interface RoutineHabit {
  id: string;
  user_id: string;
  descricao_habito: string;
  tipo: TipoHabito;
  concluido_hoje: boolean;
  /** Dia da última conclusão — usado para "zerar" as missões a cada novo dia. */
  data_conclusao: string | null;
}

export type NovoHabito = Pick<RoutineHabit, "descricao_habito" | "tipo">;

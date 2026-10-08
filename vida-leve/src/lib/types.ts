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

/** Perguntas de segurança: mudam o plano para manutenção ou geram alertas. */
export interface Saude {
  /** Gestante ou amamentando → sem déficit calórico. */
  gestante_lactante: boolean;
  /** Diabetes, doença renal, cardíaca, uso de remédio contínuo etc. → alerta forte. */
  condicao_saude: boolean;
}

/** O que o usuário preenche no onboarding / edição de perfil. */
export interface ProfileInput extends Rotina, Saude {
  nome: string;
  idade: number;
  sexo: Sexo;
  altura_cm: number;
  peso_inicial: number;
  nivel_atividade: NivelAtividade;
}

export type ModoPlano = "deficit" | "manutencao";

/** Metas calculadas — sempre derivadas do peso atual. */
export interface PlanoMetas {
  tmb: number;
  gasto_total: number;
  calorias_meta: number;
  deficit_aplicado: number;
  meta_agua_ml: number;
  meta_proteina_g: number;
  imc: number;
  modo: ModoPlano;
}

export interface Profile extends ProfileInput {
  id: string;
  peso_atual: number;
  tmb: number;
  meta_agua_ml: number;
  meta_proteina_g: number;
  calorias_meta: number;
  /** Ajuste automático (kcal) feito pelo recálculo adaptativo, de −300 a +300. */
  ajuste_kcal: number;
  ultimo_ajuste_em: string | null;
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

export interface TotalDia {
  data: string;
  total: number;
}

/** Missão de um dia específico. As missões mudam a cada dia. */
export interface RoutineHabit {
  id: string;
  user_id: string;
  data: string;
  missao_id: string;
  nivel: number;
  descricao_habito: string;
  tipo: TipoHabito;
  concluido_hoje: boolean;
}

export type NovoHabito = Pick<RoutineHabit, "missao_id" | "nivel" | "descricao_habito" | "tipo">;

export interface FoodLog {
  id: string;
  user_id: string;
  data: string;
  nome: string;
  proteina_g: number;
  calorias: number;
  created_at: string;
}

export type NovoAlimento = Pick<FoodLog, "nome" | "proteina_g" | "calorias">;

export interface FoodTotalDia {
  data: string;
  proteina_g: number;
  calorias: number;
}

export interface Measurement {
  id: string;
  user_id: string;
  data: string;
  cintura_cm: number;
  quadril_cm: number | null;
  created_at: string;
}

/** O que um parceiro enxerga (só o que a pessoa escolheu compartilhar). */
export interface ResumoPublico {
  atualizado_em: string;
  pct_dia: number;
  sequencia_agua: number;
  sequencia_missoes: number;
  missoes_hoje: number;
  missoes_total_hoje: number;
  kg_perdidos: number | null;
}

export interface Parceiro {
  id: string;
  nome: string;
  resumo: ResumoPublico | null;
}

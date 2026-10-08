import type {
  FoodLog,
  FoodTotalDia,
  Measurement,
  NovoAlimento,
  NovoHabito,
  Parceiro,
  Profile,
  ProfileInput,
  ResumoPublico,
  RoutineHabit,
  TotalDia,
  WaterLog,
  WeightLog,
} from "../lib/types";

/**
 * Contrato único de dados. Duas implementações:
 * - LocalRepository: navegador (localStorage), sem login — ideal para testar.
 * - SupabaseRepository: Postgres + Auth; o recálculo roda no trigger do banco.
 */
export interface Repository {
  readonly modo: "local" | "supabase";

  /** Id estável do usuário (semente do sorteio das missões). */
  userId(): Promise<string>;

  getProfile(): Promise<Profile | null>;
  /** Cria ou atualiza o perfil; as metas voltam já recalculadas. */
  saveProfile(input: ProfileInput): Promise<Profile>;
  /** Grava o ajuste adaptativo de calorias; devolve o perfil recalculado. */
  setAjuste(ajuste_kcal: number, data: string): Promise<Profile>;

  listWeightLogs(): Promise<WeightLog[]>;
  /** Salva a pesagem e devolve o perfil com o plano recalculado. */
  addWeightLog(peso_kg: number, data_registro: string): Promise<Profile>;
  deleteWeightLog(id: string): Promise<Profile>;

  listWaterLogs(data: string): Promise<WaterLog[]>;
  listWaterTotals(desde: string): Promise<TotalDia[]>;
  addWater(quantidade_ml: number, data: string): Promise<WaterLog>;
  deleteWater(id: string): Promise<void>;

  /** Histórico de missões desde a data (inclui hoje). */
  listHabits(desde: string): Promise<RoutineHabit[]>;
  /** Grava as missões de um dia (substitui as NÃO concluídas desse dia). */
  setDayHabits(data: string, habitos: NovoHabito[]): Promise<RoutineHabit[]>;
  setHabitDone(id: string, concluido: boolean): Promise<RoutineHabit>;

  listFood(data: string): Promise<FoodLog[]>;
  listFoodTotals(desde: string): Promise<FoodTotalDia[]>;
  addFood(alimento: NovoAlimento, data: string): Promise<FoodLog>;
  deleteFood(id: string): Promise<void>;

  listMeasurements(): Promise<Measurement[]>;
  addMeasurement(m: Pick<Measurement, "data" | "cintura_cm" | "quadril_cm">): Promise<Measurement>;
  deleteMeasurement(id: string): Promise<void>;

  /** Todos os dados da pessoa (LGPD: portabilidade). */
  exportAll(): Promise<Record<string, unknown>>;
  /** Apaga TODOS os dados (e a conta, no Supabase). */
  deleteAll(): Promise<void>;
  /** Supabase: sai da conta. Local: não faz nada. */
  signOut(): Promise<void>;

  // ── Modo dupla (só na nuvem) ──
  readonly suportaParceiros: boolean;
  meuCodigoConvite(): Promise<string | null>;
  conectarParceiro(codigo: string): Promise<void>;
  listParceiros(): Promise<Parceiro[]>;
  removerParceiro(id: string): Promise<void>;
  publicarResumo(resumo: ResumoPublico): Promise<void>;
}

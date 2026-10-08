import type { NovoHabito, Profile, ProfileInput, RoutineHabit, WaterLog, WeightLog } from "../lib/types";

/**
 * Contrato único de dados. Duas implementações:
 * - LocalRepository: navegador (localStorage), sem login — ideal para testar.
 * - SupabaseRepository: Postgres + Auth; o recálculo roda no trigger do banco.
 */
export interface Repository {
  readonly modo: "local" | "supabase";

  getProfile(): Promise<Profile | null>;
  /** Cria ou atualiza o perfil; as metas voltam já recalculadas. */
  saveProfile(input: ProfileInput): Promise<Profile>;

  listWeightLogs(): Promise<WeightLog[]>;
  /** Salva a pesagem e devolve o perfil com o plano recalculado. */
  addWeightLog(peso_kg: number, data_registro: string): Promise<Profile>;
  deleteWeightLog(id: string): Promise<Profile>;

  listWaterLogs(data: string): Promise<WaterLog[]>;
  addWater(quantidade_ml: number, data: string): Promise<WaterLog>;
  deleteWater(id: string): Promise<void>;

  listHabits(): Promise<RoutineHabit[]>;
  replaceHabits(habitos: NovoHabito[]): Promise<RoutineHabit[]>;
  setHabitDone(id: string, concluido: boolean, data: string): Promise<RoutineHabit>;

  /** Modo local: apaga tudo. Supabase: sai da conta. */
  reset(): Promise<void>;
}

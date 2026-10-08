import type { SupabaseClient } from "@supabase/supabase-js";
import { validarDadosCorporais } from "../lib/calculations";
import type { NovoHabito, Profile, ProfileInput, RoutineHabit, WaterLog, WeightLog } from "../lib/types";
import type { Repository } from "./repository";

/** Postgres devolve numeric como string em alguns casos — normaliza. */
const num = (v: unknown): number => (typeof v === "number" ? v : Number(v));

function mapProfile(r: Record<string, unknown>): Profile {
  return {
    ...(r as unknown as Profile),
    idade: num(r.idade),
    altura_cm: num(r.altura_cm),
    peso_inicial: num(r.peso_inicial),
    peso_atual: num(r.peso_atual),
    horas_sentado: num(r.horas_sentado),
    tmb: num(r.tmb),
    meta_agua_ml: num(r.meta_agua_ml),
    meta_proteina_g: num(r.meta_proteina_g),
    calorias_meta: num(r.calorias_meta),
  };
}

const mapWeight = (r: Record<string, unknown>): WeightLog => ({ ...(r as unknown as WeightLog), peso_kg: num(r.peso_kg) });

function falhar(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export class SupabaseRepository implements Repository {
  readonly modo = "supabase" as const;

  constructor(private readonly db: SupabaseClient) {}

  private async uid(): Promise<string> {
    const { data, error } = await this.db.auth.getUser();
    falhar(error);
    if (!data.user) throw new Error("Sessão expirada. Entre novamente.");
    return data.user.id;
  }

  async getProfile(): Promise<Profile | null> {
    const id = await this.uid();
    const { data, error } = await this.db.from("profiles").select("*").eq("id", id).maybeSingle();
    falhar(error);
    return data ? mapProfile(data) : null;
  }

  async saveProfile(input: ProfileInput): Promise<Profile> {
    validarDadosCorporais({ peso_kg: input.peso_inicial, altura_cm: input.altura_cm, idade: input.idade, sexo: input.sexo });
    const id = await this.uid();
    const atual = await this.getProfile();
    // Se já há pesagens e o peso inicial não mudou, mantém o peso atual (o trigger recalcula as metas).
    const peso_atual = atual && atual.peso_inicial === input.peso_inicial ? atual.peso_atual : input.peso_inicial;
    const { data, error } = await this.db
      .from("profiles")
      .upsert({ ...input, id, peso_atual })
      .select("*")
      .single();
    falhar(error);
    return mapProfile(data);
  }

  async listWeightLogs(): Promise<WeightLog[]> {
    const { data, error } = await this.db
      .from("weight_logs")
      .select("*")
      .order("data_registro", { ascending: true })
      .order("created_at", { ascending: true });
    falhar(error);
    return (data ?? []).map(mapWeight);
  }

  async addWeightLog(peso_kg: number, data_registro: string): Promise<Profile> {
    const user_id = await this.uid();
    const { error } = await this.db.from("weight_logs").insert({ user_id, peso_kg, data_registro });
    falhar(error);
    // O trigger já atualizou peso_atual e recalculou as metas no banco.
    const p = await this.getProfile();
    if (!p) throw new Error("Perfil não encontrado.");
    return p;
  }

  async deleteWeightLog(id: string): Promise<Profile> {
    const { error } = await this.db.from("weight_logs").delete().eq("id", id);
    falhar(error);
    const p = await this.getProfile();
    if (!p) throw new Error("Perfil não encontrado.");
    return p;
  }

  async listWaterLogs(data: string): Promise<WaterLog[]> {
    const { data: rows, error } = await this.db
      .from("water_logs")
      .select("*")
      .eq("data", data)
      .order("created_at", { ascending: true });
    falhar(error);
    return (rows ?? []).map((r) => ({ ...(r as WaterLog), quantidade_ml: num(r.quantidade_ml) }));
  }

  async addWater(quantidade_ml: number, data: string): Promise<WaterLog> {
    const user_id = await this.uid();
    const { data: row, error } = await this.db
      .from("water_logs")
      .insert({ user_id, quantidade_ml, data })
      .select("*")
      .single();
    falhar(error);
    return { ...(row as WaterLog), quantidade_ml: num(row.quantidade_ml) };
  }

  async deleteWater(id: string): Promise<void> {
    const { error } = await this.db.from("water_logs").delete().eq("id", id);
    falhar(error);
  }

  async listHabits(): Promise<RoutineHabit[]> {
    const { data, error } = await this.db.from("routine_habits").select("*").order("created_at", { ascending: true });
    falhar(error);
    return (data ?? []) as RoutineHabit[];
  }

  async replaceHabits(habitos: NovoHabito[]): Promise<RoutineHabit[]> {
    const user_id = await this.uid();
    const del = await this.db.from("routine_habits").delete().eq("user_id", user_id);
    falhar(del.error);
    const { data, error } = await this.db
      .from("routine_habits")
      .insert(habitos.map((h) => ({ ...h, user_id })))
      .select("*");
    falhar(error);
    return (data ?? []) as RoutineHabit[];
  }

  async setHabitDone(id: string, concluido: boolean, data: string): Promise<RoutineHabit> {
    const { data: row, error } = await this.db
      .from("routine_habits")
      .update({ concluido_hoje: concluido, data_conclusao: concluido ? data : null })
      .eq("id", id)
      .select("*")
      .single();
    falhar(error);
    return row as RoutineHabit;
  }

  async reset(): Promise<void> {
    await this.db.auth.signOut();
  }
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { validarDadosCorporais } from "../lib/calculations";
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
import type { Repository } from "./repository";

type Linha = Record<string, unknown>;

/** Postgres devolve numeric como string em alguns casos — normaliza. */
const num = (v: unknown): number => (typeof v === "number" ? v : Number(v));
const numOuNull = (v: unknown): number | null => (v === null || v === undefined ? null : num(v));

const PERFIL_NUM = [
  "idade",
  "altura_cm",
  "peso_inicial",
  "peso_atual",
  "horas_sentado",
  "tmb",
  "meta_agua_ml",
  "meta_proteina_g",
  "calorias_meta",
  "ajuste_kcal",
] as const;

function mapProfile(r: Linha): Profile {
  const p = { ...r } as Linha;
  for (const k of PERFIL_NUM) p[k] = num(r[k]);
  delete p.codigo_convite;
  delete p.resumo_publico;
  return p as unknown as Profile;
}

const mapWeight = (r: Linha): WeightLog => ({ ...(r as unknown as WeightLog), peso_kg: num(r.peso_kg) });
const mapWater = (r: Linha): WaterLog => ({ ...(r as unknown as WaterLog), quantidade_ml: num(r.quantidade_ml) });
const mapHabit = (r: Linha): RoutineHabit => ({ ...(r as unknown as RoutineHabit), nivel: num(r.nivel) });
const mapFood = (r: Linha): FoodLog => ({
  ...(r as unknown as FoodLog),
  proteina_g: num(r.proteina_g),
  calorias: num(r.calorias),
});
const mapMeasurement = (r: Linha): Measurement => ({
  ...(r as unknown as Measurement),
  cintura_cm: num(r.cintura_cm),
  quadril_cm: numOuNull(r.quadril_cm),
});

function falhar(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export class SupabaseRepository implements Repository {
  readonly modo = "supabase" as const;
  readonly suportaParceiros = true;

  constructor(private readonly db: SupabaseClient) {}

  async userId(): Promise<string> {
    const { data, error } = await this.db.auth.getUser();
    falhar(error);
    if (!data.user) throw new Error("Sessão expirada. Entre novamente.");
    return data.user.id;
  }

  private async exigirPerfil(): Promise<Profile> {
    const p = await this.getProfile();
    if (!p) throw new Error("Perfil não encontrado.");
    return p;
  }

  async getProfile(): Promise<Profile | null> {
    const id = await this.userId();
    const { data, error } = await this.db.from("profiles").select("*").eq("id", id).maybeSingle();
    falhar(error);
    return data ? mapProfile(data) : null;
  }

  async saveProfile(input: ProfileInput): Promise<Profile> {
    validarDadosCorporais({ peso_kg: input.peso_inicial, altura_cm: input.altura_cm, idade: input.idade, sexo: input.sexo });
    const id = await this.userId();
    const atual = await this.getProfile();
    if (!atual) {
      const { data, error } = await this.db
        .from("profiles")
        .insert({ ...input, id, peso_atual: input.peso_inicial })
        .select("*")
        .single();
      falhar(error);
      return mapProfile(data);
    }
    const { error } = await this.db.from("profiles").update(input).eq("id", id);
    falhar(error);
    // Se não há check-ins, o peso atual acompanha o peso inicial editado.
    const { count } = await this.db.from("weight_logs").select("id", { count: "exact", head: true });
    if (!count) {
      const r = await this.db.from("profiles").update({ peso_atual: input.peso_inicial }).eq("id", id);
      falhar(r.error);
    }
    return this.exigirPerfil();
  }

  async setAjuste(ajuste_kcal: number, data: string): Promise<Profile> {
    const id = await this.userId();
    const { error } = await this.db.from("profiles").update({ ajuste_kcal, ultimo_ajuste_em: data }).eq("id", id);
    falhar(error);
    return this.exigirPerfil();
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
    const user_id = await this.userId();
    const { error } = await this.db.from("weight_logs").insert({ user_id, peso_kg, data_registro });
    falhar(error);
    // O trigger já atualizou peso_atual e recalculou as metas no banco.
    return this.exigirPerfil();
  }

  async deleteWeightLog(id: string): Promise<Profile> {
    const { error } = await this.db.from("weight_logs").delete().eq("id", id);
    falhar(error);
    return this.exigirPerfil();
  }

  async listWaterLogs(data: string): Promise<WaterLog[]> {
    const { data: rows, error } = await this.db
      .from("water_logs")
      .select("*")
      .eq("data", data)
      .order("created_at", { ascending: true });
    falhar(error);
    return (rows ?? []).map(mapWater);
  }

  async listWaterTotals(desde: string): Promise<TotalDia[]> {
    const { data, error } = await this.db.from("water_logs").select("data, quantidade_ml").gte("data", desde);
    falhar(error);
    const m = new Map<string, number>();
    for (const r of data ?? []) m.set(r.data as string, (m.get(r.data as string) ?? 0) + num(r.quantidade_ml));
    return [...m].map(([d, total]) => ({ data: d, total })).sort((a, b) => a.data.localeCompare(b.data));
  }

  async addWater(quantidade_ml: number, data: string): Promise<WaterLog> {
    const user_id = await this.userId();
    const { data: row, error } = await this.db.from("water_logs").insert({ user_id, quantidade_ml, data }).select("*").single();
    falhar(error);
    return mapWater(row);
  }

  async deleteWater(id: string): Promise<void> {
    const { error } = await this.db.from("water_logs").delete().eq("id", id);
    falhar(error);
  }

  async listHabits(desde: string): Promise<RoutineHabit[]> {
    const { data, error } = await this.db
      .from("routine_habits")
      .select("*")
      .gte("data", desde)
      .order("data", { ascending: true })
      .order("created_at", { ascending: true });
    falhar(error);
    return (data ?? []).map(mapHabit);
  }

  async setDayHabits(data: string, habitos: NovoHabito[]): Promise<RoutineHabit[]> {
    const user_id = await this.userId();
    const del = await this.db.from("routine_habits").delete().eq("data", data).eq("concluido_hoje", false);
    falhar(del.error);
    if (habitos.length) {
      // ignoreDuplicates: mantém as já concluídas (mesma missão no mesmo dia).
      const { error } = await this.db
        .from("routine_habits")
        .upsert(
          habitos.map((h) => ({ ...h, user_id, data })),
          { onConflict: "user_id,data,missao_id", ignoreDuplicates: true },
        );
      falhar(error);
    }
    const { data: rows, error } = await this.db
      .from("routine_habits")
      .select("*")
      .eq("data", data)
      .order("created_at", { ascending: true });
    falhar(error);
    return (rows ?? []).map(mapHabit);
  }

  async setHabitDone(id: string, concluido: boolean): Promise<RoutineHabit> {
    const { data: row, error } = await this.db
      .from("routine_habits")
      .update({ concluido_hoje: concluido })
      .eq("id", id)
      .select("*")
      .single();
    falhar(error);
    return mapHabit(row);
  }

  async listFood(data: string): Promise<FoodLog[]> {
    const { data: rows, error } = await this.db
      .from("food_logs")
      .select("*")
      .eq("data", data)
      .order("created_at", { ascending: true });
    falhar(error);
    return (rows ?? []).map(mapFood);
  }

  async listFoodTotals(desde: string): Promise<FoodTotalDia[]> {
    const { data, error } = await this.db.from("food_logs").select("data, proteina_g, calorias").gte("data", desde);
    falhar(error);
    const m = new Map<string, FoodTotalDia>();
    for (const r of data ?? []) {
      const d = r.data as string;
      const t = m.get(d) ?? { data: d, proteina_g: 0, calorias: 0 };
      t.proteina_g += num(r.proteina_g);
      t.calorias += num(r.calorias);
      m.set(d, t);
    }
    return [...m.values()].sort((a, b) => a.data.localeCompare(b.data));
  }

  async addFood(alimento: NovoAlimento, data: string): Promise<FoodLog> {
    const user_id = await this.userId();
    const { data: row, error } = await this.db
      .from("food_logs")
      .insert({ ...alimento, user_id, data })
      .select("*")
      .single();
    falhar(error);
    return mapFood(row);
  }

  async deleteFood(id: string): Promise<void> {
    const { error } = await this.db.from("food_logs").delete().eq("id", id);
    falhar(error);
  }

  async listMeasurements(): Promise<Measurement[]> {
    const { data, error } = await this.db
      .from("body_measurements")
      .select("*")
      .order("data", { ascending: true })
      .order("created_at", { ascending: true });
    falhar(error);
    return (data ?? []).map(mapMeasurement);
  }

  async addMeasurement(m: Pick<Measurement, "data" | "cintura_cm" | "quadril_cm">): Promise<Measurement> {
    const user_id = await this.userId();
    const { data, error } = await this.db
      .from("body_measurements")
      .insert({ ...m, user_id })
      .select("*")
      .single();
    falhar(error);
    return mapMeasurement(data);
  }

  async deleteMeasurement(id: string): Promise<void> {
    const { error } = await this.db.from("body_measurements").delete().eq("id", id);
    falhar(error);
  }

  async exportAll(): Promise<Record<string, unknown>> {
    const tabelas = ["profiles", "weight_logs", "water_logs", "routine_habits", "food_logs", "body_measurements"] as const;
    const out: Record<string, unknown> = { exportado_em: new Date().toISOString(), modo: "supabase" };
    for (const t of tabelas) {
      const { data, error } = await this.db.from(t).select("*");
      falhar(error);
      out[t] = data;
    }
    return out;
  }

  async deleteAll(): Promise<void> {
    const { error } = await this.db.rpc("apagar_minha_conta");
    falhar(error);
    await this.db.auth.signOut();
  }

  async signOut(): Promise<void> {
    await this.db.auth.signOut();
  }

  async meuCodigoConvite(): Promise<string | null> {
    const id = await this.userId();
    const { data, error } = await this.db.from("profiles").select("codigo_convite").eq("id", id).maybeSingle();
    falhar(error);
    return (data?.codigo_convite as string | undefined) ?? null;
  }

  async conectarParceiro(codigo: string): Promise<void> {
    const { error } = await this.db.rpc("conectar_parceiro", { p_codigo: codigo });
    falhar(error);
  }

  async listParceiros(): Promise<Parceiro[]> {
    const { data, error } = await this.db.rpc("listar_parceiros");
    falhar(error);
    return ((data ?? []) as Linha[]).map((r) => ({
      id: r.id as string,
      nome: r.nome as string,
      resumo: (r.resumo as ResumoPublico | null) ?? null,
    }));
  }

  async removerParceiro(id: string): Promise<void> {
    const { error } = await this.db.rpc("remover_parceiro", { p_parceiro: id });
    falhar(error);
  }

  async publicarResumo(resumo: ResumoPublico): Promise<void> {
    const id = await this.userId();
    const { error } = await this.db.from("profiles").update({ resumo_publico: resumo }).eq("id", id);
    falhar(error);
  }
}

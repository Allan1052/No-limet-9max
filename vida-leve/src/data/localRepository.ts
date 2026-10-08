import { recalcularPlano } from "../lib/calculations";
import type {
  FoodLog,
  FoodTotalDia,
  Measurement,
  NovoAlimento,
  NovoHabito,
  Parceiro,
  Profile,
  ProfileInput,
  RoutineHabit,
  TotalDia,
  WaterLog,
  WeightLog,
} from "../lib/types";
import type { Repository } from "./repository";

const CHAVE = "vida-leve:v2";
const USER_ID = "local";

interface Banco {
  profile: Profile | null;
  weight_logs: WeightLog[];
  water_logs: WaterLog[];
  routine_habits: RoutineHabit[];
  food_logs: FoodLog[];
  measurements: Measurement[];
}

const vazio = (): Banco => ({
  profile: null,
  weight_logs: [],
  water_logs: [],
  routine_habits: [],
  food_logs: [],
  measurements: [],
});

function ler(): Banco {
  try {
    const raw = localStorage.getItem(CHAVE);
    return raw ? { ...vazio(), ...(JSON.parse(raw) as Partial<Banco>) } : vazio();
  } catch {
    return vazio();
  }
}

function gravar(b: Banco): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(b));
  } catch {
    /* modo privado / armazenamento cheio: segue em memória nesta sessão */
  }
}

const novoId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const agoraISO = () => new Date().toISOString();

const ordenarPesos = (logs: WeightLog[]): WeightLog[] =>
  [...logs].sort((a, b) => a.data_registro.localeCompare(b.data_registro) || a.created_at.localeCompare(b.created_at));

type PerfilSemMetas = Omit<Profile, "tmb" | "meta_agua_ml" | "meta_proteina_g" | "calorias_meta">;

/** Equivalente local do trigger do banco: aplica o recálculo e grava no perfil. */
function aplicarPlano(p: PerfilSemMetas): Profile {
  const plano = recalcularPlano(
    { peso_kg: p.peso_atual, altura_cm: p.altura_cm, idade: p.idade, sexo: p.sexo },
    p.nivel_atividade,
    { ajuste_kcal: p.ajuste_kcal, gestante_lactante: p.gestante_lactante },
  );
  return {
    ...p,
    tmb: plano.tmb,
    meta_agua_ml: plano.meta_agua_ml,
    meta_proteina_g: plano.meta_proteina_g,
    calorias_meta: plano.calorias_meta,
    updated_at: agoraISO(),
  };
}

function sincronizarPeso(b: Banco): Profile {
  if (!b.profile) throw new Error("Perfil não encontrado.");
  const ultimo = ordenarPesos(b.weight_logs).at(-1);
  b.profile = aplicarPlano({ ...b.profile, peso_atual: ultimo?.peso_kg ?? b.profile.peso_inicial });
  return b.profile;
}

function exigirPerfil(b: Banco): Profile {
  if (!b.profile) throw new Error("Perfil não encontrado.");
  return b.profile;
}

function somarPorDia<T extends { data: string }>(itens: T[], desde: string, valor: (t: T) => number): TotalDia[] {
  const m = new Map<string, number>();
  for (const i of itens) if (i.data >= desde) m.set(i.data, (m.get(i.data) ?? 0) + valor(i));
  return [...m].map(([data, total]) => ({ data, total })).sort((a, b) => a.data.localeCompare(b.data));
}

const SEM_NUVEM = "Disponível com conta na nuvem (Supabase).";

export class LocalRepository implements Repository {
  readonly modo = "local" as const;
  readonly suportaParceiros = false;

  async userId(): Promise<string> {
    return ler().profile?.created_at ?? USER_ID;
  }

  async getProfile(): Promise<Profile | null> {
    return ler().profile;
  }

  async saveProfile(input: ProfileInput): Promise<Profile> {
    const b = ler();
    const agora = agoraISO();
    const existente = b.profile;
    b.profile = aplicarPlano({
      ...input,
      id: USER_ID,
      peso_atual: input.peso_inicial,
      ajuste_kcal: existente?.ajuste_kcal ?? 0,
      ultimo_ajuste_em: existente?.ultimo_ajuste_em ?? null,
      created_at: existente?.created_at ?? agora,
      updated_at: agora,
    });
    // O peso atual sempre vem do check-in mais recente (se houver).
    sincronizarPeso(b);
    gravar(b);
    return b.profile;
  }

  async setAjuste(ajuste_kcal: number, data: string): Promise<Profile> {
    const b = ler();
    b.profile = aplicarPlano({ ...exigirPerfil(b), ajuste_kcal, ultimo_ajuste_em: data });
    gravar(b);
    return b.profile;
  }

  async listWeightLogs(): Promise<WeightLog[]> {
    return ordenarPesos(ler().weight_logs);
  }

  async addWeightLog(peso_kg: number, data_registro: string): Promise<Profile> {
    const b = ler();
    const p = exigirPerfil(b);
    // Valida ANTES de gravar (recalcularPlano lança erro se o peso for absurdo).
    recalcularPlano({ ...p, peso_kg }, p.nivel_atividade);
    b.weight_logs.push({ id: novoId(), user_id: USER_ID, peso_kg, data_registro, created_at: agoraISO() });
    const novo = sincronizarPeso(b);
    gravar(b);
    return novo;
  }

  async deleteWeightLog(id: string): Promise<Profile> {
    const b = ler();
    b.weight_logs = b.weight_logs.filter((w) => w.id !== id);
    const p = sincronizarPeso(b);
    gravar(b);
    return p;
  }

  async listWaterLogs(data: string): Promise<WaterLog[]> {
    return ler().water_logs.filter((w) => w.data === data);
  }

  async listWaterTotals(desde: string): Promise<TotalDia[]> {
    return somarPorDia(ler().water_logs, desde, (w) => w.quantidade_ml);
  }

  async addWater(quantidade_ml: number, data: string): Promise<WaterLog> {
    const b = ler();
    const log: WaterLog = { id: novoId(), user_id: USER_ID, quantidade_ml, data, created_at: agoraISO() };
    b.water_logs.push(log);
    gravar(b);
    return log;
  }

  async deleteWater(id: string): Promise<void> {
    const b = ler();
    b.water_logs = b.water_logs.filter((w) => w.id !== id);
    gravar(b);
  }

  async listHabits(desde: string): Promise<RoutineHabit[]> {
    return ler().routine_habits.filter((h) => h.data >= desde);
  }

  async setDayHabits(data: string, habitos: NovoHabito[]): Promise<RoutineHabit[]> {
    const b = ler();
    const feitas = b.routine_habits.filter((h) => h.data === data && h.concluido_hoje);
    const idsFeitos = new Set(feitas.map((h) => h.missao_id));
    const novas: RoutineHabit[] = habitos
      .filter((h) => !idsFeitos.has(h.missao_id))
      .map((h) => ({ ...h, id: novoId(), user_id: USER_ID, data, concluido_hoje: false }));
    b.routine_habits = [...b.routine_habits.filter((h) => h.data !== data), ...feitas, ...novas];
    gravar(b);
    return b.routine_habits.filter((h) => h.data === data);
  }

  async setHabitDone(id: string, concluido: boolean): Promise<RoutineHabit> {
    const b = ler();
    const h = b.routine_habits.find((x) => x.id === id);
    if (!h) throw new Error("Missão não encontrada.");
    h.concluido_hoje = concluido;
    gravar(b);
    return h;
  }

  async listFood(data: string): Promise<FoodLog[]> {
    return ler().food_logs.filter((f) => f.data === data);
  }

  async listFoodTotals(desde: string): Promise<FoodTotalDia[]> {
    const m = new Map<string, FoodTotalDia>();
    for (const f of ler().food_logs) {
      if (f.data < desde) continue;
      const t = m.get(f.data) ?? { data: f.data, proteina_g: 0, calorias: 0 };
      t.proteina_g += f.proteina_g;
      t.calorias += f.calorias;
      m.set(f.data, t);
    }
    return [...m.values()].sort((a, b) => a.data.localeCompare(b.data));
  }

  async addFood(alimento: NovoAlimento, data: string): Promise<FoodLog> {
    const b = ler();
    const log: FoodLog = { ...alimento, id: novoId(), user_id: USER_ID, data, created_at: agoraISO() };
    b.food_logs.push(log);
    gravar(b);
    return log;
  }

  async deleteFood(id: string): Promise<void> {
    const b = ler();
    b.food_logs = b.food_logs.filter((f) => f.id !== id);
    gravar(b);
  }

  async listMeasurements(): Promise<Measurement[]> {
    return [...ler().measurements].sort((a, b) => a.data.localeCompare(b.data) || a.created_at.localeCompare(b.created_at));
  }

  async addMeasurement(m: Pick<Measurement, "data" | "cintura_cm" | "quadril_cm">): Promise<Measurement> {
    const b = ler();
    const nova: Measurement = { ...m, id: novoId(), user_id: USER_ID, created_at: agoraISO() };
    b.measurements.push(nova);
    gravar(b);
    return nova;
  }

  async deleteMeasurement(id: string): Promise<void> {
    const b = ler();
    b.measurements = b.measurements.filter((m) => m.id !== id);
    gravar(b);
  }

  async exportAll(): Promise<Record<string, unknown>> {
    return { exportado_em: agoraISO(), modo: "local", ...ler() };
  }

  async deleteAll(): Promise<void> {
    try {
      localStorage.removeItem(CHAVE);
    } catch {
      /* ignora */
    }
  }

  async signOut(): Promise<void> {}

  async meuCodigoConvite(): Promise<string | null> {
    return null;
  }
  async conectarParceiro(): Promise<void> {
    throw new Error(SEM_NUVEM);
  }
  async listParceiros(): Promise<Parceiro[]> {
    return [];
  }
  async removerParceiro(): Promise<void> {
    throw new Error(SEM_NUVEM);
  }
  async publicarResumo(): Promise<void> {}
}

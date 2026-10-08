import { recalcularPlano } from "../lib/calculations";
import type { NovoHabito, Profile, ProfileInput, RoutineHabit, WaterLog, WeightLog } from "../lib/types";
import type { Repository } from "./repository";

const CHAVE = "vida-leve:v1";
const USER_ID = "local";

interface Banco {
  profile: Profile | null;
  weight_logs: WeightLog[];
  water_logs: WaterLog[];
  routine_habits: RoutineHabit[];
}

const vazio = (): Banco => ({ profile: null, weight_logs: [], water_logs: [], routine_habits: [] });

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

const ordenarPesos = (logs: WeightLog[]): WeightLog[] =>
  [...logs].sort((a, b) => a.data_registro.localeCompare(b.data_registro) || a.created_at.localeCompare(b.created_at));

/** Equivalente local do trigger do banco: aplica o recálculo e grava no perfil. */
function aplicarPlano(p: Omit<Profile, "tmb" | "meta_agua_ml" | "meta_proteina_g" | "calorias_meta">): Profile {
  const plano = recalcularPlano(
    { peso_kg: p.peso_atual, altura_cm: p.altura_cm, idade: p.idade, sexo: p.sexo },
    p.nivel_atividade,
  );
  return {
    ...p,
    tmb: plano.tmb,
    meta_agua_ml: plano.meta_agua_ml,
    meta_proteina_g: plano.meta_proteina_g,
    calorias_meta: plano.calorias_meta,
    updated_at: new Date().toISOString(),
  };
}

function sincronizarPeso(b: Banco): Profile {
  if (!b.profile) throw new Error("Perfil não encontrado.");
  const ultimo = ordenarPesos(b.weight_logs).at(-1);
  b.profile = aplicarPlano({ ...b.profile, peso_atual: ultimo?.peso_kg ?? b.profile.peso_inicial });
  return b.profile;
}

export class LocalRepository implements Repository {
  readonly modo = "local" as const;

  async getProfile(): Promise<Profile | null> {
    return ler().profile;
  }

  async saveProfile(input: ProfileInput): Promise<Profile> {
    const b = ler();
    const agora = new Date().toISOString();
    const existente = b.profile;
    const pesoMudou = existente && existente.peso_inicial !== input.peso_inicial;
    b.profile = aplicarPlano({
      ...input,
      id: USER_ID,
      peso_atual: existente && b.weight_logs.length > 0 && !pesoMudou ? existente.peso_atual : input.peso_inicial,
      created_at: existente?.created_at ?? agora,
      updated_at: agora,
    });
    if (b.weight_logs.length > 0) sincronizarPeso(b);
    gravar(b);
    return b.profile;
  }

  async listWeightLogs(): Promise<WeightLog[]> {
    return ordenarPesos(ler().weight_logs);
  }

  async addWeightLog(peso_kg: number, data_registro: string): Promise<Profile> {
    const b = ler();
    if (!b.profile) throw new Error("Perfil não encontrado.");
    // Valida ANTES de gravar (recalcularPlano lança erro se o peso for absurdo).
    recalcularPlano({ ...b.profile, peso_kg }, b.profile.nivel_atividade);
    b.weight_logs.push({ id: novoId(), user_id: USER_ID, peso_kg, data_registro, created_at: new Date().toISOString() });
    const p = sincronizarPeso(b);
    gravar(b);
    return p;
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

  async addWater(quantidade_ml: number, data: string): Promise<WaterLog> {
    const b = ler();
    const log: WaterLog = { id: novoId(), user_id: USER_ID, quantidade_ml, data, created_at: new Date().toISOString() };
    // Guarda só os últimos 60 dias de água para não inchar o armazenamento.
    const limite = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
    b.water_logs = [...b.water_logs.filter((w) => w.data >= limite), log];
    gravar(b);
    return log;
  }

  async deleteWater(id: string): Promise<void> {
    const b = ler();
    b.water_logs = b.water_logs.filter((w) => w.id !== id);
    gravar(b);
  }

  async listHabits(): Promise<RoutineHabit[]> {
    return ler().routine_habits;
  }

  async replaceHabits(habitos: NovoHabito[]): Promise<RoutineHabit[]> {
    const b = ler();
    b.routine_habits = habitos.map((h) => ({
      ...h,
      id: novoId(),
      user_id: USER_ID,
      concluido_hoje: false,
      data_conclusao: null,
    }));
    gravar(b);
    return b.routine_habits;
  }

  async setHabitDone(id: string, concluido: boolean, data: string): Promise<RoutineHabit> {
    const b = ler();
    const h = b.routine_habits.find((x) => x.id === id);
    if (!h) throw new Error("Missão não encontrada.");
    h.concluido_hoje = concluido;
    h.data_conclusao = concluido ? data : null;
    gravar(b);
    return h;
  }

  async reset(): Promise<void> {
    try {
      localStorage.removeItem(CHAVE);
    } catch {
      /* ignora */
    }
  }
}

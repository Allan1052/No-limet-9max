import { create } from "zustand";
import { repository } from "../data";
import { analisarRitmo, decidirAjuste, type AnaliseRitmo, type DecisaoAjuste } from "../lib/adaptive";
import { progresso, recalcularPlano } from "../lib/calculations";
import { diaAnterior } from "../lib/conquistas";
import { hojeISO } from "../lib/dates";
import { gerarMissoesDoDia } from "../lib/habits";
import { supabase } from "../lib/supabase";
import type {
  FoodLog,
  FoodTotalDia,
  Measurement,
  NovoAlimento,
  Parceiro,
  PlanoMetas,
  Profile,
  ProfileInput,
  ResumoPublico,
  RoutineHabit,
  TotalDia,
  WaterLog,
  WeightLog,
} from "../lib/types";

export type Aba = "inicio" | "comida" | "progresso" | "perfil";
export type Status = "carregando" | "login" | "onboarding" | "pronto";

/** Resultado do último check-in, para mostrar "antes → depois" na tela. */
export interface ResumoRecalculo {
  pesoAnterior: number;
  pesoNovo: number;
  antes: PlanoMetas;
  depois: PlanoMetas;
  analise: AnaliseRitmo;
  decisao: DecisaoAjuste;
}

interface AppState {
  status: Status;
  aba: Aba;
  erro: string | null;
  hoje: string;
  profile: Profile | null;
  pesos: WeightLog[];
  agua: WaterLog[];
  aguaTotais: TotalDia[];
  /** Histórico de missões (inclui as de hoje). */
  missoes: RoutineHabit[];
  comida: FoodLog[];
  comidaTotais: FoodTotalDia[];
  medidas: Measurement[];
  parceiros: Parceiro[];
  ultimoRecalculo: ResumoRecalculo | null;

  iniciar: () => Promise<void>;
  irPara: (aba: Aba) => void;
  limparErro: () => void;
  salvarPerfil: (input: ProfileInput, regenerarMissoes: boolean) => Promise<boolean>;
  adicionarAgua: (ml: number) => Promise<boolean>;
  desfazerAgua: () => Promise<boolean>;
  registrarPeso: (peso: number, data: string) => Promise<boolean>;
  apagarPeso: (id: string) => Promise<boolean>;
  alternarHabito: (id: string) => Promise<boolean>;
  adicionarComida: (a: NovoAlimento) => Promise<boolean>;
  removerComida: (id: string) => Promise<boolean>;
  adicionarMedida: (m: Pick<Measurement, "data" | "cintura_cm" | "quadril_cm">) => Promise<boolean>;
  apagarMedida: (id: string) => Promise<boolean>;
  carregarParceiros: () => Promise<boolean>;
  conectarParceiro: (codigo: string) => Promise<boolean>;
  removerParceiro: (id: string) => Promise<boolean>;
  publicarResumo: (r: ResumoPublico) => Promise<boolean>;
  apagarTudo: () => Promise<boolean>;
  sair: () => Promise<boolean>;
}

/** Quanto histórico carregar para sequências e conquistas. */
const DIAS_HISTORICO = 400;

export function desdeDias(hoje: string, dias: number): string {
  const [y, m, d] = hoje.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d) - dias * 864e5).toISOString().slice(0, 10);
}

export const planoDoPerfil = (p: Profile): PlanoMetas =>
  recalcularPlano({ peso_kg: p.peso_atual, altura_cm: p.altura_cm, idade: p.idade, sexo: p.sexo }, p.nivel_atividade, {
    ajuste_kcal: p.ajuste_kcal,
    gestante_lactante: p.gestante_lactante,
  });

export const missoesDoDia = (missoes: RoutineHabit[], dia: string) => missoes.filter((m) => m.data === dia);

/** Placar do dia (0–1): média de água, missões e proteína. */
export function placarDoDia(s: Pick<AppState, "profile" | "agua" | "missoes" | "comida" | "hoje">) {
  if (!s.profile) return { agua: 0, missoes: 0, proteina: 0, total: 0 };
  const hoje = missoesDoDia(s.missoes, s.hoje);
  const agua = progresso(s.agua.reduce((t, a) => t + a.quantidade_ml, 0), s.profile.meta_agua_ml);
  const missoes = progresso(hoje.filter((m) => m.concluido_hoje).length, hoje.length);
  const proteina = progresso(s.comida.reduce((t, c) => t + c.proteina_g, 0), s.profile.meta_proteina_g);
  return { agua, missoes, proteina, total: (agua + missoes + proteina) / 3 };
}

const mensagem = (e: unknown): string => (e instanceof Error ? e.message : "Algo deu errado. Tente de novo.");

function contarConclusoes(missoes: RoutineHabit[], antesDe: string): Record<string, number> {
  const c: Record<string, number> = {};
  for (const m of missoes) if (m.concluido_hoje && m.data < antesDe) c[m.missao_id] = (c[m.missao_id] ?? 0) + 1;
  return c;
}

export const useAppStore = create<AppState>((set, get) => {
  /** Envolve ações: captura erros, mostra mensagem amigável e devolve se deu certo. */
  const acao =
    <A extends unknown[]>(fn: (...args: A) => Promise<void>) =>
    async (...args: A): Promise<boolean> => {
      try {
        set({ erro: null });
        await fn(...args);
        return true;
      } catch (e) {
        set({ erro: mensagem(e) });
        return false;
      }
    };

  /** Sorteia e grava as missões do dia (se ainda não existem ou se a rotina mudou). */
  const garantirMissoes = async (profile: Profile, historico: RoutineHabit[], hoje: string, forcar: boolean) => {
    const deHoje = missoesDoDia(historico, hoje);
    if (deHoje.length > 0 && !forcar) return historico;
    const ontem = missoesDoDia(historico, diaAnterior(hoje)).map((m) => m.missao_id);
    const semente = await repository.userId();
    const novas = gerarMissoesDoDia(profile, hoje, semente, contarConclusoes(historico, hoje), ontem);
    const gravadas = await repository.setDayHabits(hoje, novas);
    return [...historico.filter((m) => m.data !== hoje), ...gravadas];
  };

  const carregarTudo = async (): Promise<void> => {
    const hoje = hojeISO();
    const profile = await repository.getProfile();
    if (!profile) {
      set({ status: "onboarding", profile: null, hoje });
      return;
    }
    const desde = desdeDias(hoje, DIAS_HISTORICO);
    const [pesos, agua, aguaTotais, historico, comida, comidaTotais, medidas] = await Promise.all([
      repository.listWeightLogs(),
      repository.listWaterLogs(hoje),
      repository.listWaterTotals(desde),
      repository.listHabits(desde),
      repository.listFood(hoje),
      repository.listFoodTotals(desde),
      repository.listMeasurements(),
    ]);
    const missoes = await garantirMissoes(profile, historico, hoje, false);
    set({ status: "pronto", profile, pesos, agua, aguaTotais, missoes, comida, comidaTotais, medidas, hoje });
  };

  /** Virou o dia com o app aberto? Recarrega antes de gravar. */
  const garantirDia = async () => {
    if (hojeISO() !== get().hoje) await carregarTudo();
  };

  const somarTotal = (totais: TotalDia[], dia: string, delta: number): TotalDia[] => {
    const outros = totais.filter((t) => t.data !== dia);
    const atual = totais.find((t) => t.data === dia)?.total ?? 0;
    return [...outros, { data: dia, total: Math.max(0, atual + delta) }].sort((a, b) => a.data.localeCompare(b.data));
  };

  const somarComida = (totais: FoodTotalDia[], dia: string, p: number, k: number): FoodTotalDia[] => {
    const outros = totais.filter((t) => t.data !== dia);
    const atual = totais.find((t) => t.data === dia) ?? { data: dia, proteina_g: 0, calorias: 0 };
    const novo = { data: dia, proteina_g: Math.max(0, atual.proteina_g + p), calorias: Math.max(0, atual.calorias + k) };
    return [...outros, novo].sort((a, b) => a.data.localeCompare(b.data));
  };

  return {
    status: "carregando",
    aba: "inicio",
    erro: null,
    hoje: hojeISO(),
    profile: null,
    pesos: [],
    agua: [],
    aguaTotais: [],
    missoes: [],
    comida: [],
    comidaTotais: [],
    medidas: [],
    parceiros: [],
    ultimoRecalculo: null,

    iniciar: async () => {
      try {
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            set({ status: "login" });
            return;
          }
        }
        await carregarTudo();
      } catch (e) {
        set({ erro: mensagem(e), status: supabase ? "login" : "onboarding" });
      }
    },

    irPara: (aba) => set({ aba }),
    limparErro: () => set({ erro: null }),

    salvarPerfil: acao(async (input, regenerarMissoes) => {
      const primeiraVez = get().status !== "pronto";
      const profile = await repository.saveProfile(input);
      set({ profile });
      if (primeiraVez) {
        await carregarTudo();
      } else if (regenerarMissoes) {
        const missoes = await garantirMissoes(profile, get().missoes, get().hoje, true);
        set({ missoes });
      }
    }),

    adicionarAgua: acao(async (ml) => {
      await garantirDia();
      const hoje = get().hoje;
      const log = await repository.addWater(ml, hoje);
      set((s) => ({ agua: [...s.agua, log], aguaTotais: somarTotal(s.aguaTotais, hoje, ml) }));
    }),

    desfazerAgua: acao(async () => {
      const ultimo = get().agua.at(-1);
      if (!ultimo) return;
      await repository.deleteWater(ultimo.id);
      set((s) => ({
        agua: s.agua.filter((a) => a.id !== ultimo.id),
        aguaTotais: somarTotal(s.aguaTotais, ultimo.data, -ultimo.quantidade_ml),
      }));
    }),

    registrarPeso: acao(async (peso, data) => {
      const anterior = get().profile;
      if (!anterior) throw new Error("Complete o cadastro primeiro.");
      const antes = planoDoPerfil(anterior);
      let profile = await repository.addWeightLog(peso, data);
      const pesos = await repository.listWeightLogs();

      // Recálculo ADAPTATIVO: compara o ritmo real com o previsto.
      const hoje = hojeISO();
      const planoAtual = planoDoPerfil(profile);
      const analise = analisarRitmo(pesos, planoAtual.deficit_aplicado, hoje);
      const decisao = decidirAjuste(analise, profile.ajuste_kcal, profile.ultimo_ajuste_em, hoje, planoAtual.modo === "manutencao");
      if (decisao.aplicado) profile = await repository.setAjuste(decisao.novo_ajuste_kcal, hoje);

      set({
        profile,
        pesos,
        ultimoRecalculo: {
          pesoAnterior: anterior.peso_atual,
          pesoNovo: profile.peso_atual,
          antes,
          depois: planoDoPerfil(profile),
          analise,
          decisao,
        },
      });
    }),

    apagarPeso: acao(async (id) => {
      const profile = await repository.deleteWeightLog(id);
      const pesos = await repository.listWeightLogs();
      set({ profile, pesos, ultimoRecalculo: null });
    }),

    alternarHabito: acao(async (id) => {
      const h = get().missoes.find((x) => x.id === id);
      if (!h) return;
      const trocar = (novo: RoutineHabit) => set((s) => ({ missoes: s.missoes.map((x) => (x.id === id ? novo : x)) }));
      // Atualização otimista: o check aparece na hora.
      trocar({ ...h, concluido_hoje: !h.concluido_hoje });
      try {
        trocar(await repository.setHabitDone(id, !h.concluido_hoje));
      } catch (e) {
        trocar(h);
        throw e;
      }
    }),

    adicionarComida: acao(async (a) => {
      await garantirDia();
      const hoje = get().hoje;
      const log = await repository.addFood(a, hoje);
      set((s) => ({ comida: [...s.comida, log], comidaTotais: somarComida(s.comidaTotais, hoje, a.proteina_g, a.calorias) }));
    }),

    removerComida: acao(async (id) => {
      const item = get().comida.find((c) => c.id === id);
      if (!item) return;
      await repository.deleteFood(id);
      set((s) => ({
        comida: s.comida.filter((c) => c.id !== id),
        comidaTotais: somarComida(s.comidaTotais, item.data, -item.proteina_g, -item.calorias),
      }));
    }),

    adicionarMedida: acao(async (m) => {
      await repository.addMeasurement(m);
      set({ medidas: await repository.listMeasurements() });
    }),

    apagarMedida: acao(async (id) => {
      await repository.deleteMeasurement(id);
      set((s) => ({ medidas: s.medidas.filter((m) => m.id !== id) }));
    }),

    carregarParceiros: acao(async () => {
      if (!repository.suportaParceiros) return;
      set({ parceiros: await repository.listParceiros() });
    }),

    conectarParceiro: acao(async (codigo) => {
      await repository.conectarParceiro(codigo);
      set({ parceiros: await repository.listParceiros() });
    }),

    removerParceiro: acao(async (id) => {
      await repository.removerParceiro(id);
      set((s) => ({ parceiros: s.parceiros.filter((p) => p.id !== id) }));
    }),

    publicarResumo: acao(async (r) => {
      await repository.publicarResumo(r);
    }),

    apagarTudo: acao(async () => {
      await repository.deleteAll();
      set({
        status: supabase ? "login" : "onboarding",
        aba: "inicio",
        profile: null,
        pesos: [],
        agua: [],
        aguaTotais: [],
        missoes: [],
        comida: [],
        comidaTotais: [],
        medidas: [],
        parceiros: [],
        ultimoRecalculo: null,
      });
    }),

    sair: acao(async () => {
      await repository.signOut();
      set({ status: supabase ? "login" : get().status, aba: "inicio" });
    }),
  };
});

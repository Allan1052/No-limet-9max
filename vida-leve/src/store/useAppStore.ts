import { create } from "zustand";
import { repository } from "../data";
import { recalcularPlano, type ErroDadosInvalidos } from "../lib/calculations";
import { hojeISO } from "../lib/dates";
import { gerarMissoes } from "../lib/habits";
import { supabase } from "../lib/supabase";
import type { PlanoMetas, Profile, ProfileInput, RoutineHabit, WaterLog, WeightLog } from "../lib/types";

export type Aba = "inicio" | "checkin" | "perfil";
export type Status = "carregando" | "login" | "onboarding" | "pronto";

/** Resultado do último check-in, para mostrar "antes → depois" na tela. */
export interface ResumoRecalculo {
  pesoAnterior: number;
  pesoNovo: number;
  antes: PlanoMetas;
  depois: PlanoMetas;
}

interface AppState {
  status: Status;
  aba: Aba;
  erro: string | null;
  hoje: string;
  profile: Profile | null;
  pesos: WeightLog[];
  agua: WaterLog[];
  habitos: RoutineHabit[];
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
  sair: () => Promise<boolean>;
}

export const planoDoPerfil = (p: Profile): PlanoMetas =>
  recalcularPlano({ peso_kg: p.peso_atual, altura_cm: p.altura_cm, idade: p.idade, sexo: p.sexo }, p.nivel_atividade);

const mensagem = (e: unknown): string =>
  e instanceof Error ? (e as Error | ErroDadosInvalidos).message : "Algo deu errado. Tente de novo.";

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

  const carregarTudo = async (): Promise<void> => {
    const hoje = hojeISO();
    const profile = await repository.getProfile();
    if (!profile) {
      set({ status: "onboarding", profile: null, hoje });
      return;
    }
    const [pesos, agua, habitos] = await Promise.all([
      repository.listWeightLogs(),
      repository.listWaterLogs(hoje),
      repository.listHabits(),
    ]);
    set({ status: "pronto", profile, pesos, agua, habitos, hoje });
  };

  return {
    status: "carregando",
    aba: "inicio",
    erro: null,
    hoje: hojeISO(),
    profile: null,
    pesos: [],
    agua: [],
    habitos: [],
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
      const profile = await repository.saveProfile(input);
      const habitos = regenerarMissoes ? await repository.replaceHabits(gerarMissoes(input)) : get().habitos;
      set({ profile, habitos });
      if (get().status !== "pronto") await carregarTudo();
    }),

    adicionarAgua: acao(async (ml) => {
      const hoje = hojeISO();
      if (hoje !== get().hoje) await carregarTudo(); // virou o dia com o app aberto
      const log = await repository.addWater(ml, hoje);
      set((s) => ({ agua: [...s.agua, log] }));
    }),

    desfazerAgua: acao(async () => {
      const ultimo = get().agua.at(-1);
      if (!ultimo) return;
      await repository.deleteWater(ultimo.id);
      set((s) => ({ agua: s.agua.filter((a) => a.id !== ultimo.id) }));
    }),

    registrarPeso: acao(async (peso, data) => {
      const anterior = get().profile;
      if (!anterior) throw new Error("Complete o cadastro primeiro.");
      const antes = planoDoPerfil(anterior);
      const profile = await repository.addWeightLog(peso, data);
      const pesos = await repository.listWeightLogs();
      set({
        profile,
        pesos,
        ultimoRecalculo: {
          pesoAnterior: anterior.peso_atual,
          pesoNovo: profile.peso_atual,
          antes,
          depois: planoDoPerfil(profile),
        },
      });
    }),

    apagarPeso: acao(async (id) => {
      const profile = await repository.deleteWeightLog(id);
      const pesos = await repository.listWeightLogs();
      set({ profile, pesos, ultimoRecalculo: null });
    }),

    alternarHabito: acao(async (id) => {
      const hoje = hojeISO();
      const h = get().habitos.find((x) => x.id === id);
      if (!h) return;
      const feito = h.concluido_hoje && h.data_conclusao === hoje;
      // Atualização otimista: o check aparece na hora.
      const otimista: RoutineHabit = { ...h, concluido_hoje: !feito, data_conclusao: feito ? null : hoje };
      set((s) => ({ habitos: s.habitos.map((x) => (x.id === id ? otimista : x)) }));
      try {
        const salvo = await repository.setHabitDone(id, !feito, hoje);
        set((s) => ({ habitos: s.habitos.map((x) => (x.id === id ? salvo : x)) }));
      } catch (e) {
        set((s) => ({ habitos: s.habitos.map((x) => (x.id === id ? h : x)) }));
        throw e;
      }
    }),

    sair: acao(async () => {
      await repository.reset();
      set({
        status: supabase ? "login" : "onboarding",
        aba: "inicio",
        profile: null,
        pesos: [],
        agua: [],
        habitos: [],
        ultimoRecalculo: null,
      });
    }),
  };
});

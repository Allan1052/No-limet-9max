// ---------------------------------------------------------------------------
// Missões e desafios (retenção).
//
// Um catálogo fixo de metas simples e motivadoras para o recreativo: jogar
// volume, tomar boas decisões, ter disciplina e ir bem em torneios. Cada missão
// avança com EVENTOS do jogo (mão jogada, decisão avaliada, fim de torneio) e,
// ao completar, dá aquela sensação de conquista que traz o jogador de volta.
//
// A lógica é pura e testável; o texto (título/descrição) vem do i18n via chaves.
// O progresso é salvo no localStorage do aparelho.
// ---------------------------------------------------------------------------

import type { Rating } from "../feedback/analyzer";

export type MissionCategory = "volume" | "qualidade" | "disciplina" | "torneio";

export type MissionEvent =
  | { type: "hand" }
  | { type: "decision"; rating: Rating; heroType: string }
  | { type: "tournamentEnd"; result: "campeao" | "eliminado"; inMoney: boolean };

export interface Mission {
  id: string;
  category: MissionCategory;
  icon: string;
  goal: number;
  /** Chaves de tradução (ver i18n). */
  titleKey: string;
  descKey: string;
  /** Novo progresso dado o progresso anterior e um evento. */
  reduce: (progress: number, e: MissionEvent) => number;
}

const isGood = (r: Rating) => r === "boa" || r === "ok";

export const MISSIONS: Mission[] = [
  {
    id: "warmup",
    category: "volume",
    icon: "🎯",
    goal: 25,
    titleKey: "mission.warmup.title",
    descKey: "mission.warmup.desc",
    reduce: (p, e) => (e.type === "hand" ? p + 1 : p),
  },
  {
    id: "grinder",
    category: "volume",
    icon: "🔥",
    goal: 250,
    titleKey: "mission.grinder.title",
    descKey: "mission.grinder.desc",
    reduce: (p, e) => (e.type === "hand" ? p + 1 : p),
  },
  {
    id: "goodreads",
    category: "qualidade",
    icon: "👁️",
    goal: 50,
    titleKey: "mission.goodreads.title",
    descKey: "mission.goodreads.desc",
    reduce: (p, e) => (e.type === "decision" && isGood(e.rating) ? p + 1 : p),
  },
  {
    id: "handmaster",
    category: "qualidade",
    icon: "🧠",
    goal: 200,
    titleKey: "mission.handmaster.title",
    descKey: "mission.handmaster.desc",
    reduce: (p, e) => (e.type === "decision" && isGood(e.rating) ? p + 1 : p),
  },
  {
    id: "steelnerves",
    category: "disciplina",
    icon: "🧊",
    goal: 15,
    titleKey: "mission.steelnerves.title",
    descKey: "mission.steelnerves.desc",
    // Sequência: qualquer decisão sem erro grave soma; um "ruim" zera.
    reduce: (p, e) => (e.type === "decision" ? (e.rating === "ruim" ? 0 : p + 1) : p),
  },
  {
    id: "foldprofit",
    category: "disciplina",
    icon: "✂️",
    goal: 25,
    titleKey: "mission.foldprofit.title",
    descKey: "mission.foldprofit.desc",
    reduce: (p, e) =>
      e.type === "decision" && e.heroType === "fold" && isGood(e.rating) ? p + 1 : p,
  },
  {
    id: "inthemoney",
    category: "torneio",
    icon: "💰",
    goal: 3,
    titleKey: "mission.inthemoney.title",
    descKey: "mission.inthemoney.desc",
    reduce: (p, e) => (e.type === "tournamentEnd" && e.inMoney ? p + 1 : p),
  },
  {
    id: "champion",
    category: "torneio",
    icon: "🏆",
    goal: 1,
    titleKey: "mission.champion.title",
    descKey: "mission.champion.desc",
    reduce: (p, e) => (e.type === "tournamentEnd" && e.result === "campeao" ? p + 1 : p),
  },
];

export interface MissionProgress {
  progress: number;
  done: boolean;
  doneAt?: string;
}

export type MissionState = Record<string, MissionProgress>;

export interface MissionView {
  mission: Mission;
  progress: number;
  done: boolean;
}

const STORAGE_KEY = "poker-sim-missions";

export function emptyMissionState(): MissionState {
  return {};
}

/**
 * Aplica um evento a todas as missões abertas. Muta e devolve o estado, além da
 * lista das que foram COMPLETADAS agora (para o aviso de conquista).
 */
export function applyEvent(
  state: MissionState,
  event: MissionEvent,
  now: Date = new Date(),
): { state: MissionState; completed: Mission[] } {
  const completed: Mission[] = [];
  for (const m of MISSIONS) {
    const cur = state[m.id] ?? { progress: 0, done: false };
    if (cur.done) continue;
    const np = Math.max(0, m.reduce(cur.progress, event));
    const done = np >= m.goal;
    state[m.id] = {
      progress: Math.min(np, m.goal),
      done,
      doneAt: done ? now.toISOString() : undefined,
    };
    if (done) completed.push(m);
  }
  return { state, completed };
}

/** Visão para a UI: cada missão com seu progresso e se foi concluída. */
export function missionViews(state: MissionState): MissionView[] {
  return MISSIONS.map((m) => {
    const cur = state[m.id];
    return { mission: m, progress: cur?.progress ?? 0, done: cur?.done ?? false };
  });
}

export function missionCounts(state: MissionState): { done: number; total: number } {
  const done = MISSIONS.filter((m) => state[m.id]?.done).length;
  return { done, total: MISSIONS.length };
}

// ----- Persistência -----

export function loadMissions(): MissionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MissionState) : {};
  } catch {
    return {};
  }
}

export function saveMissions(state: MissionState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* armazenamento indisponível */
  }
}

export function resetMissions(): MissionState {
  const fresh = emptyMissionState();
  saveMissions(fresh);
  return fresh;
}

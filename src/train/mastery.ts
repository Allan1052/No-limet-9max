// Progresso dos Módulos de Maestria (persistente). Rastreamos uma janela dos
// últimos resultados por módulo — "dominar" exige acertar 16 dos últimos 20
// (80%), refletindo o desempenho RECENTE, não um acumulado que dilui erros.

const STORAGE_KEY = "poker-sim-mastery";
const WINDOW = 20;
const MASTER_HITS = 16;

export interface ModuleProgress {
  window: boolean[];
  totalAttempts: number;
  totalCorrect: number;
  mastered: boolean;
}

export type MasteryState = Record<string, ModuleProgress>;

function emptyModule(): ModuleProgress {
  return { window: [], totalAttempts: 0, totalCorrect: 0, mastered: false };
}

export function recordResult(state: MasteryState, moduleId: string, correct: boolean): MasteryState {
  const m = state[moduleId] ?? emptyModule();
  m.window = [...m.window, correct].slice(-WINDOW);
  m.totalAttempts++;
  if (correct) m.totalCorrect++;
  const hits = m.window.filter(Boolean).length;
  if (m.window.length >= WINDOW && hits >= MASTER_HITS) m.mastered = true;
  state[moduleId] = m;
  return state;
}

export interface ModuleView {
  attempts: number;
  recentRate: number; // % de acerto na janela recente
  recentCount: number;
  mastered: boolean;
  toMaster: number; // quantos acertos ainda faltam na janela (0 se dominado)
}

export function moduleView(state: MasteryState, moduleId: string): ModuleView {
  const m = state[moduleId] ?? emptyModule();
  const hits = m.window.filter(Boolean).length;
  const recentRate = m.window.length ? Math.round((hits / m.window.length) * 100) : 0;
  return {
    attempts: m.totalAttempts,
    recentRate,
    recentCount: m.window.length,
    mastered: m.mastered,
    toMaster: m.mastered ? 0 : Math.max(0, MASTER_HITS - hits),
  };
}

export function loadMastery(): MasteryState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MasteryState) : {};
  } catch {
    return {};
  }
}

export function saveMastery(state: MasteryState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* indisponível */
  }
}

export function resetModule(state: MasteryState, moduleId: string): MasteryState {
  delete state[moduleId];
  return state;
}

// ---------------------------------------------------------------------------
// Placar de evolução (persistente entre sessões).
//
// A cada decisão sua avaliada, guardamos a nota (boa/ok/imprecisa/ruim) num
// acumulado geral e num balde por SEMANA (ISO). Isso permite mostrar "sua taxa
// de boas decisões" e a tendência (esta semana vs. geral) — a sensação de
// progresso que traz o jogador de volta. Tudo fica no localStorage do próprio
// aparelho (nada sai do dispositivo).
//
// A lógica de contagem é pura e testável; o acesso ao localStorage é isolado.
// ---------------------------------------------------------------------------

import type { Rating } from "../feedback/analyzer";

export interface RatingCounts {
  boa: number;
  ok: number;
  imprecisa: number;
  ruim: number;
}

export interface ProgressState {
  handsPlayed: number;
  allTime: RatingCounts;
  /** Contagem por semana ISO ("2026-W30"). */
  weeks: Record<string, RatingCounts>;
  updatedAt: string;
}

export interface ProgressSummary {
  hands: number;
  decisions: number;
  /** % de decisões boas+ok no geral (0..100). */
  goodRateAll: number;
  /** % de decisões boas+ok na semana atual (0..100). */
  goodRateWeek: number;
  weekDecisions: number;
  /** Diferença (pontos %) da semana em relação ao geral: + melhora, − piora. */
  trend: number;
  counts: RatingCounts;
}

const STORAGE_KEY = "poker-sim-progress";

function emptyCounts(): RatingCounts {
  return { boa: 0, ok: 0, imprecisa: 0, ruim: 0 };
}

export function emptyProgress(): ProgressState {
  return { handsPlayed: 0, allTime: emptyCounts(), weeks: {}, updatedAt: new Date().toISOString() };
}

/** Chave da semana ISO de uma data: ex. "2026-W30". */
export function isoWeekKey(d: Date = new Date()): string {
  // Cópia em UTC ancorada na quinta-feira da semana (definição ISO-8601).
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7; // domingo=7
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function sum(c: RatingCounts): number {
  return c.boa + c.ok + c.imprecisa + c.ruim;
}

function goodRate(c: RatingCounts): number {
  const total = sum(c);
  return total > 0 ? Math.round(((c.boa + c.ok) / total) * 100) : 0;
}

/** Registra uma decisão avaliada (muta e devolve o estado). */
export function recordDecision(
  state: ProgressState,
  rating: Rating,
  now: Date = new Date(),
): ProgressState {
  state.allTime[rating]++;
  const wk = isoWeekKey(now);
  if (!state.weeks[wk]) state.weeks[wk] = emptyCounts();
  state.weeks[wk][rating]++;
  state.updatedAt = now.toISOString();
  return state;
}

/** Registra uma mão jogada pelo herói (recebeu cartas). */
export function recordHand(state: ProgressState): ProgressState {
  state.handsPlayed++;
  return state;
}

export function summarize(state: ProgressState, now: Date = new Date()): ProgressSummary {
  const wk = isoWeekKey(now);
  const week = state.weeks[wk] ?? emptyCounts();
  const allRate = goodRate(state.allTime);
  const weekRate = goodRate(week);
  const weekDecisions = sum(week);
  return {
    hands: state.handsPlayed,
    decisions: sum(state.allTime),
    goodRateAll: allRate,
    goodRateWeek: weekRate,
    weekDecisions,
    // Tendência só faz sentido quando a semana já tem amostra.
    trend: weekDecisions >= 5 ? weekRate - allRate : 0,
    counts: { ...state.allTime },
  };
}

// ----- Persistência (localStorage) -----

export function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return {
      handsPlayed: parsed.handsPlayed ?? 0,
      allTime: { ...emptyCounts(), ...(parsed.allTime ?? {}) },
      weeks: parsed.weeks ?? {},
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(state: ProgressState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* armazenamento indisponível — segue sem persistir */
  }
}

export function resetProgress(): ProgressState {
  const fresh = emptyProgress();
  saveProgress(fresh);
  return fresh;
}

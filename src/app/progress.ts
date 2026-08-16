// ---------------------------------------------------------------------------
// Placar de evolução (persistente entre sessões).
//
// A cada decisão sua avaliada, guardamos a nota (boa/ok/imprecisa/ruim) num
// acumulado geral e num balde por SEMANA (ISO). Isso permite mostrar "sua taxa
// de boas decisões" e a tendência (esta semana vs. geral) — a sensação de
// progresso que traz o jogador de volta. Tudo fica no localStorage do próprio
// aparelho (nada sai do dispositivo).
//
// Além disso, rastreamos métricas avançadas para o relatório semanal e a
// progressão de "Evolução": chips perdidos em calls ruins, VPIP, folds
// pré-flop, c-bets, e bot foldados pelo jogador.
// ---------------------------------------------------------------------------

import type { Rating } from "../feedback/analyzer";

export interface RatingCounts {
  boa: number;
  ok: number;
  imprecisa: number;
  ruim: number;
}

export interface WeeklyDiscipline {
  /** Decisões que foram fold pré-flop (avaliadas como boa). */
  preflopFolds: number;
  /** Decisões que foram call (avaliadas como ruim = "não deveria ter pago"). */
  badCalls: number;
  /** Chips perdidos nessas calls ruins. */
  chipsLostOnBadCalls: number;
  /** C-bets feitas com iniciativa. */
  cbets: number;
  /** Quantas vezes os bots foldaram após a aposta do herói. */
  botsFolded: number;
  /** Decisões avaliadas no geral. */
  totalDecisions: number;
}

export interface ProgressState {
  handsPlayed: number;
  allTime: RatingCounts;
  /** Contagem por semana ISO ("2026-W30"). */
  weeks: Record<string, RatingCounts>;
  /** Métricas de disciplina por semana. */
  discipline: Record<string, WeeklyDiscipline>;
  /** VPIP histórico (total de mãos em que entrou no pote / total de mãos). */
  vpipCount: number;
  vpipHands: number;
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
  /** Chips perdidos em calls ruins na semana atual. */
  chipsLostThisWeek: number;
  chipsLostAllTime: number;
  /** Folds pré-flop na semana. */
  preflopFoldsThisWeek: number;
  /** VPIP estimado (0..100). */
  vpip: number;
  /** C-bets na semana. */
  cbetsThisWeek: number;
  /** Bots foldados na semana. */
  botsFoldedThisWeek: number;
  /** Nível de evolução (1-5) baseado no VPIP. */
  evolutionLevel: number;
  /** Taxa de boas decisões por semana ISO, para o gráfico do painel de evolução. */
  weeksCounts: Record<string, { total: number; good: number }>;
}

const STORAGE_KEY = "poker-sim-progress";

function emptyCounts(): RatingCounts {
  return { boa: 0, ok: 0, imprecisa: 0, ruim: 0 };
}

function emptyDiscipline(): WeeklyDiscipline {
  return {
    preflopFolds: 0,
    badCalls: 0,
    chipsLostOnBadCalls: 0,
    cbets: 0,
    botsFolded: 0,
    totalDecisions: 0,
  };
}

export function emptyProgress(): ProgressState {
  return {
    handsPlayed: 0,
    allTime: emptyCounts(),
    weeks: {},
    discipline: {},
    vpipCount: 0,
    vpipHands: 0,
    updatedAt: new Date().toISOString(),
  };
}

/** Chave da semana ISO de uma data: ex. "2026-W30". */
export function isoWeekKey(d: Date = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
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

function disciplineSum(w: Record<string, WeeklyDiscipline>): WeeklyDiscipline {
  const agg = emptyDiscipline();
  for (const v of Object.values(w)) {
    agg.preflopFolds += v.preflopFolds;
    agg.badCalls += v.badCalls;
    agg.chipsLostOnBadCalls += v.chipsLostOnBadCalls;
    agg.cbets += v.cbets;
    agg.botsFolded += v.botsFolded;
    agg.totalDecisions += v.totalDecisions;
  }
  return agg;
}

export function recordDecision(
  state: ProgressState,
  rating: Rating,
  now: Date = new Date(),
): ProgressState {
  state.allTime[rating]++;
  const wk = isoWeekKey(now);
  if (!state.weeks[wk]) state.weeks[wk] = emptyCounts();
  state.weeks[wk][rating]++;

  // Atualiza disciplina semanal.
  if (!state.discipline[wk]) state.discipline[wk] = emptyDiscipline();
  state.discipline[wk].totalDecisions++;

  state.updatedAt = now.toISOString();
  return state;
}

/** Registra uma mão jogada pelo herói (recebeu cartas). */
export function recordHand(state: ProgressState): ProgressState {
  state.handsPlayed++;
  return state;
}

/** Registra um fold pré-flop correto (para disciplina e VPIP). */
export function recordPreflopFold(
  state: ProgressState,
  _chipsSaved: number = 0,
  now: Date = new Date(),
): ProgressState {
  const wk = isoWeekKey(now);
  if (!state.discipline[wk]) state.discipline[wk] = emptyDiscipline();
  state.discipline[wk].preflopFolds++;
  // VPIP: essa mão NÃO entrou no pote.
  state.vpipHands++;
  return state;
}

/** Registra que o herói entrou no pote (VPIP++). */
export function recordVpip(
  state: ProgressState,
  _now: Date = new Date(),
): ProgressState {
  state.vpipCount++;
  state.vpipHands++;
  return state;
}

/** Registra uma call avaliada como ruim + chips perdidos. */
export function recordBadCall(
  state: ProgressState,
  chipsLost: number,
  now: Date = new Date(),
): ProgressState {
  const wk = isoWeekKey(now);
  if (!state.discipline[wk]) state.discipline[wk] = emptyDiscipline();
  state.discipline[wk].badCalls++;
  state.discipline[wk].chipsLostOnBadCalls += chipsLost;
  return state;
}

/** Registra uma c-bet do herói. */
export function recordCbet(
  state: ProgressState,
  _now: Date = new Date(),
): ProgressState {
  const wk = isoWeekKey(_now);
  if (!state.discipline[wk]) state.discipline[wk] = emptyDiscipline();
  state.discipline[wk].cbets++;
  return state;
}

/** Registra que um bot foldou após aposta do herói. */
export function recordBotFold(
  state: ProgressState,
  _now: Date = new Date(),
): ProgressState {
  const wk = isoWeekKey(_now);
  if (!state.discipline[wk]) state.discipline[wk] = emptyDiscipline();
  state.discipline[wk].botsFolded++;
  return state;
}

/** Calcula VPIP estimado (0..100). */
function calcVpip(state: ProgressState): number {
  if (state.vpipHands === 0) return 0;
  return Math.round((state.vpipCount / state.vpipHands) * 100);
}

/** Nível de evolução baseado no VPIP. */
function calcEvolutionLevel(vpip: number): number {
  if (vpip < 20) return 5;  // Águia
  if (vpip < 30) return 4;  // Piloto
  if (vpip < 45) return 3;  // Motorista
  if (vpip < 60) return 2;  // Condutor
  return 1;                  // Passageiro
}

export function summarize(state: ProgressState, now: Date = new Date()): ProgressSummary {
  const wk = isoWeekKey(now);
  const week = state.weeks[wk] ?? emptyCounts();
  const disc = state.discipline[wk] ?? emptyDiscipline();
  const discAll = disciplineSum(state.discipline);

  const allRate = goodRate(state.allTime);
  const weekRate = goodRate(week);
  const weekDecisions = sum(week);

  return {
    hands: state.handsPlayed,
    decisions: sum(state.allTime),
    goodRateAll: allRate,
    goodRateWeek: weekRate,
    weekDecisions,
    trend: weekDecisions >= 5 ? weekRate - allRate : 0,
    counts: { ...state.allTime },
    chipsLostThisWeek: disc.chipsLostOnBadCalls,
    chipsLostAllTime: discAll.chipsLostOnBadCalls,
    preflopFoldsThisWeek: disc.preflopFolds,
    vpip: calcVpip(state),
    cbetsThisWeek: disc.cbets,
    botsFoldedThisWeek: disc.botsFolded,
    evolutionLevel: calcEvolutionLevel(calcVpip(state)),
    weeksCounts: weeksCounts(state.weeks),
  };
}

/** Agregado por semana: total de decisões e boas (boa+ok). */
function weeksCounts(weeks: Record<string, RatingCounts>): Record<string, { total: number; good: number }> {
  const out: Record<string, { total: number; good: number }> = {};
  for (const [key, c] of Object.entries(weeks)) {
    out[key] = { total: sum(c), good: c.boa + c.ok };
  }
  return out;
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
      discipline: parsed.discipline ?? {},
      vpipCount: parsed.vpipCount ?? 0,
      vpipHands: parsed.vpipHands ?? 0,
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

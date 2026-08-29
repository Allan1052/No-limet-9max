// ---------------------------------------------------------------------------
// SEQUÊNCIA DIÁRIA (streak) — o hábito que faz o recreativo voltar.
//
// Conta quantos DIAS SEGUIDOS o jogador treinou (fez pelo menos uma decisão).
// Tudo local (localStorage), sem backend, sem login. Usa a data LOCAL do
// aparelho (não UTC) pra "hoje" bater com o dia real do usuário.
// ---------------------------------------------------------------------------
import { trackEvent } from "../app/analytics";

const KEY = "cof-streak-v1";

interface StreakState {
  current: number;
  best: number;
  last: string; // "YYYY-MM-DD" do último dia com atividade
}

function dayStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function previousLocalDay(d: Date): Date {
  const previous = new Date(d);
  previous.setDate(previous.getDate() - 1);
  return previous;
}

function load(): StreakState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (typeof s.current === "number" && typeof s.best === "number" && typeof s.last === "string") {
        return s;
      }
    }
  } catch {
    /* ignore */
  }
  return { current: 0, best: 0, last: "" };
}

function save(s: StreakState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/**
 * Marca que o jogador treinou no dia informado (HOJE por padrão).
 * Idempotente no mesmo dia. O parâmetro existe para testes determinísticos.
 */
export function markActiveToday(now: Date = new Date()): { current: number; best: number; incremented: boolean } {
  const s = load();
  const today = dayStr(now);
  if (s.last === today) {
    return { current: s.current, best: s.best, incremented: false };
  }
  const yesterday = dayStr(previousLocalDay(now));
  const current = s.last === yesterday ? s.current + 1 : 1;
  const best = Math.max(s.best, current);
  save({ current, best, last: today });

  if (current === 1) {
    trackEvent("streak_started", { day: today });
  } else {
    trackEvent("streak_day", { day: today, streak: current, best });
  }

  return { current, best, incremented: true };
}

/** Sequência viva no dia informado (HOJE por padrão). */
export function getStreak(now: Date = new Date()): { current: number; best: number } {
  const s = load();
  const today = dayStr(now);
  const yesterday = dayStr(previousLocalDay(now));
  const alive = s.last === today || s.last === yesterday;
  return { current: alive ? s.current : 0, best: s.best };
}

/** Estado pronto para a UI: separa sequência viva de treino concluído hoje. */
export function getTrainingDayStatus(now: Date = new Date()): {
  trainedToday: boolean;
  current: number;
  best: number;
} {
  const s = load();
  const streak = getStreak(now);
  return {
    trainedToday: s.last === dayStr(now),
    current: streak.current,
    best: streak.best,
  };
}

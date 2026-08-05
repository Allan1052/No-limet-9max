// ---------------------------------------------------------------------------
// SEQUÊNCIA DIÁRIA (streak) — o hábito que faz o recreativo voltar.
//
// Conta quantos DIAS SEGUIDOS o jogador treinou (fez pelo menos uma decisão).
// Tudo local (localStorage), sem backend, sem login. Usa a data LOCAL do
// aparelho (não UTC) pra "hoje" bater com o dia real do usuário.
// ---------------------------------------------------------------------------

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
 * Marca que o jogador treinou HOJE. Idempotente no mesmo dia.
 * Devolve o estado e se a sequência aumentou agora (pra comemorar).
 */
export function markActiveToday(): { current: number; best: number; incremented: boolean } {
  const s = load();
  const today = dayStr();
  if (s.last === today) {
    return { current: s.current, best: s.best, incremented: false };
  }
  const yesterday = dayStr(new Date(Date.now() - 864e5));
  const current = s.last === yesterday ? s.current + 1 : 1;
  const best = Math.max(s.best, current);
  save({ current, best, last: today });
  return { current, best, incremented: true };
}

/**
 * Sequência pra MOSTRAR agora (honesta): se o último treino foi hoje ou ontem,
 * a sequência está viva; senão, quebrou (mostra 0).
 */
export function getStreak(): { current: number; best: number } {
  const s = load();
  const today = dayStr();
  const yesterday = dayStr(new Date(Date.now() - 864e5));
  const alive = s.last === today || s.last === yesterday;
  return { current: alive ? s.current : 0, best: s.best };
}

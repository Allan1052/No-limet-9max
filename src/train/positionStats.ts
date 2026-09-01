// ---------------------------------------------------------------------------
// Acumulador LOCAL de tendência por posição (Perfil → "Seu jogo").
// Guarda, por posição, quantas mãos, quantos acertos e a direção dos erros
// (agressivo/passivo). Tudo local, deste aparelho. A leitura usa o módulo puro
// positionTendency para montar o relatório.
// ---------------------------------------------------------------------------
import {
  reportFromCounts,
  type Fam,
  type PositionCounts,
  type PositionReport,
} from "./positionTendency";

const KEY = "cof-posstats-v1";

type Store = Record<string, PositionCounts>;

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const p = JSON.parse(raw);
    return p && typeof p === "object" ? p : {};
  } catch {
    return {};
  }
}

function save(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

function famRank(f?: Fam): number {
  return f === "fold" ? 0 : f === "check" ? 1 : f === "call" ? 2 : f === "aggro" ? 3 : -1;
}

/** Registra uma decisão avaliada na posição do herói. */
export function recordPositionResult(input: {
  position?: string;
  correct: boolean;
  heroFam?: Fam;
  adviceFam?: Fam;
}): void {
  const position = input.position;
  if (!position) return;
  const store = load();
  const c = store[position] ?? { hands: 0, correct: 0, aggressive: 0, passive: 0 };
  c.hands += 1;
  if (input.correct) {
    c.correct += 1;
  } else {
    const h = famRank(input.heroFam);
    const a = famRank(input.adviceFam);
    if (h >= 0 && a >= 0 && h !== a) {
      if (h > a) c.aggressive += 1;
      else c.passive += 1;
    }
  }
  store[position] = c;
  save(store);
}

/** Relatório por posição acumulado (pior primeiro). */
export function positionStatsReport(): PositionReport[] {
  return reportFromCounts(load());
}

/** Limpa o acumulado (usado no reset de progresso). */
export function resetPositionStats(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

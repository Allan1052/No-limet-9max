import type { ProgressSummary } from "./progress";

const SESSION_KEY = "call-or-fold-session-progress-v1";

export interface SessionStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface SessionBaseline {
  hands: number;
  decisions: number;
  good: number;
}

export interface SessionProgress {
  hands: number;
  decisions: number;
  good: number;
  accuracy: number;
}

function baselineFrom(summary: ProgressSummary): SessionBaseline {
  return {
    hands: summary.hands,
    decisions: summary.decisions,
    good: summary.counts.boa + summary.counts.ok,
  };
}

function isValidBaseline(value: unknown, current: SessionBaseline): value is SessionBaseline {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<SessionBaseline>;
  return (
    Number.isFinite(v.hands) &&
    Number.isFinite(v.decisions) &&
    Number.isFinite(v.good) &&
    (v.hands ?? -1) >= 0 &&
    (v.decisions ?? -1) >= 0 &&
    (v.good ?? -1) >= 0 &&
    (v.hands ?? Infinity) <= current.hands &&
    (v.decisions ?? Infinity) <= current.decisions &&
    (v.good ?? Infinity) <= current.good
  );
}

export function loadOrCreateSessionBaseline(
  summary: ProgressSummary,
  storage: SessionStorageLike,
): SessionBaseline {
  const current = baselineFrom(summary);
  try {
    const raw = storage.getItem(SESSION_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isValidBaseline(parsed, current)) return parsed;
    }
    storage.setItem(SESSION_KEY, JSON.stringify(current));
  } catch {
    // Storage pode estar indisponível em modo privado/restrito. Nesse caso,
    // a faixa continua funcionando apenas durante a montagem atual.
  }
  return current;
}

export function calculateSessionProgress(
  summary: ProgressSummary,
  baseline: SessionBaseline,
): SessionProgress {
  const hands = Math.max(0, summary.hands - baseline.hands);
  const decisions = Math.max(0, summary.decisions - baseline.decisions);
  const goodNow = summary.counts.boa + summary.counts.ok;
  const good = Math.max(0, goodNow - baseline.good);
  const rawAccuracy = decisions > 0 ? Math.round((good / decisions) * 100) : 0;
  const accuracy = Math.max(0, Math.min(100, rawAccuracy));
  return { hands, decisions, good, accuracy };
}

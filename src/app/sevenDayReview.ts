import type { HandHistoryEntry } from "./handHistoryLog";

export interface SevenDayRecommendation {
  mode: "preflop" | "postflop";
  label: string;
  count: number;
}

export interface SevenDayReview {
  total: number;
  attention: number;
  solid: number;
  accuracyPct: number | null;
  trend: "up" | "down" | "stable" | null;
  recommendation: SevenDayRecommendation | null;
}

const DAY = 86400000;

function isAttention(e: HandHistoryEntry): boolean {
  return e.item.rating === "ruim" || e.item.rating === "imprecisa";
}

function modeOf(e: HandHistoryEntry): "preflop" | "postflop" {
  if (e.item.kind) return e.item.kind;
  return String(e.item.street).toLowerCase().includes("pré") || String(e.item.street).toLowerCase().includes("pre")
    ? "preflop"
    : "postflop";
}

function rate(list: HandHistoryEntry[]): number | null {
  if (list.length < 3) return null;
  const solid = list.filter((e) => !isAttention(e)).length;
  return Math.round((solid / list.length) * 100);
}

export function buildSevenDayReview(entries: HandHistoryEntry[], now = Date.now()): SevenDayReview {
  const current = entries.filter((e) => e.timestamp <= now && e.timestamp >= now - 7 * DAY);
  const previous = entries.filter((e) => e.timestamp < now - 7 * DAY && e.timestamp >= now - 14 * DAY);
  const attentionEntries = current.filter(isAttention);
  const solid = current.length - attentionEntries.length;
  const curRate = rate(current);
  const prevRate = rate(previous);
  const trend = curRate === null || prevRate === null
    ? null
    : curRate > prevRate + 4 ? "up" : curRate < prevRate - 4 ? "down" : "stable";

  const groups = new Map<string, { mode: "preflop" | "postflop"; count: number; label: string }>();
  for (const e of attentionEntries) {
    const mode = modeOf(e);
    const from = e.item.heroFam ?? e.item.heroAction ?? "ação";
    const to = e.item.adviceFam ?? e.item.advice ?? "referência";
    const key = `${mode}:${from}:${to}`;
    const cur = groups.get(key);
    groups.set(key, cur ? { ...cur, count: cur.count + 1 } : { mode, count: 1, label: `${from} → ${to}` });
  }
  const top = [...groups.values()].sort((a, b) => b.count - a.count)[0];
  // Uma ocorrência isolada não vira “ponto fraco”. Exigimos recorrência mínima.
  const recommendation = top && top.count >= 2 ? top : null;

  return {
    total: current.length,
    attention: attentionEntries.length,
    solid,
    accuracyPct: curRate,
    trend,
    recommendation,
  };
}

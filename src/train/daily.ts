// ---------------------------------------------------------------------------
// MÃO DO DIA — uma mão igual pra TODO MUNDO, todo dia.
//
// É gerada de forma DETERMINÍSTICA a partir da data (semente): quem abre o app
// hoje pega a mesma mão que todo mundo — vira ritual ("acertou a do dia?") e
// conteúdo compartilhável. Tudo local, sem backend.
// ---------------------------------------------------------------------------

import { POSITIONS, type Position } from "../ranges/types";
import { buildScenarioFromSpec, type Scenario, type ScenarioSpec } from "./scenarios";

// Hash estável de string (FNV-1a) → semente pro PRNG.
function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// PRNG determinístico (mulberry32) — mesma semente, mesma sequência.
function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dayStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** A mão do dia de hoje — determinística pela data. */
export function buildDailyScenario(): { day: string; scenario: Scenario } {
  const day = dayStr();
  const rng = mulberry32(hashStr("cof-daily-" + day));
  const stacks = [20, 40, 60, 100];
  const effectiveBB = stacks[Math.floor(rng() * stacks.length)];
  const heroPosition = POSITIONS[Math.floor(rng() * POSITIONS.length)] as Position;
  const before = POSITIONS.slice(0, POSITIONS.indexOf(heroPosition)) as Position[];
  const facing = before.length > 0 && rng() < 0.6;
  const raiserPosition = facing ? (before[Math.floor(rng() * before.length)] as Position) : undefined;
  const spec: ScenarioSpec = {
    heroPosition,
    effectiveBB,
    raiserPosition,
    openSizeBB: raiserPosition ? 2.0 : undefined, // open padrão do app (2.0bb)
  };
  return { day, scenario: buildScenarioFromSpec(spec, rng) };
}

const KEY = "cof-daily-v1";

/** Estado do dia já resolvido (ou null se ainda não resolveu hoje). */
export function loadDaily(): { day: string; correct: boolean } | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (typeof p.day === "string" && typeof p.correct === "boolean") return p;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveDaily(day: string, correct: boolean): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ day, correct }));
  } catch {
    /* ignore */
  }
}

export function isDailyDone(day: string): boolean {
  return loadDaily()?.day === day;
}

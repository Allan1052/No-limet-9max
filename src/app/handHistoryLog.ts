// ── Histórico de mãos ("Hand Log") ────────────────────────────────────────────
//
// Grava, no aparelho de cada jogador, as mãos com feedback relevante (ok,
// imprecisa e ruim — as que valem revisão) de cada torneio concluído, com
// contexto da sessão (buy-in, circuito/etapa, campo) para filtrar depois.
//
// Usa a chave cof-hand-log no localStorage, limitada a 200 mãos (as mais
// antigas saem). Não depende do motor: é só registro de exibição.
//
// Filtros oferecidos à UI:
//   - rating: ok / imprecisa / ruim
//   - heroFam (a sua ação): fold / check / call / aggro
//   - buyIn mínimo
//   - circuito ou livre

import type { FeedbackItem } from "../feedback/analyzer";

export interface HandHistoryEntry {
  /** A decisão: rua, o que fez, o que era recomendado, nota e razão. */
  item: FeedbackItem;
  /** Buy-in do torneio onde a mão ocorreu. */
  buyIn: number;
  /** "circuito" ou "livre". */
  mode: "livre" | "circuito";
  /** Etapa do circuito, quando aplicável. */
  circuitStage?: number;
  /** Campo de inscritos do torneio. */
  entrants: number;
  /** Data (ms). */
  timestamp: number;
}

const STORAGE_KEY = "cof-hand-log";
const MAX_ENTRIES = 200;

// Categorias de erro exibíveis no filtro "tipo de erro":
export type ErrorKind = "ruim" | "imprecisa";
export const ERROR_KINDS: ErrorKind[] = ["ruim", "imprecisa"];

export function loadHandLog(): HandHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (e) => e && e.item && typeof e.item.rating === "string" && typeof e.timestamp === "number",
    ) as HandHistoryEntry[];
  } catch {
    return [];
  }
}

/** Adiciona uma entrada (chamado ao fim do torneio, uma vez por sessão). */
export function appendHandLog(entries: HandHistoryEntry[]): void {
  const list = loadHandLog();
  list.push(...entries);
  list.sort((a, b) => b.timestamp - a.timestamp);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
  } catch {
    // storage cheio ou indisponível — ignora
  }
}

export type HandLogFilter = {
  kind?: ErrorKind; // rating da decisão
  fam?: string; // família da AÇÃO do herói (fold/call/aggro...)
  minBuyIn?: number;
  circuitOnly?: boolean;
};

export function filterHandLog(list: HandHistoryEntry[], f: HandLogFilter): HandHistoryEntry[] {
  let out = list;
  if (f.kind) out = out.filter((e) => e.item.rating === f.kind);
  if (f.fam) out = out.filter((e) => e.item.heroFam === f.fam);
  if (f.minBuyIn) out = out.filter((e) => e.buyIn >= (f.minBuyIn as number));
  if (f.circuitOnly) out = out.filter((e) => e.mode === "circuito");
  return out;
}

export function handLogCount(f?: HandLogFilter): number {
  return filterHandLog(loadHandLog(), f ?? {}).length;
}

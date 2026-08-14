// ── Diário de resultados ("Trophy Room") ─────────────────────────────────────
//
// Grava, no aparelho de cada jogador, o resultado de cada torneio concluído:
// colocação, campo de jogadores, buy-in, prêmio, circuito/etapa e data.
// Serve duas frentes:
//   1. "Top 10 Premiações" no Perfil (os 10 maiores prêmios)
//   2. Card de Conquista ao terminar torneio no dinheiro
//
// Persistência: localStorage do navegador, chave cof-trophy-room.
// Limite de 50 registros (os mais antigos saem) — leve e eterno.

export interface TournamentResultRecord {
  finishPlace: number; // 1 = campeão
  entrants: number;
  buyIn: number;
  cash: number; // prêmio ($) — 0 se fora do dinheiro
  inMoney: boolean;
  mode: "livre" | "circuito";
  circuitStage?: number; // 1..10, quando modo = "circuito"
  timestamp: number;
}

const STORAGE_KEY = "cof-trophy-room";
const MAX_RECORDS = 50;

export function loadResults(): TournamentResultRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (r) =>
        r &&
        typeof r.finishPlace === "number" &&
        typeof r.entrants === "number" &&
        typeof r.buyIn === "number" &&
        typeof r.cash === "number"
    ) as TournamentResultRecord[];
  } catch {
    return [];
  }
}

export function addTournamentResult(rec: TournamentResultRecord): void {
  const list = loadResults();
  list.push(rec);
  // mantém os 50 mais recentes (ordem cronológica)
  list.sort((a, b) => b.timestamp - a.timestamp);
  const trimmed = list.slice(0, MAX_RECORDS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // storage cheio ou indisponível — ignora silenciosamente
  }
}

/** Os 10 maiores prêmios ganhos (ordenados por cash desc). */
export function topPrizes(n = 10): TournamentResultRecord[] {
  return loadResults()
    .filter((r) => r.inMoney && r.cash > 0)
    .sort((a, b) => b.cash - a.cash || a.timestamp - b.timestamp)
    .slice(0, n);
}

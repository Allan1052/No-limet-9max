// Regressão: a Trajetória por Buy-in conta todos os torneios do Circuito
// disputados (premiados ou não), separados por faixa de buy-in.
import { describe, it, expect } from "vitest";
import type { TournamentResultRecord } from "./resultsLog";

function countByTier(records: TournamentResultRecord[]) {
  const byTier = new Map<string, { played: number; inMoney: number }>();
  for (const r of records) {
    if (r.mode !== "circuito") continue;
    const tier = tierOf(r.buyIn);
    const c = byTier.get(tier) || { played: 0, inMoney: 0 };
    c.played += 1;
    if (r.inMoney) c.inMoney += 1;
    byTier.set(tier, c);
  }
  return byTier;
}

// Replica a mesma regra do tierForBuyIn do app (segura de editar).
function tierOf(buyIn: number): string {
  if (buyIn <= 5) return "micro";
  if (buyIn <= 11) return "baixa";
  if (buyIn <= 55) return "media";
  if (buyIn >= 1000) return "elite";
  return "alta";
}

describe("Trajetória por Buy-in — contagem por faixa", () => {
  it("agrega por faixa, ignorando Torneio Livre", () => {
    const recs: TournamentResultRecord[] = [
      { finishPlace: 34, entrants: 60, buyIn: 11, cash: 0, inMoney: false, mode: "circuito", circuitStage: 2, timestamp: 1 },
      { finishPlace: 9, entrants: 100, buyIn: 11, cash: 100, inMoney: true, mode: "circuito", circuitStage: 3, timestamp: 2 },
      { finishPlace: 7, entrants: 180, buyIn: 1000, cash: 5000, inMoney: true, mode: "circuito", circuitStage: 4, timestamp: 3 },
      { finishPlace: 3, entrants: 100, buyIn: 22, cash: 30, inMoney: true, mode: "livre", timestamp: 4 }, // não conta
    ];
    const c = countByTier(recs);
    expect(c.get("baixa")?.played).toBe(2);
    expect(c.get("baixa")?.inMoney).toBe(1);
    expect(c.get("elite")?.played).toBe(1);
    expect(c.get("elite")?.inMoney).toBe(1);
    expect(c.get("media")).toBeUndefined(); // $22 foi treino livre
  });

  it("$5 micro, $22/$55 média, $109 alta, $1.000/$10.300 elite", () => {
    const checks: Array<[number, string]> = [
      [5, "micro"],
      [11, "baixa"],
      [22, "media"],
      [55, "media"],
      [109, "alta"],
      [1000, "elite"],
      [10300, "elite"],
    ];
    for (const [buyIn, tier] of checks) {
      const recs: TournamentResultRecord[] = [
        { finishPlace: 5, entrants: 100, buyIn, cash: 0, inMoney: false, mode: "circuito", timestamp: 1 },
      ];
      const c = countByTier(recs);
      expect(c.get(tier)?.played, `buyIn ${buyIn} → ${tier}`).toBe(1);
    }
  });

  it("um torneio fora do dinheiro ainda conta como disputado", () => {
    const recs: TournamentResultRecord[] = [
      { finishPlace: 60, entrants: 100, buyIn: 22, cash: 0, inMoney: false, mode: "circuito", circuitStage: 1, timestamp: 1 },
    ];
    const c = countByTier(recs);
    expect(c.get("media")?.played).toBe(1);
    expect(c.get("media")?.inMoney).toBe(0);
  });
});

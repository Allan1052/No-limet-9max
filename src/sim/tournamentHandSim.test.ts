import { describe, it } from "vitest";
import { simulateHandsToFinalTable, analyzeStage } from "./tournamentHandSim";
import { paidPlaces } from "../tournament/structure";

describe("Tournament Simulation — Hands to Final Table", () => {
  const sizes = [100, 200, 300, 1000, 2000];

  it("simulates each tournament size and logs results", () => {
    for (const entrants of sizes) {
      const result = simulateHandsToFinalTable(entrants);
      const paid = paidPlaces(entrants);
      console.log(`\n══ Torneio ${entrants} inscritos ══`);
      console.log(`   ITM places: ${paid}`);
      console.log(`   Mãos até mesa final: ${result.handsToFT}`);
      console.log(`   Níveis percorridos: ${result.levelReached}`);
      for (const [stage, hands] of Object.entries(result.handsPerStage)) {
        const pct = ((hands / result.handsToFT) * 100).toFixed(1);
        console.log(`   ${stage}: ${hands} mãos (${pct}%)`);
      }
    }
  });

  it("analyzes fold/call/raise distribution per stage", () => {
    const stages = ["inicio", "meio", "bolha", "mesa_final"] as const;
    const bbPerStage = { inicio: 100, meio: 45, bolha: 22, mesa_final: 20 };

    for (const stage of stages) {
      const breakdown = analyzeStage(bbPerStage[stage], stage);
      const total = breakdown.fold + breakdown.call + breakdown.raise;
      const foldPct = ((breakdown.fold / total) * 100).toFixed(1);
      const callPct = ((breakdown.call / total) * 100).toFixed(1);
      const raisePct = ((breakdown.raise / total) * 100).toFixed(1);

      console.log(`\n══ Estágio ${stage} (${bbPerStage[stage]}bb) ══`);
      console.log(`   FOLD: ${foldPct}% | CALL: ${callPct}% | RAISE: ${raisePct}%`);
      console.log(`   Raw: F=${breakdown.fold} C=${breakdown.call} R=${breakdown.raise}`);
    }
  });
});

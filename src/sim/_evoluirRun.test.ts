// Régua sob demanda — roda a evolução e imprime o resultado.
//   CF_REGUA=1 CF_BUYIN=10300 CF_GER=8 CF_POP=6 CF_MAOS=900 \
//     npx vitest run src/sim/_evoluirRun.test.ts
import { describe, it } from "vitest";
import { evoluir, paraTabela } from "./evoluir";

describe("evolução dos bots", () => {
  it("roda gerações e mostra o que mudou", () => {
    const buyIn = Number(process.env.CF_BUYIN || 10300);
    const r = evoluir({
      buyIn,
      geracoes: Number(process.env.CF_GER || 6),
      populacao: Number(process.env.CF_POP || 6),
      maosPorDisputa: Number(process.env.CF_MAOS || 700),
      aoFimDaGeracao: (g, m) => {
        const media = m.reduce((s, c) => s + c.contraBaseline, 0) / m.length;
        console.log(`  geração ${g}: média contra o baseline = ${media.toFixed(1)} bb/100`);
      },
    });
    console.log(`\n=== EVOLUÇÃO na faixa $${buyIn} · ${r.geracoes} gerações ===`);
    console.log("arquétipo      antes   depois   ganho   deriva");
    for (const g of r.ganho) {
      console.log(
        `${g.arq.padEnd(12)} ${String(g.antes).padStart(7)} ${String(g.depois).padStart(8)} ` +
        `${(Math.round((g.depois - g.antes) * 10) / 10).toString().padStart(7)} ${String(g.deriva).padStart(8)}`,
      );
    }
    console.log("\n--- genomas campeões ---\n" + paraTabela(r) + "\n");
  }, 3_600_000);
});

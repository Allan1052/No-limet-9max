// Execução sob demanda: mede quanto o coach fala em cada faixa de buy-in.
// Não faz parte da suíte de guarda. Roda com:
//   CF_REGUA=1 npx vitest run src/sim/_vozRun.test.ts
import { describe, it } from "vitest";
import { medirVoz, taxas } from "./vozDoCoach";

const FAIXAS = (process.env.CF_FAIXAS || "5,109,10300").split(",").map((x) => Number(x.trim()));
const TORNEIOS = Number(process.env.CF_TORNEIOS || 8);

describe("quanto o coach fala", () => {
  it("joga torneios e conta em que nível cada decisão cai", () => {
    const linhas: string[] = [];
    linhas.push("buyIn torneios  maos  dec.   calado% comentada% review%");
    for (const buyIn of FAIXAS) {
      const t0 = Date.now();
      const r = medirVoz({ buyIn, torneios: TORNEIOS, semente: 20260917 });
      const x = taxas(r);
      linhas.push([
        String(buyIn).padStart(5), String(r.torneios).padStart(8),
        String(r.maos).padStart(5), String(r.decisoes).padStart(6),
        `${x.calado}%`.padStart(10), `${x.comentada}%`.padStart(11), `${x.review}%`.padStart(8),
      ].join(""));
      linhas.push(`   (${Math.round((Date.now() - t0) / 1000)}s · sinais: ${x.sinais.join(" · ")})`);
      if (r.semLeitura) linhas.push(`   ⚠️ ${r.semLeitura} decisões sem leitura de importância`);
    }
    console.log("\n" + linhas.join("\n") + "\n");
  }, 600_000);
});

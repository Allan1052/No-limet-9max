// Execução sob demanda: mede a frequência do SPOT DE ACUMULAÇÃO por faixa.
// Não faz parte da suíte de guarda. Roda com:
//   CF_REGUA=1 npx vitest run src/sim/_acumulacaoRun.test.ts
import { describe, it } from "vitest";
import { medirAcumulacao, taxasDeAcumulacao } from "./reguaDeAcumulacao";

const FAIXAS = (process.env.CF_FAIXAS || "5,109,10300").split(",").map((x) => Number(x.trim()));
const TORNEIOS = Number(process.env.CF_TORNEIOS || 8);

describe("com que frequência aparece um spot de acumulação", () => {
  it("joga torneios e conta as decisões em que o padrão manda escalar", () => {
    const l: string[] = [];
    l.push("buyIn  torn.  maos   dec.  spots | spots/torn  %das dec  %das maos  %pre");
    for (const buyIn of FAIXAS) {
      const t0 = Date.now();
      const r = medirAcumulacao({ buyIn, torneios: TORNEIOS, semente: 20261013 });
      const x = taxasDeAcumulacao(r);
      l.push([
        String(buyIn).padStart(5), String(r.torneios).padStart(7),
        String(r.maos).padStart(6), String(r.decisoes).padStart(7), String(r.spots).padStart(7),
        String(x.spotsPorTorneio).padStart(12), `${x.pctDasDecisoes}%`.padStart(10),
        `${x.pctDasMaos}%`.padStart(11), `${x.pctPreflop}%`.padStart(6),
      ].join(""));
      l.push(`   (${Math.round((Date.now() - t0) / 1000)}s · pré ${r.spotsPreflop} · pós ${r.spotsPostflop})`);
      if (r.semFamilia) l.push(`   ⚠️ ${r.semFamilia} decisões sem adviceFam`);
    }
    console.log("\n" + l.join("\n") + "\n");
  }, 600_000);
});

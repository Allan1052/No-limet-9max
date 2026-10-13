// Execução sob demanda: quanto CUSTA (em mãos e decisões) cada tamanho de campo,
// e quanto rende de treino. Serve para desenhar o circuito com dado em vez de
// palpite. Roda com:
//   CF_REGUA=1 npx vitest run src/sim/_campoRun.test.ts
import { describe, it } from "vitest";
import { medirAcumulacao, taxasDeAcumulacao } from "./reguaDeAcumulacao";

const CAMPOS = (process.env.CF_CAMPOS || "60,100,180,300,500,800,1200,1600,2000,3000")
  .split(",").map((x) => Number(x.trim()));
const TORNEIOS = Number(process.env.CF_TORNEIOS || 4);
const BUYIN = Number(process.env.CF_BUYIN || 109);

describe("quanto custa cada tamanho de campo", () => {
  it("mede mãos, decisões e spots de acumulação por torneio", () => {
    const l: string[] = [];
    l.push("campo   maos/torn  dec/torn  spots/torn  seg/torn");
    for (const entrants of CAMPOS) {
      const t0 = Date.now();
      const r = medirAcumulacao({ buyIn: BUYIN, entrants, torneios: TORNEIOS, semente: 20261013 });
      const x = taxasDeAcumulacao(r);
      const seg = (Date.now() - t0) / 1000 / TORNEIOS;
      l.push([
        String(entrants).padStart(5),
        String(x.maosPorTorneio).padStart(11),
        String(x.decisoesPorTorneio).padStart(10),
        String(x.spotsPorTorneio).padStart(12),
        (Math.round(seg * 10) / 10).toFixed(1).padStart(10),
      ].join(""));
    }
    console.log("\n" + l.join("\n") + "\n");
  }, 1_800_000);
});

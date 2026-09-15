// Execução sob demanda: mede a pressão do campo em cada faixa de buy-in.
// Não faz parte da suíte de guarda — é a régua que eu uso para responder
// "o campo aperta o jogador?". Roda com:
//   CF_REGUA=1 npx vitest run src/sim/_pressaoRun.test.ts
import { describe, it } from "vitest";
import { medirPressao, taxas } from "./pressaoDoCampo";

const FAIXAS = (process.env.CF_FAIXAS || "5,11,22,55,109,1000,10300")
  .split(",")
  .map((x) => Number(x.trim()));
const TORNEIOS = Number(process.env.CF_TORNEIOS || 12);

describe("pressão do campo por faixa de buy-in", () => {
  it("joga torneios completos e mede o que o campo faz com o jogador", () => {
    const linhas: string[] = [];
    linhas.push(
      "buyIn torneios  maos  dec. 3betVsOpen cbetVsEle apostas/100(F/T/R)  ckR/100 ckRsofr% allin/100 apertados% degraca% comMao% ITM% posMed",
    );
    for (const buyIn of FAIXAS) {
      const t0 = Date.now();
      const r = medirPressao({ buyIn, torneios: TORNEIOS, semente: 20260915, maxPassos: 40_000 });
      const x = taxas(r);
      linhas.push(
        [
          String(buyIn).padStart(5),
          String(r.torneios).padStart(8),
          String(r.maos).padStart(5),
          String(r.decisoes).padStart(5),
          `${x.tresBetContraAbertura}%`.padStart(11),
          `${x.cbetContraEle}%`.padStart(10),
          `${x.apostasPor100.flop}/${x.apostasPor100.turn}/${x.apostasPor100.river}`.padStart(19),
          String(x.checkRaisePor100).padStart(8),
          `${x.checkRaiseSofridoPct}%`.padStart(8),
          String(x.allinPor100).padStart(10),
          `${x.spotsApertadosPct}%`.padStart(11),
          `${x.cartaDeGracaPct}%`.padStart(9),
          `${x.apostaComMaoPct}%`.padStart(7),
          `${x.itmPct}%`.padStart(5),
          String(x.posicaoMedia).padStart(7),
        ].join(" "),
      );
      linhas.push(`   (${((Date.now() - t0) / 1000).toFixed(0)}s · ${r.flopsDisputados} flops disputados · ${r.spotsApertados} spots apertados · ${r.aberturas} aberturas · ${r.apostasDeVilao} apostas de vilão · posições ${r.posicoes.join("/")})`);
    }
    console.log("\n" + linhas.join("\n") + "\n");
  }, 3_600_000);
});

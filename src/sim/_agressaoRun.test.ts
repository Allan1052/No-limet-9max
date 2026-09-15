// Régua sob demanda: CF_REGUA=1 npx vitest run src/sim/_agressaoRun.test.ts
import { describe, it } from "vitest";
import { medirAgressao, taxasDeAgressao } from "./agressaoDoCampo";

const FAIXAS = [5, 11, 22, 55, 109, 1000, 10300];
const MAOS = Number(process.env.CF_MAOS || 1200);

describe("agressão do campo por faixa", () => {
  it("mede check-raise, c-bet e barrel do turn", () => {
    console.log("\nbuyIn   mãos  ckRaise%  cbet%  barrelTurn%  raiseVsAposta%   (amostras)");
    for (const buyIn of FAIXAS) {
      const r = medirAgressao(MAOS, buyIn);
      const x = taxasDeAgressao(r);
      console.log(
        [
          String(buyIn).padStart(5),
          String(r.maos).padStart(6),
          `${x.checkRaisePct}%`.padStart(9),
          `${x.cbetPct}%`.padStart(6),
          `${x.barrelTurnPct}%`.padStart(12),
          `${x.raiseContraApostaPct}%`.padStart(15),
          `   (cr ${r.spotsDeCheckRaise} · cb ${r.spotsDeCbet} · bt ${r.spotsDeBarrelTurn})`,
        ].join(" "),
      );
    }
    console.log("");
  }, 1_800_000);
});

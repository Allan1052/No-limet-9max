import { describe, it, expect } from "vitest";
import { runCalibration, GTO_SPOTS } from "./gtoBenchmark";

describe("SELO DE CONFIANÇA — calibração GTO do pré-flop", () => {
  const r = runCalibration();

  it(`concordância com o GTO nos ${GTO_SPOTS.length} spots-referência`, () => {
    // eslint-disable-next-line no-console
    console.log(
      `\n[SELO GTO] ${r.matched}/${r.total} spots batem = ${Math.round(r.score * 100)}% de concordância`,
    );
    if (r.misses.length > 0) {
      // eslint-disable-next-line no-console
      console.log("  divergências:");
      for (const m of r.misses) {
        // eslint-disable-next-line no-console
        console.log(`   - ${m.note}: esperado ${m.expect}, motor deu "${m.got}"`);
      }
    }
    // Trava de qualidade: o motor precisa bater com o GTO em pelo menos 95%
    // dos spots de consenso. Se cair abaixo, ou entrou um leak no motor ou uma
    // entrada ruim no banco — o build quebra e a gente investiga.
    expect(r.score).toBeGreaterThanOrEqual(0.95);
  });
});

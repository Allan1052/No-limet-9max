// ---------------------------------------------------------------------------
// O CIRCUITO TEM DE ESPELHAR O MUNDO QUE O JOGADOR JOGA.
//
// 13/10/2026. Metade das etapas tinha campo MENOR que o campo médio real do
// Allan no PokerStars (279). Isto aqui impede a regressão.
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import { CIRCUIT_STAGES, circuitStageByEntrants, fullCircuitValue, stageWinValue } from "./circuit";
import { paidPlaces } from "./structure";

/** O campo médio medido no histórico SharkScope do Allan1052. */
const CAMPO_REAL_DO_ALLAN = 279;
/** O campo médio medido no histórico do bbru156 (ROI 7,6× maior). */
const CAMPO_DO_IRMAO = 1446;

describe("Os campos do circuito", () => {
  it("nenhuma etapa é menor que o campo que ele já joga na vida real", () => {
    const pequenas = CIRCUIT_STAGES.filter((s) => s.entrants < CAMPO_REAL_DO_ALLAN / 2);
    expect(pequenas).toHaveLength(0);
  });

  it("existe uma etapa no campo real dele e uma no campo do irmão", () => {
    const perto = (alvo: number) =>
      CIRCUIT_STAGES.some((s) => Math.abs(s.entrants - alvo) / alvo <= 0.15);
    expect(perto(CAMPO_REAL_DO_ALLAN)).toBe(true);
    expect(perto(CAMPO_DO_IRMAO)).toBe(true);
  });

  it("sobe sempre, sem degrau repetido", () => {
    for (let i = 1; i < CIRCUIT_STAGES.length; i++) {
      expect(CIRCUIT_STAGES[i].entrants).toBeGreaterThan(CIRCUIT_STAGES[i - 1].entrants);
    }
  });

  it("toda etapa paga ao menos uma mesa final cheia", () => {
    for (const s of CIRCUIT_STAGES) {
      expect(s.paid).toBe(paidPlaces(s.entrants));
      expect(s.paid).toBeGreaterThanOrEqual(9);
    }
  });

  it("o Main Event é campo de domingo de verdade", () => {
    const main = CIRCUIT_STAGES[CIRCUIT_STAGES.length - 1];
    expect(main.isMainEvent).toBe(true);
    expect(main.entrants).toBeGreaterThanOrEqual(5000);
  });

  it("cravar só o Main Event não vale o circuito inteiro — mata o farm", () => {
    const buyIn = 109;
    const main = stageWinValue(CIRCUIT_STAGES.length, buyIn);
    expect(main / fullCircuitValue(buyIn)).toBeLessThan(0.5);
  });

  it("a busca por inscritos continua achando todas as etapas", () => {
    for (const s of CIRCUIT_STAGES) {
      expect(circuitStageByEntrants(s.entrants)?.index).toBe(s.index);
    }
  });

  it("a escada de prêmio do maior campo é construída sem travar", () => {
    const t0 = Date.now();
    const main = CIRCUIT_STAGES[CIRCUIT_STAGES.length - 1];
    expect(stageWinValue(main.index, 10300)).toBeGreaterThan(0);
    expect(Date.now() - t0).toBeLessThan(2000);
  });
});

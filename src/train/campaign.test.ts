import { describe, it, expect } from "vitest";
import {
  STAGES,
  isStageUnlocked,
  recordStage,
  campaignStats,
  type CampaignProgress,
} from "./campaign";

const empty = (): CampaignProgress => ({ cleared: [], best: {} });

describe("Missão 1×1 — campanha", () => {
  it("tem 9 estágios, começa no BTN e cresce em rodadas", () => {
    expect(STAGES).toHaveLength(9);
    expect(STAGES[0].heroPosition).toBe("BTN");
    expect(STAGES[0].rounds).toBeLessThan(STAGES[8].rounds);
  });

  it("o último estágio (UTG) é abertura pura (sem vilão antes)", () => {
    const utg = STAGES[STAGES.length - 1];
    expect(utg.heroPosition).toBe("UTG");
    expect(utg.villainPool).toHaveLength(0);
  });

  it("BTN enfrenta quem abriu antes (UTG..CO)", () => {
    expect(STAGES[0].villainPool).toEqual(["UTG", "UTG1", "MP", "LJ", "HJ", "CO"]);
  });

  it("só o 1º estágio começa liberado; o próximo abre ao concluir o anterior", () => {
    let p = empty();
    expect(isStageUnlocked(p, 0)).toBe(true);
    expect(isStageUnlocked(p, 1)).toBe(false);
    p = recordStage(p, STAGES[0].id, STAGES[0].rounds).progress; // gabaritou
    expect(isStageUnlocked(p, 1)).toBe(true);
  });

  it("passa com o critério (não precisa de tudo), mas reprova abaixo dele", () => {
    const s = STAGES[0];
    expect(recordStage(empty(), s.id, s.passNeeded).passed).toBe(true);
    expect(recordStage(empty(), s.id, s.passNeeded - 1).passed).toBe(false);
  });

  it("reprovar não libera o próximo, mas guarda o melhor resultado", () => {
    const s = STAGES[0];
    const r = recordStage(empty(), s.id, s.passNeeded - 1);
    expect(r.progress.cleared).toHaveLength(0);
    expect(r.progress.best[s.id]).toBe(s.passNeeded - 1);
  });

  it("conta o progresso da campanha", () => {
    let p = empty();
    p = recordStage(p, STAGES[0].id, STAGES[0].rounds).progress;
    expect(campaignStats(p)).toEqual({ done: 1, total: 9 });
  });
});

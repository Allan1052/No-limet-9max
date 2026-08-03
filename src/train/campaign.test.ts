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
  it("tem 9 estágios ordenados por dificuldade real de poker", () => {
    expect(STAGES).toHaveLength(9);
    // Ordem: BTN → CO → HJ → LJ → MP → BB → SB → UTG1 → UTG
    expect(STAGES[0].heroPosition).toBe("BTN");
    expect(STAGES[1].heroPosition).toBe("CO");
    expect(STAGES[2].heroPosition).toBe("HJ");
    expect(STAGES[3].heroPosition).toBe("LJ");
    expect(STAGES[4].heroPosition).toBe("MP");
    expect(STAGES[5].heroPosition).toBe("BB");
    expect(STAGES[6].heroPosition).toBe("SB");
    expect(STAGES[7].heroPosition).toBe("UTG1");
    expect(STAGES[8].heroPosition).toBe("UTG");
  });

  it("os primeiros estágios têm menos rodadas que os finais", () => {
    expect(STAGES[0].rounds).toBeLessThan(STAGES[8].rounds);
  });

  it("o critério é 1 erro máximo (rounds - 1 acertos necessários)", () => {
    const s6 = STAGES.find((s) => s.rounds === 6);
    if (s6) {
      expect(s6.passNeeded).toBe(5); // 6 - 1 = 5
    }
    const s8 = STAGES.find((s) => s.rounds === 8);
    if (s8) {
      expect(s8.passNeeded).toBe(7); // 8 - 1 = 7
    }
    const s10 = STAGES.find((s) => s.rounds === 10);
    if (s10) {
      expect(s10.passNeeded).toBe(9); // 10 - 1 = 9
    }
  });

  it("BTN enfrenta quem abriu antes (UTG..CO)", () => {
    expect(STAGES[0].villainPool).toEqual(["UTG", "UTG1", "MP", "LJ", "HJ", "CO"]);
  });

  it("só o 1º estágio começa liberado; o próximo abre ao concluir o anterior", () => {
    let p = empty();
    expect(isStageUnlocked(p, 0)).toBe(true);
    expect(isStageUnlocked(p, 1)).toBe(false);
    p = recordStage(p, STAGES[0].id, STAGES[0].rounds).progress;
    expect(isStageUnlocked(p, 1)).toBe(true);
  });

  it("passa com o critério (1 erro permitido), mas reprova com 2 erros", () => {
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

  it("SB é o 7º estágio (difícil) com 10 rodadas", () => {
    const sb = STAGES.find((s) => s.heroPosition === "SB");
    expect(sb).toBeDefined();
    expect(STAGES.indexOf(sb!)).toBe(6); // índice 6 = 7º estágio
    expect(sb!.rounds).toBe(10);
    expect(sb!.passNeeded).toBe(9);
  });

  it("BB vem antes de SB na ordem de dificuldade", () => {
    const bbIdx = STAGES.findIndex((s) => s.heroPosition === "BB");
    const sbIdx = STAGES.findIndex((s) => s.heroPosition === "SB");
    expect(bbIdx).toBeLessThan(sbIdx);
  });
});

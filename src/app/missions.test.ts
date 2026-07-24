import { describe, it, expect } from "vitest";
import { applyEvent, emptyMissionState, missionCounts, MISSIONS } from "./missions";

describe("missões e desafios", () => {
  it("missão de volume avança com mãos jogadas e completa no alvo", () => {
    const s = emptyMissionState();
    const warmup = MISSIONS.find((m) => m.id === "warmup")!;
    let completed = false;
    for (let i = 0; i < warmup.goal; i++) {
      const r = applyEvent(s, { type: "hand" });
      if (r.completed.some((m) => m.id === "warmup")) completed = true;
    }
    expect(s.warmup.done).toBe(true);
    expect(completed).toBe(true);
  });

  it("bons folds contam só quando é fold bem avaliado", () => {
    const s = emptyMissionState();
    applyEvent(s, { type: "decision", rating: "boa", heroType: "fold" });
    applyEvent(s, { type: "decision", rating: "ruim", heroType: "fold" }); // fold ruim não conta
    applyEvent(s, { type: "decision", rating: "boa", heroType: "call" }); // não é fold
    expect(s.foldprofit.progress).toBe(1);
  });

  it("sequência (nervos de aço) zera com um erro grave", () => {
    const s = emptyMissionState();
    for (let i = 0; i < 10; i++) applyEvent(s, { type: "decision", rating: "ok", heroType: "call" });
    expect(s.steelnerves.progress).toBe(10);
    applyEvent(s, { type: "decision", rating: "ruim", heroType: "call" });
    expect(s.steelnerves.progress).toBe(0);
  });

  it("missão de torneio completa ao vencer", () => {
    const s = emptyMissionState();
    const r = applyEvent(s, { type: "tournamentEnd", result: "campeao", inMoney: true });
    expect(s.champion.done).toBe(true);
    expect(r.completed.some((m) => m.id === "champion")).toBe(true);
    // ITM também avançou (venceu = estava no dinheiro).
    expect(s.inthemoney.progress).toBe(1);
  });

  it("contagem de concluídas reflete o estado", () => {
    const s = emptyMissionState();
    expect(missionCounts(s).total).toBe(MISSIONS.length);
    expect(missionCounts(s).done).toBe(0);
    applyEvent(s, { type: "tournamentEnd", result: "campeao", inMoney: true });
    expect(missionCounts(s).done).toBe(1);
  });
});

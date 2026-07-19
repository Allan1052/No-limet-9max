import { describe, it, expect } from "vitest";
import { estimateVillainRangePct } from "./villainRange";
import type { TableState } from "../game/state";

/** Mesa mínima só com os campos que o estimador lê. */
function fakeTable(boardLen: number, currentBet = 0, committed = 0, preflopAgg = 0): TableState {
  return {
    preflopAggressor: preflopAgg,
    board: new Array(boardLen).fill(0),
    currentBet,
    players: [{ committed }],
  } as unknown as TableState;
}

describe("estimativa de range do vilão", () => {
  it("estreita rua a rua (flop > turn > river)", () => {
    const flop = estimateVillainRangePct(fakeTable(3), 0);
    const turn = estimateVillainRangePct(fakeTable(4), 0);
    const river = estimateVillainRangePct(fakeTable(5), 0);
    expect(flop).toBeGreaterThan(turn);
    expect(turn).toBeGreaterThan(river);
  });

  it("aperta mais quando há uma aposta na nossa frente", () => {
    const semAposta = estimateVillainRangePct(fakeTable(3, 0, 0), 0);
    const comAposta = estimateVillainRangePct(fakeTable(3, 100, 0), 0);
    expect(comAposta).toBeLessThan(semAposta);
  });

  it("pote limpado (sem aumento pré-flop) começa mais largo que pote aumentado", () => {
    const aumentado = estimateVillainRangePct(fakeTable(3, 0, 0, 0), 0);
    const limpado = estimateVillainRangePct(fakeTable(3, 0, 0, -1), 0);
    expect(limpado).toBeGreaterThan(aumentado);
  });
});

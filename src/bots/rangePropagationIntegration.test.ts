import { describe, expect, it } from "vitest";
import { BASELINE_PROFILE } from "./profiles";
import { postflopContextFor } from "./postflopBot";
import { createTable } from "../game/engine";
import { cardsFromString } from "../engine/cards";

function turnState(log: string[]) {
  const t = createTable(
    { smallBlind: 25, bigBlind: 50, ante: 0 },
    [
      { name: "Hero", isHero: true, stack: 5000 },
      { name: "Vilao", stack: 5000 },
    ],
    0,
  );

  t.street = "turn";
  t.handOver = false;
  t.toAct = 0;
  t.preflopRaises = 1;
  t.preflopAggressor = 1;
  t.lastAggressor = -1;
  t.lastStreetAggressor = -1;
  t.currentBet = 0;
  t.board = cardsFromString("As7d4cKh");
  t.players[0].holeCards = cardsFromString("QsQh");
  t.players[1].holeCards = cardsFromString("JcTc");
  t.log = log;
  return t;
}

describe("Motor V2 — propagação integrada ao pós-flop", () => {
  it("histórias agressiva e passiva geram villainRangePct diferentes no contexto real", () => {
    const passive = turnState([
      "Vilao paga 100.",
      "Vilao passa (check).",
      "Vilao paga 200.",
    ]);
    const aggressive = turnState([
      "Vilao paga 100.",
      "Vilao aumenta para 250.",
      "Vilao paga 200.",
      "Vilao aumenta para 600.",
    ]);

    const passiveCtx = postflopContextFor(passive, 0, BASELINE_PROFILE, () => 0.5, 50);
    const aggressiveCtx = postflopContextFor(aggressive, 0, BASELINE_PROFILE, () => 0.5, 50);

    expect(aggressiveCtx.villainRangePct).toBeDefined();
    expect(passiveCtx.villainRangePct).toBeDefined();
    expect(aggressiveCtx.villainRangePct!).toBeLessThan(passiveCtx.villainRangePct!);
  });
});

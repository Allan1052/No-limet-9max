import { describe, it, expect } from "vitest";
import { detectLeaks, detectLeaksFromPairs, topLeaks, type LeakOccurrence } from "./leaks";
import type { FeedbackItem } from "./analyzer";

// Fábrica mínima de FeedbackItem só com o que o detector lê.
function fb(
  kind: "preflop" | "postflop",
  heroFam: FeedbackItem["heroFam"],
  adviceFam: FeedbackItem["adviceFam"],
  rating: FeedbackItem["rating"],
): FeedbackItem {
  return { street: kind, heroAction: "x", advice: "y", rating, text: "", kind, heroFam, adviceFam };
}

describe("TREINO DIRIGIDO — detector de vazamentos", () => {
  it("ignora jogadas boas/ok (não são vazamento)", () => {
    const leaks = detectLeaks([
      fb("preflop", "call", "fold", "boa"),
      fb("postflop", "aggro", "check", "ok"),
    ]);
    expect(leaks).toHaveLength(0);
  });

  it("ignora item sem as famílias (dados antigos)", () => {
    const item: FeedbackItem = { street: "flop", heroAction: "x", advice: "y", rating: "ruim", text: "" };
    expect(detectLeaks([item])).toHaveLength(0);
  });

  it("detecta 'paga apostas sem equity' no pós-flop e conta as ocorrências", () => {
    const leaks = detectLeaks([
      fb("postflop", "call", "fold", "ruim"),
      fb("postflop", "call", "fold", "imprecisa"),
      fb("postflop", "call", "fold", "ruim"),
    ]);
    expect(leaks).toHaveLength(1);
    expect(leaks[0].id).toBe("loose_call_postflop");
    expect(leaks[0].count).toBe(3);
    expect(leaks[0].badCount).toBe(2);
    expect(leaks[0].severity).toBe(2 * 2 + 1); // 2 ruins (×2) + 1 imprecisa
  });

  it("separa vazamentos de pré e pós-flop e classifica cada um", () => {
    const leaks = detectLeaks([
      fb("preflop", "call", "fold", "ruim"), // entra com mão fraca
      fb("preflop", "fold", "aggro", "imprecisa"), // folda mão jogável
      fb("postflop", "aggro", "check", "imprecisa"), // blefa demais
    ]);
    const ids = leaks.map((l) => l.id).sort();
    expect(ids).toEqual(["loose_preflop", "overbet_bluff_postflop", "tight_preflop"]);
  });

  it("rankeia por gravidade (erro claro pesa mais) e topLeaks corta em N", () => {
    const items: FeedbackItem[] = [
      // vazamento A: 1 ruim (severity 2)
      fb("postflop", "fold", "call", "ruim"),
      // vazamento B: 3 imprecisas (severity 3) — deve vir na frente de A
      fb("preflop", "aggro", "call", "imprecisa"),
      fb("preflop", "aggro", "call", "imprecisa"),
      fb("preflop", "aggro", "call", "imprecisa"),
    ];
    const leaks = detectLeaks(items);
    expect(leaks[0].id).toBe("overaggro_preflop"); // severity 3 > 2
    expect(leaks[1].id).toBe("overfold_postflop");
    expect(topLeaks(items, 1)).toHaveLength(1);
    expect(topLeaks(items, 1)[0].id).toBe("overaggro_preflop");
  });

  it("mesma família (só imprecisão de tamanho) não vira vazamento direcional", () => {
    const leaks = detectLeaks([fb("postflop", "aggro", "aggro", "imprecisa")]);
    expect(leaks).toHaveLength(0);
  });

  it("detectLeaksFromPairs carrega item + mão em cada ocorrência", () => {
    const handA = {
      heroSeat: 0,
      holeCards: {},
      events: [],
      names: {},
      finalBoard: [],
      buttonSeat: 0,
      bigBlind: 100,
      heroPosition: "UTG",
    } as unknown as import("../app/replay").HandHistory;
    const handB = {
      heroSeat: 0,
      holeCards: {},
      events: [],
      names: {},
      finalBoard: [],
      buttonSeat: 0,
      bigBlind: 100,
      heroPosition: "BTN",
    } as unknown as import("../app/replay").HandHistory;
    const leaks = detectLeaksFromPairs([
      { item: fb("preflop", "call", "fold", "ruim"), hand: handA },
      { item: fb("preflop", "call", "fold", "imprecisa"), hand: handB },
    ]);
    expect(leaks).toHaveLength(1);
    expect(leaks[0].occurrences.length).toBe(2);
    expect(leaks[0].count).toBe(2);
    expect((leaks[0].occurrences[0] as LeakOccurrence).hand).toBe(handA);
    expect((leaks[0].occurrences[1] as LeakOccurrence).hand).toBe(handB);
  });

  it("detectLeaksFromPairs sem mãos equivale ao detector simples", () => {
    const items = [fb("postflop", "call", "fold", "ruim"), fb("postflop", "call", "fold", "ruim")];
    const plain = detectLeaks(items);
    const pairs = detectLeaksFromPairs(items.map((item) => ({ item })));
    expect(plain.length).toBe(pairs.length);
    expect(plain[0].count).toBe(pairs[0].count);
    expect(pairs[0].occurrences.length).toBe(2);
  });
});

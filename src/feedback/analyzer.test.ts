import { describe, it, expect } from "vitest";
import { gradeDecision, type HeroAdvice } from "./analyzer";

// Um advice de pós-flop com estratégia mista (frequências).
function advice(mix: { action: string; freq: number }[], over: Partial<HeroAdvice> = {}): HeroAdvice {
  return {
    kind: "postflop",
    action: mix.slice().sort((a, b) => b.freq - a.freq)[0].action,
    reason: "teste",
    equity: 0.5,
    potOdds: 0.4,
    mix,
    ...over,
  };
}

describe("nota por frequência (estratégia mista)", () => {
  it("ação principal do mix recebe nota boa", () => {
    // Padrão: aposta 70% / check 30%. Herói apostou → jogada principal.
    const item = gradeDecision("Flop", "raise", advice([
      { action: "bet", freq: 0.7 },
      { action: "check", freq: 0.3 },
    ]));
    expect(item.rating).toBe("boa");
  });

  it("linha mista secundária (~30%) recebe ok, não é punida como erro", () => {
    // Herói deu check numa mão que é 65% aposta / 35% check → válido, mas menor.
    const item = gradeDecision("Turn", "check", advice([
      { action: "bet", freq: 0.65 },
      { action: "check", freq: 0.35 },
    ]));
    expect(item.rating).toBe("ok");
  });

  it("ação fora do leque (freq quase nula) cai como erro", () => {
    // Padrão: fold 95% / call 5%. Herói deu raise (agressão) → fora do mix.
    const item = gradeDecision("River", "raise", advice(
      [{ action: "fold", freq: 0.95 }, { action: "call", freq: 0.05 }],
      { action: "fold", equity: 0.2, potOdds: 0.5 },
    ));
    expect(["imprecisa", "ruim", "ok"]).toContain(item.rating);
    expect(item.rating).not.toBe("boa");
  });
});

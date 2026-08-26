import { describe, it, expect } from "vitest";
import { gradeDecision, type HeroAdvice } from "./analyzer";

// Bug do Allan (imagem 1): a nota de EV cru (pot odds) contradizia a nota do
// motor. Um fold julgado BOA vinha com "pagar valia +3.2bb — o fold foi um erro
// de EV"; um raise IMPRECISO vinha com "ação agressiva lucrativa". O motor
// avalia contra a equity EXIGIDA (realização/implied/ICM), mais rígida que o
// preço cru — então a nota de EV cru só aparece quando CONCORDA com o veredito.
function adv(action: string, evBB: number, mix: { action: string; freq: number }[]): HeroAdvice {
  return {
    kind: "postflop",
    action,
    reason: "Equity 35% não paga o preço de 38%: fold.",
    equity: 0.35,
    potOdds: 0.38,
    mix,
    evBB,
    effectiveBB: 20,
    potBB: 6,
  };
}

describe("nota de EV — nunca contradiz o veredito do motor", () => {
  it("fold CERTO com EV-cru positivo NÃO exibe 'pagar valia / erro de EV'", () => {
    const item = gradeDecision("Turn", "technical", "fold", adv("fold", 3.2, [{ action: "fold", freq: 1 }]));
    expect(item.rating).toBe("boa");
    expect(item.text).not.toMatch(/erro de EV|pagar valia|deixou fichas/);
  });

  it("raise que DESVIOU do fold NÃO exibe 'ação agressiva lucrativa'", () => {
    const item = gradeDecision("Flop", "technical", "raise", adv("fold", 1.9, [{ action: "fold", freq: 0.7 }, { action: "call", freq: 0.3 }]));
    expect(item.rating).not.toBe("boa");
    expect(item.text).not.toMatch(/agressiva lucrativa|EV de continuar: \+/);
  });

  it("fold ERRADO (motor manda pagar) AINDA quantifica a perda de EV", () => {
    const item = gradeDecision("River", "technical", "fold", adv("call", 2.0, [{ action: "call", freq: 1 }]));
    expect(item.text).toMatch(/erro de EV|pagar valia/);
  });

  it("call lucrativo alinhado AINDA mostra o ganho de EV", () => {
    const item = gradeDecision("Turn", "technical", "call", adv("call", 1.5, [{ action: "call", freq: 1 }]));
    expect(item.text).toMatch(/call lucrativo|\+1\.5bb/);
  });

  it("modo 'free' (Simples) nunca mostra nota de EV", () => {
    const item = gradeDecision("Turn", "free", "fold", adv("call", 2.0, [{ action: "call", freq: 1 }]));
    expect(item.text).not.toMatch(/EV|bb/);
  });
});

import { describe, it, expect } from "vitest";
import { gradeDecision, plainReason, type HeroAdvice } from "./analyzer";

describe("plainReason — limpa jargão técnico no modo Simples", () => {
  it("tira equity/preço mas mantém a frase", () => {
    const out = plainReason("87s: folda: equity 33% < preço 42% e não domina o range de all-in.");
    expect(out).not.toMatch(/equity|preço|%|</);
    expect(out).toMatch(/folda/);
    expect(out).toMatch(/não domina o range de all-in/);
  });
  it("remove parênteses técnicos, preserva a frase", () => {
    const out = plainReason("KQo: folda: fora de posição e sem valor de all-in (equity 33% vs range premium).");
    expect(out).not.toMatch(/equity|%/);
    expect(out).toMatch(/fora de posição e sem valor de all-in/);
  });
  it("preserva sizing em bb (não é jargão)", () => {
    const out = plainReason("AJs: abre isolando 3 limpers — raise maior (5.0bb) para cobrar quem quer flop barato.");
    expect(out).toMatch(/5\.0bb/);
    expect(out).toMatch(/isolando 3 limpers/);
  });
  it("não mexe em reason já limpo", () => {
    const r = "97s está fora da range de abertura de UTG.";
    expect(plainReason(r)).toBe(r);
  });
  it("no modo Simples a dica de acerto não vaza equity/preço", () => {
    const item = gradeDecision("Pré-flop", "free", "fold", {
      kind: "preflop", action: "fold",
      reason: "KQo: folda: fora de posição e sem valor de all-in (equity 33% vs range premium).",
      heroPosition: "CO",
    });
    expect(item.text).not.toMatch(/equity|%/);
  });
  it("no modo Técnico a dica mantém os números", () => {
    const item = gradeDecision("Pré-flop", "technical", "fold", {
      kind: "preflop", action: "fold",
      reason: "KQo: folda: sem valor de all-in (equity 33% vs range premium).",
      heroPosition: "CO",
    });
    expect(item.text).toMatch(/33%|equity/);
  });
});

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

describe("all-in fundo quando o certo era raise (overbet)", () => {
  const openMix = [{ action: "raise", freq: 1 }];
  it("all-in com 84bb (deep) e conselho de raise → ruim (não 'boa')", () => {
    const item = gradeDecision("Pré-flop", "free", "allin", {
      kind: "preflop", action: "raise", reason: "abrir", mix: openMix, effectiveBB: 84,
    });
    expect(item.rating).toBe("ruim");
  });
  it("all-in com 35bb e conselho de raise → imprecisa", () => {
    const item = gradeDecision("Pré-flop", "free", "allin", {
      kind: "preflop", action: "raise", reason: "abrir", mix: openMix, effectiveBB: 35,
    });
    expect(item.rating).toBe("imprecisa");
  });
  it("all-in com stack curto (12bb) e conselho de JAM → boa (push/fold ok)", () => {
    const item = gradeDecision("Pré-flop", "free", "allin", {
      kind: "preflop", action: "jam", reason: "shove", mix: [{ action: "jam", freq: 1 }], effectiveBB: 12,
    });
    expect(item.rating).toBe("boa");
  });
  it("pós-flop: shove de valor com stack efetivo CURTO vs pote NÃO é overbet (bug Allan)", () => {
    // KK top two pair, 69% equity, all-in de ~9.8bb efetivos num pote de ~63bb:
    // não sobra stack fundo → o shove É o tamanho normal. Antes: 'imprecisa'.
    const item = gradeDecision("River", "free", "allin", {
      kind: "postflop", action: "bet", reason: "valor",
      mix: [{ action: "bet", freq: 0.85 }, { action: "check", freq: 0.15 }],
      equity: 0.69, effectiveBB: 9.8, potBB: 63,
    });
    expect(item.rating).toBe("boa");
  });
  it("pós-flop: all-in FUNDO (SPR alto) quando cabia bet normal ainda é punido", () => {
    // Stack efetivo 90bb num pote de 20bb: shove = overbet gigante → imprecisa/ruim.
    const item = gradeDecision("Flop", "free", "allin", {
      kind: "postflop", action: "bet", reason: "valor",
      mix: [{ action: "bet", freq: 0.8 }, { action: "check", freq: 0.2 }],
      equity: 0.7, effectiveBB: 90, potBB: 20,
    });
    expect(item.rating).not.toBe("boa");
  });
});

describe("nota por frequência (estratégia mista)", () => {
  it("ação principal do mix recebe nota boa", () => {
    // Padrão: aposta 70% / check 30%. Herói apostou → jogada principal.
    const item = gradeDecision("Flop", 'free', "raise", advice([
      { action: "bet", freq: 0.7 },
      { action: "check", freq: 0.3 },
    ]));
    expect(item.rating).toBe("boa");
  });

  it("linha mista secundária (~30%) recebe ok, não é punida como erro", () => {
    // Herói deu check numa mão que é 65% aposta / 35% check → válido, mas menor.
    const item = gradeDecision("Turn", 'free', "check", advice([
      { action: "bet", freq: 0.65 },
      { action: "check", freq: 0.35 },
    ]));
    expect(item.rating).toBe("ok");
  });

  it("ação fora do leque (freq quase nula) cai como erro", () => {
    // Padrão: fold 95% / call 5%. Herói deu raise (agressão) → fora do mix.
    const item = gradeDecision("River", 'free', "raise", advice(
      [{ action: "fold", freq: 0.95 }, { action: "call", freq: 0.05 }],
      { action: "fold", equity: 0.2, potOdds: 0.5 },
    ));
    expect(["imprecisa", "ruim", "ok"]).toContain(item.rating);
    expect(item.rating).not.toBe("boa");
  });
});

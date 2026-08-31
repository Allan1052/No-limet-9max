import { describe, expect, it } from "vitest";
import { postflopRequiredEquity, type RequiredEquityParams } from "./postflopMath";

// Achado 6.1 da auditoria: quando o vilão aposta, a range dele JÁ é estreitada
// (e a equity do herói já cai por isso). Somar por cima o colchão fixo cheio
// contava a agressão duas vezes → overfold de bluff-catcher. Agora o colchão
// redundante encolhe conforme a range já está estreita — sem mexer nas
// penalidades legítimas (rua, multiway, disciplina).
function base(over: Partial<RequiredEquityParams> = {}): RequiredEquityParams {
  return { potBB: 6, toCall: 3, streetIdx: 1, stickiness: 0.5, numOpp: 1, ...over };
}

describe("Pós-flop — sem dupla penalização do range do vilão", () => {
  it("range largo (ou ausente) mantém o colchão cheio — comportamento anterior", () => {
    const semInfo = postflopRequiredEquity(base());
    const largo = postflopRequiredEquity(base({ villainRangePct: 0.5 }));
    expect(largo).toBeCloseTo(semInfo, 6);
  });

  it("range JÁ estreito pela agressão exige MENOS equity (não conta a força duas vezes)", () => {
    const largo = postflopRequiredEquity(base({ villainRangePct: 0.5 }));
    const estreito = postflopRequiredEquity(base({ villainRangePct: 0.15 }));
    expect(estreito).toBeLessThan(largo);
  });

  it("a redução é limitada (nunca vira call-station): no máximo ~0.055", () => {
    const largo = postflopRequiredEquity(base({ villainRangePct: 0.6 }));
    const superEstreito = postflopRequiredEquity(base({ villainRangePct: 0.05 }));
    expect(largo - superEstreito).toBeLessThanOrEqual(0.056);
    expect(largo - superEstreito).toBeGreaterThan(0);
  });

  it("no river continua sendo o preço puro (sem colchão nenhum)", () => {
    const r = postflopRequiredEquity(base({ streetIdx: 2, villainRangePct: 0.15 }));
    expect(r).toBeCloseTo(3 / 9, 6); // toCall/(pot+toCall)
  });
});

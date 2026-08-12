import { describe, it, expect } from "vitest";
import { vsReraiseDecision, reraiserRangePct } from "./vsReraise";
import { cardsFromString, seededRng } from "../engine/cards";

// Motor Monte Carlo → cada teste usa rng semeado p/ resultado estável.
// Cenário base: herói abriu ~2.3bb, vilão deu 3-bet ~8bb. Pote antes do call ≈
// 2.3 (open) + 8 (3bet) + 1.5 (blinds) ≈ 11.8bb; call ≈ 8 − 2.3 = 5.7bb.
const POT = 11.8;
const CALL = 5.7;
const base = { betLevelFaced: 2, potBB: POT, callBB: CALL, iterations: 6000 };

describe("PILAR 1 (parte 2) — enfrentar re-agressão NÃO all-in por equity", () => {
  it("range do re-agressor abre conforme o nível (3-bet mais largo que 4-bet)", () => {
    expect(reraiserRangePct(2)).toBeGreaterThan(reraiserRangePct(3));
  });

  it("QQ RE-AGRIDE por valor (domina o range de all-in)", () => {
    const d = vsReraiseDecision({ hero: cardsFromString("QsQc"), ...base, inPosition: true, rng: seededRng(7) });
    expect(d.action).toBe("reraise");
    expect(d.eqGetItIn).toBeGreaterThanOrEqual(0.42);
  });

  it("AK RE-AGRIDE (valor + fold equity), mesmo fora de posição", () => {
    const d = vsReraiseDecision({ hero: cardsFromString("AsKs"), ...base, inPosition: false, rng: seededRng(7) });
    expect(d.action).toBe("reraise");
  });

  it("TT RE-AGRIDE por valor (borda: por equity, TT ≈ AK vs range premium)", () => {
    const d = vsReraiseDecision({ hero: cardsFromString("TsTc"), ...base, inPosition: true, rng: seededRng(7) });
    expect(d.action).toBe("reraise");
  });

  it("AQs PAGA em posição (preço bom), mas NÃO re-agride por valor", () => {
    const d = vsReraiseDecision({ hero: cardsFromString("AsQs"), ...base, inPosition: true, rng: seededRng(7) });
    expect(d.action).toBe("call");
    expect(d.eqGetItIn).toBeLessThan(0.42); // não aguenta o all-in premium
  });

  it("AQs FOLDA fora de posição (sem flat OOP, sem valor de all-in)", () => {
    const d = vsReraiseDecision({ hero: cardsFromString("AsQs"), ...base, inPosition: false, rng: seededRng(7) });
    expect(d.action).toBe("fold");
  });

  it("KJo FOLDA mesmo em posição (equity fraca pro preço)", () => {
    const d = vsReraiseDecision({ hero: cardsFromString("KhJc"), ...base, inPosition: true, rng: seededRng(7) });
    expect(d.action).toBe("fold");
  });

  it("A5s FOLDA pela conta (o blefe de bloqueador é decidido fora, misto)", () => {
    const d = vsReraiseDecision({ hero: cardsFromString("As5s"), ...base, inPosition: true, rng: seededRng(7) });
    expect(d.action).toBe("fold");
  });

  it("ICM perto do dinheiro APERTA o flat (AQs que pagava passa a foldar)", () => {
    const icmSpot = { stacks: [12, 12, 12, 3], payouts: [50, 30, 20], hero: 3, villain: 0, chips: 3 };
    const d = vsReraiseDecision({ hero: cardsFromString("AsQs"), ...base, inPosition: true, icmSpot, rng: seededRng(7) });
    expect(d.action).toBe("fold");
    expect(d.flatRequired).toBeGreaterThan(0.4);
  });

  it("a razão traz a CONTA (equity × preço), transparente", () => {
    const d = vsReraiseDecision({ hero: cardsFromString("AsQs"), ...base, inPosition: true, rng: seededRng(7) });
    expect(d.reason).toMatch(/equity \d+%/);
  });
});

import { describe, it, expect } from "vitest";
import { facingAllinDecision, shoverRangePct } from "./facingAllin";
import { cardsFromString, seededRng } from "../engine/cards";

// Motor Monte Carlo → cada teste usa rng semeado (seededRng) p/ resultado estável.

describe("PILAR 1 — enfrentar all-in por equity real (com side pot)", () => {
  it("range do vilão aperta conforme os re-raises (open-shove largo, 5-bet+ premium)", () => {
    expect(shoverRangePct(4, 40)).toBeLessThan(shoverRangePct(2, 40));
    expect(shoverRangePct(2, 40)).toBeLessThan(shoverRangePct(1, 10)); // 3-bet < open-shove curto
    expect(shoverRangePct(1, 10)).toBeGreaterThan(shoverRangePct(1, 40)); // curto shoveia mais largo
  });

  // O SPOT DO PRINT: 99 numa guerra de 5-bet+ contra 3 vilões premium, sendo o
  // short stack. Pela conta ingênua pareceria call; com SIDE POT é fold.
  it("99 FOLDA a guerra (equity ~15% < preço ~25% com side pot, 3 oponentes)", () => {
    const d = facingAllinDecision({
      hero: cardsFromString("9d9h"),
      betLevelFaced: 5,
      numContesting: 3,
      contestablePotBB: 92, // short (30.5) disputa ~30.5×4 − seu próprio call
      callBB: 30.5,
      effectiveBB: 30,
      iterations: 8000,
      rng: seededRng(7),
    });
    expect(d.action).toBe("fold");
    expect(d.heroEquity).toBeLessThan(d.requiredEquity);
  });

  it("AA PAGA a guerra (equity domina qualquer preço)", () => {
    const d = facingAllinDecision({
      hero: cardsFromString("AsAc"),
      betLevelFaced: 5, numContesting: 3, contestablePotBB: 92, callBB: 30.5, effectiveBB: 30,
      iterations: 8000, rng: seededRng(7),
    });
    expect(d.action).toBe("call");
  });

  it("AK PAGA um shove curto simples (65% vs preço ~44%)", () => {
    const d = facingAllinDecision({
      hero: cardsFromString("AsKd"),
      betLevelFaced: 1, numContesting: 1, contestablePotBB: 15, callBB: 12, effectiveBB: 12,
      iterations: 8000, rng: seededRng(7),
    });
    expect(d.action).toBe("call");
  });

  it("72o FOLDA um shove curto (equity fraca demais pro preço)", () => {
    const d = facingAllinDecision({
      hero: cardsFromString("7h2c"),
      betLevelFaced: 1, numContesting: 1, contestablePotBB: 15, callBB: 12, effectiveBB: 12,
      iterations: 8000, rng: seededRng(7),
    });
    expect(d.action).toBe("fold");
  });

  it("a razão traz a CONTA (equity × preço), transparente", () => {
    const d = facingAllinDecision({
      hero: cardsFromString("9d9h"), betLevelFaced: 5, numContesting: 3,
      contestablePotBB: 92, callBB: 30.5, iterations: 4000, rng: seededRng(7),
    });
    expect(d.reason).toMatch(/equity \d+% . preço \d+%/);
  });
});

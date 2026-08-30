import { describe, expect, it } from "vitest";
import { postflopRequiredEquity } from "./postflopMath";

describe("Motor V2 — equity requerida pós-flop", () => {
  it("river heads-up neutro sem ICM usa pot odds cruas", () => {
    // Pote 75, vilão aposta 25: Hero paga 25 para disputar 125 => 20%.
    const required = postflopRequiredEquity({
      potBB: 100,
      toCall: 25,
      streetIdx: 2,
      stickiness: 0.5,
      numOpp: 1,
    });
    expect(required).toBeCloseTo(0.2, 10);
  });

  it("river neutro aceita 26% quando o preço é 25%", () => {
    const required = postflopRequiredEquity({
      potBB: 75,
      toCall: 25,
      streetIdx: 2,
      stickiness: 0.5,
      numOpp: 1,
    });
    expect(required).toBeCloseTo(0.25, 10);
    expect(0.26).toBeGreaterThan(required);
  });

  it("river neutro rejeita 24% quando o preço é 25%", () => {
    const required = postflopRequiredEquity({
      potBB: 75,
      toCall: 25,
      streetIdx: 2,
      stickiness: 0.5,
      numOpp: 1,
    });
    expect(0.24).toBeLessThan(required);
  });
});

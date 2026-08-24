import { describe, it, expect } from "vitest";
import { postflopRequiredEquity } from "./postflopMath";

describe("postflopRequiredEquity — fonte única do limiar de call", () => {
  it("exige MAIS que as pot odds cruas (disciplina + reverse implied)", () => {
    // Meio-pote no flop: preço cru = 2/(4+2) = 33%.
    const req = postflopRequiredEquity({ potBB: 4, toCall: 2, streetIdx: 0 });
    expect(req).toBeGreaterThan(0.33 + 0.1); // disciplina real, não ~4 pontos
    expect(req).toBeLessThan(0.6);
  });

  it("river exige mais equity que o flop no mesmo preço", () => {
    const flop = postflopRequiredEquity({ potBB: 6, toCall: 3, streetIdx: 0 });
    const river = postflopRequiredEquity({ potBB: 6, toCall: 3, streetIdx: 2 });
    expect(river).toBeGreaterThan(flop);
  });

  it("perfil grudento (station) exige menos; nit exige mais", () => {
    const base = { potBB: 6, toCall: 3, streetIdx: 0 };
    const station = postflopRequiredEquity({ ...base, stickiness: 0.85 });
    const neutral = postflopRequiredEquity({ ...base, stickiness: 0.5 });
    const nit = postflopRequiredEquity({ ...base, stickiness: 0.15 });
    expect(station).toBeLessThan(neutral);
    expect(nit).toBeGreaterThan(neutral);
  });

  it("multiway sobe a barra (alguém pode ter mão)", () => {
    const heads = postflopRequiredEquity({ potBB: 6, toCall: 3, streetIdx: 0, numOpp: 1 });
    const multi = postflopRequiredEquity({ potBB: 6, toCall: 3, streetIdx: 0, numOpp: 3 });
    expect(multi).toBeGreaterThan(heads);
  });

  it("projeto forte com stack fundo ganha desconto de implied odds", () => {
    const base = { potBB: 6, toCall: 3, streetIdx: 0 };
    const semProjeto = postflopRequiredEquity(base);
    const comProjeto = postflopRequiredEquity({ ...base, drawStrength: 0.7, heroStackBehind: 40 });
    expect(comProjeto).toBeLessThan(semProjeto);
  });

  it("all-in usa o preço cru (ICM é somado à parte por quem chama)", () => {
    const req = postflopRequiredEquity({ potBB: 4, toCall: 2, streetIdx: 1, isAllIn: true });
    expect(req).toBeCloseTo(2 / 6, 5);
  });

  it("coach (stickiness neutra) e mesa (perfil neutro) batem no mesmo número", () => {
    const spot = { potBB: 8, toCall: 4, streetIdx: 1 };
    const coach = postflopRequiredEquity(spot); // sem stickiness → 0.5
    const mesa = postflopRequiredEquity({ ...spot, stickiness: 0.5, numOpp: 1 });
    expect(coach).toBeCloseTo(mesa, 6);
  });
});

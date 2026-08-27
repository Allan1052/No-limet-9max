import { describe, it, expect } from "vitest";
import { analyzeHand, parseHand, buildFinalTableIcm } from "./stage";
import { requiredEquityToCall } from "../ranges/icm";

// Pedido do Allan: na mesa final, a distribuição REAL dos stacks muda o call.
// Ser 3º de 6 COM CURTOS ATRÁS aperta (você ladrilha o prêmio quando eles
// quebram); ser o próprio curto afrouxa (é obrigado a gambar).
describe("mesa final — ICM do spot real", () => {
  it("curtos atrás exigem MAIS equity que stacks parecidos", () => {
    const atras = buildFinalTableIcm({ players: 6, heroRank: 3, shape: "escalonado" }, 30);
    const iguais = buildFinalTableIcm({ players: 6, heroRank: 3, shape: "equilibrado" }, 30);
    expect(requiredEquityToCall(atras)).toBeGreaterThan(requiredEquityToCall(iguais));
  });

  it("ser o CURTO nunca exige MAIS que ser 3º com curtos atrás", () => {
    const meio = buildFinalTableIcm({ players: 6, heroRank: 3, shape: "escalonado" }, 20);
    const curto = buildFinalTableIcm({ players: 6, heroRank: 6, shape: "escalonado" }, 20);
    expect(requiredEquityToCall(curto)).toBeLessThanOrEqual(requiredEquityToCall(meio) + 0.001);
  });

  it("sem finalTable cai na mesa representativa e não quebra", () => {
    const a = analyzeHand({ heroPosition: "BB", villainPosition: "BTN", situation: "vsallin", stage: "mesa_final", stackBB: 15, hand: parseHand("As7s")! });
    expect(["call", "fold"]).toContain(a.recommended);
  });

  it("respeita limites: posição nunca passa do nº de jogadores", () => {
    const spot = buildFinalTableIcm({ players: 4, heroRank: 9, shape: "equilibrado" }, 25);
    expect(spot.stacks.length).toBe(4);
    expect(spot.hero).toBeLessThan(4);
    expect(spot.villain).not.toBe(spot.hero);
  });
});

import { describe, it, expect } from "vitest";
import { analyzeHand, parseHand } from "./stage";

// CASO DOURADO (bug do 66 pego pelo Allan, parecer da Manus): 66 no BB contra
// all-in de MP com 25bb é um spot de FRONTEIRA (equity ~ preço, quase 50/50).
// O app dizia "66 tem equity de sobra" — linguagem de certeza num spot marginal.
// Regra: quando |equity - preço| < ~3 pontos, nada de "de sobra/com folga".
describe("fronteira — sem linguagem de certeza em spot marginal", () => {
  it("66 BB vs all-in de MP, 25bb → é FRONTEIRA e o texto não promete folga", () => {
    const a = analyzeHand({ heroPosition: "BB", villainPosition: "MP", situation: "vsallin", stage: "inicio", stackBB: 25, hand: parseHand("6s6h")!, anteBB: 1 });
    expect(a.borderline).toBe(true);
    expect(a.simple).not.toMatch(/de sobra|com folga|com sobra|fácil|claramente/i);
    expect(a.simple).toMatch(/FRONTEIRA|apertad|quase 50/i);
  });

  it("mão premium clara (AA) NÃO é fronteira", () => {
    const a = analyzeHand({ heroPosition: "BB", villainPosition: "BTN", situation: "vsallin", stage: "inicio", stackBB: 15, hand: parseHand("AsAh")! });
    expect(a.borderline).toBe(false);
  });

  it("lixo claro (72o) vs shove apertado NÃO é fronteira (fold folgado)", () => {
    const a = analyzeHand({ heroPosition: "BB", villainPosition: "UTG", situation: "vsallin", stage: "inicio", stackBB: 20, hand: parseHand("7h2d")! });
    expect(a.borderline).toBe(false);
    expect(a.recommended).toBe("fold");
  });
});

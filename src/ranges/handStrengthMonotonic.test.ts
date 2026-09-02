import { describe, expect, it } from "vitest";
import { handRank } from "./handStrength";

// Guarda a correção de MONOTONICIDADE da tabela de força: dentro de cada grupo
// de força inequívoca (pares; e, por carta alta NÃO-Ás, kicker crescente), a
// mão mais forte nunca pode ranquear pior que a mais fraca. Antes, o ruído do
// Monte Carlo invertia kickers vizinhos (K3s abria mas K4s foldava etc.).
// Ases baixos ficam de fora de propósito (A5s/A4s… são wheel/bloqueador e
// jogam melhor que A6s-A9s — não-monotônicos por natureza).
const R = "23456789TJQKA".split(""); // fraco -> forte

describe("Tabela de força — monotonicidade dentro dos grupos", () => {
  it("pares: rank melhora (número menor) com o pip", () => {
    for (let i = 1; i < R.length; i++) {
      const weak = R[i - 1] + R[i - 1];
      const strong = R[i] + R[i];
      expect(handRank(strong), `${strong} deve ser >= ${weak}`).toBeLessThan(handRank(weak));
    }
  });

  it("kicker crescente (carta alta não-Ás): mais forte nunca ranqueia pior", () => {
    for (let hi = 0; hi < R.length; hi++) {
      if (R[hi] === "A") continue;
      for (const suit of ["s", "o"] as const) {
        for (let lo = 1; lo < hi; lo++) {
          const weak = R[hi] + R[lo - 1] + suit;
          const strong = R[hi] + R[lo] + suit;
          expect(handRank(strong), `${strong} não pode ranquear pior que ${weak}`).toBeLessThanOrEqual(handRank(weak));
        }
      }
    }
  });

  it("suited nunca ranqueia pior que a mesma mão offsuit", () => {
    for (let hi = 0; hi < R.length; hi++) {
      for (let lo = 0; lo < hi; lo++) {
        const s = R[hi] + R[lo] + "s";
        const o = R[hi] + R[lo] + "o";
        expect(handRank(s), `${s} deve ser >= ${o}`).toBeLessThanOrEqual(handRank(o));
      }
    }
  });
});

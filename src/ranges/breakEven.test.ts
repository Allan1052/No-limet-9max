// ---------------------------------------------------------------------------
// "O que mudaria minha decisão" — o ponto de virada do tamanho da aposta.
//
// A trava que importa: a resposta precisa ser COERENTE com o veredito do motor.
// Se a dica disser "com 2bb valeria pagar", então pagar 2bb tem mesmo que ser
// aprovado pela mesma régua que reprovou o valor real. É isso que estes testes
// verificam — não um número bonito, e sim a ausência de contradição.
// ---------------------------------------------------------------------------
import { describe, it, expect } from "vitest";
import { postflopRequiredEquity, breakEvenToCallBB } from "./postflopMath";

const base = { potBB: 10, streetIdx: 0 as const };

describe("ponto de virada do tamanho da aposta", () => {
  it("o valor devolvido é aprovado pela MESMA régua que reprovou o real", () => {
    const equity = 0.3;
    const real = 8; // aposta grande: reprovada
    expect(equity).toBeLessThan(postflopRequiredEquity({ ...base, toCall: real }));

    const virada = breakEvenToCallBB(equity, base);
    expect(virada).toBeDefined();
    // Pagar o valor da virada é aceito...
    expect(equity).toBeGreaterThanOrEqual(postflopRequiredEquity({ ...base, toCall: virada! }) - 1e-6);
    // ...e um pouco acima já não é. (É virada de verdade, não um chute.)
    expect(equity).toBeLessThan(postflopRequiredEquity({ ...base, toCall: virada! * 1.35 }));
  });

  it("virada menor que a aposta real quando o motor mandou foldar", () => {
    const virada = breakEvenToCallBB(0.3, base);
    expect(virada).toBeLessThan(8);
    expect(virada).toBeGreaterThan(0);
  });

  it("equity baixa demais: NÃO inventa um tamanho salvador", () => {
    expect(breakEvenToCallBB(0.05, base)).toBeUndefined();
  });

  it("equity altíssima: não existe ponto de virada plausível", () => {
    expect(breakEvenToCallBB(0.95, base)).toBeUndefined();
  });

  it("quanto maior a equity, maior a aposta que ainda dá para pagar", () => {
    const a = breakEvenToCallBB(0.35, base)!;
    const b = breakEvenToCallBB(0.55, base)!;
    expect(b).toBeGreaterThan(a);
  });

  it("no river a régua é o preço cru — e a virada acompanha", () => {
    const river = { potBB: 10, streetIdx: 2 as const };
    const v = breakEvenToCallBB(0.4, river)!;
    // preço cru: v/(10+v) ≈ 0.4  ->  v ≈ 6.67
    expect(v).toBeGreaterThan(6);
    expect(v).toBeLessThan(7.4);
  });
});

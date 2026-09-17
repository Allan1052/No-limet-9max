import { describe, expect, it } from "vitest";
import { lerMapaDaMesa, type AssentoDoMapa } from "./mapaDaMesa";

// O exemplo da página 6 do plano que o Allan trouxe.
const MESA: AssentoDoMapa[] = [
  { bb: 31, heroi: true },
  { bb: 12 },
  { bb: 46 },
  { bb: 18 },
  { bb: 7 },
  { bb: 23 },
  { bb: 16 },
];

describe("o mapa de stacks", () => {
  it("conta quem o herói cobre e quem cobre o herói", () => {
    const m = lerMapaDaMesa(MESA)!;
    expect(m.heroBB).toBe(31);
    expect(m.cobre).toBe(5);       // 12, 18, 7, 23, 16
    expect(m.cobertoPor).toBe(1);  // 46
  });

  it("acha o menor stack e conta os shorts críticos", () => {
    const m = lerMapaDaMesa(MESA)!;
    expect(m.menorBB).toBe(7);
    expect(m.shorts).toBe(1);      // só o de 7bb está em 10bb ou menos
  });

  it("empate não faz ninguém cobrir ninguém", () => {
    const m = lerMapaDaMesa([{ bb: 20, heroi: true }, { bb: 20 }])!;
    expect(m.cobre).toBe(0);
    expect(m.cobertoPor).toBe(0);
    expect(m.maiorDaMesa).toBe(false);
    expect(m.menorDaMesa).toBe(false);
  });

  it("sabe quando o herói é o maior e quando é o menor", () => {
    expect(lerMapaDaMesa([{ bb: 50, heroi: true }, { bb: 10 }, { bb: 20 }])!.maiorDaMesa).toBe(true);
    expect(lerMapaDaMesa([{ bb: 5, heroi: true }, { bb: 10 }, { bb: 20 }])!.menorDaMesa).toBe(true);
  });

  it("conta quantos ainda falam depois do herói", () => {
    const m = lerMapaDaMesa([
      { bb: 30, heroi: true }, { bb: 20, aindaFala: true },
      { bb: 15, aindaFala: true }, { bb: 40 },
    ])!;
    expect(m.aindaFalam).toBe(2);
  });

  it("sem herói, ou sozinho na mesa, não há mapa", () => {
    expect(lerMapaDaMesa([{ bb: 30 }, { bb: 20 }])).toBeUndefined();
    expect(lerMapaDaMesa([{ bb: 30, heroi: true }])).toBeUndefined();
    expect(lerMapaDaMesa([])).toBeUndefined();
  });

  it("stack zerado ou inválido não entra na conta", () => {
    const m = lerMapaDaMesa([
      { bb: 30, heroi: true }, { bb: 0 }, { bb: NaN }, { bb: 12 },
    ])!;
    expect(m.vivos).toBe(2);
    expect(m.cobre).toBe(1);
  });
});

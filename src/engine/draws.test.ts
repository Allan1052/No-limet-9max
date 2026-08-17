import { describe, it, expect } from "vitest";
import { detectDraw } from "./draws";
import { cardsFromString } from "./cards";

const h = (s: string) => cardsFromString(s);

describe("detectDraw — projeto do herói no board", () => {
  it("flush draw: 4 do mesmo naipe", () => {
    const d = detectDraw(h("AsKs"), h("Qs7s2h"));
    expect(d.flushDraw).toBe(true);
    expect(d.strength).toBeGreaterThan(0.8);
  });

  it("sequência aberta: 4 seguidas com pontas vivas (JT no 9-8-x)", () => {
    const d = detectDraw(h("JhTh"), h("9s8d2c"));
    expect(d.openEnded).toBe(true);
    expect(d.gutshot).toBe(false);
  });

  it("gutshot: falta a carta do meio (KQ no T-9, falta J)", () => {
    const d = detectDraw(h("KhQd"), h("Ts9s2c"));
    expect(d.gutshot).toBe(true);
    expect(d.openEnded).toBe(false);
    expect(d.strength).toBeLessThan(0.5);
  });

  it("combo draw (flush + reta) satura forte", () => {
    const d = detectDraw(h("Js Ts".replace(" ", "")), h("9s8s2h"));
    expect(d.flushDraw).toBe(true);
    expect(d.openEnded).toBe(true);
    expect(d.strength).toBe(1);
  });

  it("mão feita sem projeto: par de topo seco não é draw", () => {
    const d = detectDraw(h("AhKd"), h("As7c2d"));
    expect(d.flushDraw).toBe(false);
    expect(d.openEnded).toBe(false);
    expect(d.gutshot).toBe(false);
    expect(d.strength).toBe(0);
  });

  it("no river (board de 5) não há projeto", () => {
    const d = detectDraw(h("AsKs"), h("Qs7s2h3d")); // 4 cartas ainda conta
    expect(d.flushDraw).toBe(true);
    const river = detectDraw(h("AsKs"), h("Qs7s2h3d4c")); // 5 cartas: sem projeto
    expect(river.strength).toBe(0);
  });

  it("roda A-2-3-4-5: A2 no 3-4-x é sequência aberta/gutshot (Ás baixo)", () => {
    const d = detectDraw(h("Ah2d"), h("3s4c9h"));
    expect(d.gutshot || d.openEnded).toBe(true);
  });
});

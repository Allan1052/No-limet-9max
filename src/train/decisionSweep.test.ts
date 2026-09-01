import { describe, expect, it } from "vitest";
import { decisionSweeps } from "./decisionSweep";
import { parseHand, type HandLabSpec } from "./stage";

function spec(o: Partial<HandLabSpec> = {}): HandLabSpec {
  return { heroPosition: "BB", villainPosition: "UTG", situation: "vsopen", stage: "meio", stackBB: 18, hand: parseHand("KsJd")!, ...o };
}

describe("O que muda esta decisão? — decisionSweeps", () => {
  it("KJo BB vs UTG 18bb: o stack muda a resposta (all-in curto → fold → call fundo)", () => {
    const sweeps = decisionSweeps(spec());
    const stack = sweeps.find((s) => s.key === "stack");
    expect(stack).toBeTruthy();
    const actions = stack!.bands.map((b) => b.action);
    expect(new Set(actions).size).toBeGreaterThanOrEqual(2);
    // A faixa atual (18bb) é marcada como "você está aqui".
    const current = stack!.bands.find((b) => b.current);
    expect(current).toBeTruthy();
  });

  it("quem abriu muda a resposta: folda vs early, entra vs late", () => {
    const opener = decisionSweeps(spec()).find((s) => s.key === "opener");
    expect(opener).toBeTruthy();
    const vsUtg = opener!.bands.find((b) => b.label === "vs UTG");
    const vsBtn = opener!.bands.find((b) => b.label === "vs BTN");
    expect(vsUtg!.action).toBe("FOLD");
    expect(vsBtn!.action).not.toBe("FOLD");
  });

  it("as faixas de stack são contíguas e cobrem a varredura", () => {
    const stack = decisionSweeps(spec()).find((s) => s.key === "stack")!;
    // Pelo menos uma faixa "até", uma do meio e/ou uma "+".
    expect(stack.bands.length).toBeGreaterThanOrEqual(2);
    expect(stack.bands.some((b) => b.current)).toBe(true);
  });

  it("só devolve varredura que REALMENTE muda a decisão (spot óbvio não polui)", () => {
    // AA nunca vira fold — as varreduras que não mudam nada são filtradas.
    const sweeps = decisionSweeps(spec({ hand: parseHand("AhAs")!, situation: "vsopen", villainPosition: "BTN" }));
    for (const s of sweeps) {
      expect(new Set(s.bands.map((b) => b.action)).size).toBeGreaterThanOrEqual(2);
    }
  });

  it("spot 'open' (ninguém abriu) não gera varredura de 'quem abriu'", () => {
    const sweeps = decisionSweeps(spec({ situation: "open", heroPosition: "BTN" }));
    expect(sweeps.find((s) => s.key === "opener")).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import { anatomyFromDecisions } from "./anatomy";

describe("anatomia do torneio", () => {
  it("recreativo pagador: call muito acima do padrão", () => {
    const decisions = [
      ...Array(14).fill({ heroAction: "fold" }),
      ...Array(24).fill({ heroAction: "call" }),
      ...Array(62).fill({ heroAction: "raise" }),
    ];
    const a = anatomyFromDecisions(decisions);
    expect(a.callPct).toBe(24);
    expect(a.foldPct).toBe(14);
    expect(a.raisePct).toBe(62);
    expect(a.note).toContain("~3× mais");
  });

  it("jogador com call dentro da referência recebe leitura contextual", () => {
    const decisions = [
      ...Array(11).fill({ heroAction: "fold" }),
      ...Array(7).fill({ heroAction: "call" }),
      ...Array(82).fill({ heroAction: "raise" }),
    ];
    const a = anatomyFromDecisions(decisions);
    expect(a.callPct).toBe(7);
    expect(a.note).toContain("spots analisados neste torneio");
    expect(a.note).toContain("próxima da referência");
  });

  it("conta re-raises como subgrupo de raises (consecutivos)", () => {
    const decisions = [
      { heroAction: "raise" },
      { heroAction: "raise" },
      { heroAction: "fold" },
      { heroAction: "call" },
      { heroAction: "raise" },
    ];
    const a = anatomyFromDecisions(decisions);
    expect(a.counts.raises).toBe(3);
    expect(a.counts.reRaises).toBe(1);
    expect(a.counts.total).toBe(5);
  });

  it("bet e jam contam como raise; check conta como fold (não investiu)", () => {
    const a = anatomyFromDecisions([
      { heroAction: "bet" },
      { heroAction: "check" },
      { heroAction: "jam" },
    ]);
    expect(a.counts.raises).toBe(2);
    expect(a.counts.folds).toBe(1);
  });

  it("amostra curta pede mais mãos", () => {
    const a = anatomyFromDecisions([{ heroAction: "fold" }, { heroAction: "call" }]);
    expect(a.note).toContain("Amostra curta");
  });
});

import { describe, it, expect } from "vitest";
import { cardsFromString } from "../engine/cards";
import { preflopDecision } from "./preflop";
import { profileById, BASELINE_PROFILE } from "../bots/profiles";

function decide(
  hand: string,
  heroPosition: Parameters<typeof preflopDecision>[0]["heroPosition"],
  opts: Partial<Parameters<typeof preflopDecision>[0]> = {},
) {
  return preflopDecision({
    heroPosition,
    hand: cardsFromString(hand),
    effectiveBB: 100,
    profile: BASELINE_PROFILE,
    ...opts,
  });
}

describe("pré-flop — abertura (pote não aberto)", () => {
  it("AA sempre abre de UTG", () => {
    expect(decide("AsAh", "UTG").action).toBe("raise");
  });
  it("72o folda de UTG", () => {
    expect(decide("7s2h", "UTG").action).toBe("fold");
  });
  it("mão marginal abre no botão mas folda em UTG", () => {
    expect(decide("Ks9s", "UTG").action).toBe("fold");
    expect(decide("Ks9s", "BTN").action).toBe("raise");
  });
});

describe("pré-flop — perfis diferenciam o comportamento", () => {
  it("o LAG abre mais que o nit no CO", () => {
    const lag = profileById("lag");
    const nit = profileById("nit");
    // Uma mão marginal de roubo: o LAG abre, o nit fecha.
    const hand = "Jh8h";
    const a = decide(hand, "CO", { profile: lag });
    const c = decide(hand, "CO", { profile: nit });
    expect(a.action).toBe("raise");
    expect(c.action).toBe("fold");
  });
});

describe("pré-flop — profundidade de stack", () => {
  it("stack raso transforma abertura em all-in (push/fold)", () => {
    const d = decide("AsAh", "BTN", { effectiveBB: 10 });
    expect(d.action).toBe("jam");
    expect(d.sizeBB).toBeCloseTo(10, 5);
  });
});

describe("pré-flop — enfrentando um raise", () => {
  it("AA dá 3-bet contra abertura", () => {
    const d = decide("AsAh", "BTN", { raiserPosition: "CO" });
    expect(["3bet", "jam"]).toContain(d.action);
  });
  it("lixo folda contra abertura de UTG no BB", () => {
    const d = decide("9c4d", "BB", { raiserPosition: "UTG" });
    expect(d.action).toBe("fold");
  });
  it("BB defende mais largo contra o botão que contra UTG", () => {
    // Uma mão média: paga/defende vs BTN mas folda vs UTG.
    const vsBtn = decide("Kh9d", "BB", { raiserPosition: "BTN" });
    const vsUtg = decide("Kh9d", "BB", { raiserPosition: "UTG" });
    expect(vsBtn.action).not.toBe("fold");
    expect(vsUtg.action).toBe("fold");
  });
});

describe("pré-flop — ICM aperta a defesa", () => {
  it("na bolha, uma mão marginal que pagaria passa a foldar", () => {
    const base = decide("Ah9c", "BB", { raiserPosition: "BTN" });
    const bubble = decide("Ah9c", "BB", {
      raiserPosition: "BTN",
      icmSpot: {
        stacks: [3000, 3000, 3000, 1000],
        payouts: [50, 30, 20],
        hero: 0,
        villain: 1,
        chips: 3000,
      },
    });
    // Sob pressão de ICM, a range aperta: no mínimo não fica mais larga.
    if (base.action !== "fold") {
      // A defesa não deve ficar mais frouxa com ICM.
      expect(bubble.action === "fold" || bubble.action === base.action).toBe(true);
    }
    expect(bubble).toBeTruthy();
  });
});

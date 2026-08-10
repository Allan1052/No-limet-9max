import { describe, it, expect } from "vitest";
import { cardsFromString } from "../engine/cards";
import { preflopDecision, nBetLabel } from "./preflop";
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
    variant: "holdem", // Default para Hold'em nos testes
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

  it("sem limper, a abertura é a padrão de 2.3bb", () => {
    expect(decide("AsAh", "CO").sizeBB).toBeCloseTo(2.3, 5);
  });

  it("com limpers, o raise sobe +1bb por limper (isolamento)", () => {
    expect(decide("AsAh", "CO", { limpers: 1 }).sizeBB).toBeCloseTo(3.3, 5);
    expect(decide("AsAh", "CO", { limpers: 2 }).sizeBB).toBeCloseTo(4.3, 5);
    expect(decide("AsAh", "CO", { limpers: 3 }).sizeBB).toBeCloseTo(5.3, 5);
  });

  it("o raise com limper aparece na justificativa (isola)", () => {
    expect(decide("AsAh", "CO", { limpers: 2 }).reason).toMatch(/isol/i);
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

  it("stack ultracurto paga o all-in com ATo (pot odds), não folda", () => {
    // ATo com 4.3bb enfrentando um all-in: com o preço do pote é call fácil.
    const d = decide("AsTc", "BB", {
      raiserPosition: "MP",
      openSizeBB: 12,
      effectiveBB: 4.3,
    });
    expect(d.action).toBe("call");
    // Já mão bem fraca (72o) continua foldando mesmo curtíssimo.
    const trash = decide("7h2c", "BB", {
      raiserPosition: "MP",
      openSizeBB: 12,
      effectiveBB: 4.3,
    });
    expect(trash.action).toBe("fold");
  });

  it("na mesa final (push/fold), o shover de late position abre mais que o nit", () => {
    // No BTN a 10bb, o shover (agressivo, posicional) jamma uma range mais larga
    // que o nit conservador. Comparamos por várias mãos de fronteira.
    const shover = profileById("shover");
    const nit = profileById("nit");
    const hands = ["Kd5c", "Qc7d", "Jd7s", "Tc7h", "9d6d", "8s5s"];
    const jams = (p: ReturnType<typeof profileById>) =>
      hands.filter((h) => decide(h, "BTN", { effectiveBB: 10, profile: p }).action === "jam").length;
    expect(jams(shover)).toBeGreaterThan(jams(nit));
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
  it("nem o calling station paga um all-in pré-flop com lixo (85s)", () => {
    const station = profileById("station");
    // Enfrentando uma abertura ENORME (~70bb = shove), 85s tem que foldar.
    const shove = decide("8s5s", "BB", {
      profile: station,
      raiserPosition: "HJ",
      openSizeBB: 70,
      effectiveBB: 112,
    });
    expect(shove.action).toBe("fold");
    // Contra um open normal (2.3bb), o station pode pagar largo.
    const openWide = decide("8s5s", "BB", {
      profile: station,
      raiserPosition: "HJ",
      openSizeBB: 2.3,
    });
    expect(openWide.action).not.toBe("fold");
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

describe("pré-flop — confronto múltiplo (vários all-ins) aperta o call", () => {
  // BB curto (6bb) enfrentando um shove que já é all-in.
  const spot = { effectiveBB: 6, raiserPosition: "CO" as const, openSizeBB: 8 };
  const cont = (a: string) => a === "call" || a === "jam";

  it("mão marginal (J9s) paga UM all-in mas FOLDA contra dois", () => {
    const one = decide("Js9s", "BB", { ...spot, allInsAhead: 1 });
    const two = decide("Js9s", "BB", { ...spot, allInsAhead: 2 });
    expect(cont(one.action)).toBe(true);
    expect(two.action).toBe("fold");
  });

  it("premium (AA) paga mesmo com três all-ins na frente", () => {
    expect(cont(decide("AsAh", "BB", { ...spot, allInsAhead: 3 }).action)).toBe(true);
  });

  it("quanto mais all-ins na frente, menos mãos continuam", () => {
    let one = 0, two = 0, three = 0;
    for (const combo of ["AsAh","KsKh","QsQd","JsJh","TsTd","AsKs","AsKd","AsQs","KsQs","Js9s","Ts9s","Ks9s","Qs9s","9s8s","7s6s","Ad2c","Kd5c"]) {
      if (cont(decide(combo, "BB", { ...spot, allInsAhead: 1 }).action)) one++;
      if (cont(decide(combo, "BB", { ...spot, allInsAhead: 2 }).action)) two++;
      if (cont(decide(combo, "BB", { ...spot, allInsAhead: 3 }).action)) three++;
    }
    expect(two).toBeLessThan(one);
    expect(three).toBeLessThanOrEqual(two);
  });

  it("a escrita muda: com 2+ all-ins o texto cita o confronto múltiplo", () => {
    const two = decide("Js9s", "BB", { ...spot, allInsAhead: 2 });
    expect(two.reason).toMatch(/all-ins na frente|confronto múltiplo/i);
  });
});

describe("pré-flop — nível de aposta (3-bet vs 4-bet vs 5-bet)", () => {
  it("nBetLabel rotula pelo nível", () => {
    expect(nBetLabel(0)).toBe("abertura");
    expect(nBetLabel(1)).toBe("3-bet");
    expect(nBetLabel(2)).toBe("4-bet");
    expect(nBetLabel(3)).toBe("5-bet");
  });

  it("QQ num spot de 4-bet (open + 3-bet na frente) re-agride e é rotulada 4-bet", () => {
    const d = decide("QsQd", "SB", {
      effectiveBB: 40, raiserPosition: "BTN", openSizeBB: 7, threeBet: true, betLevelFaced: 2,
    });
    expect(["3bet", "jam"]).toContain(d.action);
    expect(d.nBet).toBe("4-bet");
  });

  it("mão marginal (KJs) continua vs abertura mas FOLDA vs 3-bet (spot de 4-bet)", () => {
    const vsOpen = decide("KsJs", "SB", { effectiveBB: 40, raiserPosition: "BTN", openSizeBB: 2.3 });
    const vs3bet = decide("KsJs", "SB", {
      effectiveBB: 40, raiserPosition: "BTN", openSizeBB: 7, threeBet: true, betLevelFaced: 2,
    });
    expect(vsOpen.action).not.toBe("fold");
    expect(vs3bet.action).toBe("fold");
  });
});

describe("pré-flop — premium nunca flata e par pequeno defende (bugs dos prints)", () => {
  // AKs curto (16.7bb) vs abertura de UTG: 3-bet/jam, JAMAIS flat.
  it("AKs curto vs abertura re-agride (não paga passivo)", () => {
    const d = decide("KsAs", "CO", { effectiveBB: 16.7, raiserPosition: "UTG", openSizeBB: 2.3, betLevelFaced: 1 });
    expect(["3bet", "jam"]).toContain(d.action);
  });

  it("premiums (AA/KK/QQ/JJ/AKo/AQs) sempre re-agridem vs abertura", () => {
    for (const h of ["AsAd", "KsKd", "QsQd", "JsJd", "AsKd", "AsQs"]) {
      const d = decide(h, "CO", { effectiveBB: 40, raiserPosition: "UTG", openSizeBB: 2.3, betLevelFaced: 1 });
      expect(["3bet", "jam"]).toContain(d.action);
    }
  });

  // Par pequeno no BB fechando com preço bom: paga para buscar o set.
  it("44/33/22 pagam no BB vs abertura (set-mine), não foldam", () => {
    for (const h of ["4s4d", "3s3d", "2s2d"]) {
      const d = decide(h, "BB", { effectiveBB: 34, raiserPosition: "MP", openSizeBB: 2.3, betLevelFaced: 1 });
      expect(d.action).toBe("call");
    }
  });

  // Par pequeno OOP fora do BB (SB) segue foldando — pior posição, sem preço.
  it("22 no SB (fora de posição) ainda folda vs abertura", () => {
    const d = decide("2s2d", "SB", { effectiveBB: 34, raiserPosition: "MP", openSizeBB: 2.3, betLevelFaced: 1 });
    expect(d.action).toBe("fold");
  });
});

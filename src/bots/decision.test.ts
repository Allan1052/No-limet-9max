import { describe, it, expect } from "vitest";
import { cardsFromString, seededRng } from "../engine/cards";
import { classifyBoard } from "./boardTexture";
import { postflopDecision, type PostflopContext } from "./decision";
import { profileById, BASELINE_PROFILE } from "./profiles";

describe("textura de board", () => {
  it("board seco tem wetness baixa", () => {
    const t = classifyBoard(cardsFromString("Ks7d2c"));
    expect(t.wetness).toBeLessThan(0.35);
    expect(t.flushPossible).toBe(false);
  });
  it("board conectado e do mesmo naipe tem wetness alta", () => {
    const t = classifyBoard(cardsFromString("9h8h7h"));
    expect(t.wetness).toBeGreaterThan(0.6);
    expect(t.flushPossible).toBe(true);
    expect(t.connectedness).toBeGreaterThan(0.9);
  });
  it("detecta board pareado", () => {
    expect(classifyBoard(cardsFromString("QsQh4d")).paired).toBe(true);
  });
});

function ctx(over: Partial<PostflopContext>): PostflopContext {
  return {
    hand: cardsFromString("AsAd"),
    board: cardsFromString("Ks7d2c"),
    potSize: 100,
    toCall: 0,
    heroStack: 1000,
    inPosition: true,
    numOpponents: 1,
    profile: BASELINE_PROFILE,
    wasPreflopAggressor: true,
    rng: seededRng(1),
    equityIterations: 3000,
    ...over,
  };
}

describe("pós-flop — valor", () => {
  it("mão muito forte aposta por valor quando passada a ação", () => {
    // Trinca de ases em board seco: aposta.
    const d = postflopDecision(ctx({ hand: cardsFromString("AsAd"), board: cardsFromString("Ah7d2c") }));
    expect(d.action).toBe("bet");
    expect(d.equity).toBeGreaterThan(0.8);
  });

  it("mão muito forte aumenta quando enfrenta aposta", () => {
    const d = postflopDecision(ctx({
      hand: cardsFromString("AsAd"),
      board: cardsFromString("Ah7d2c"),
      toCall: 50,
    }));
    expect(d.action).toBe("raise");
  });
});

describe("pós-flop — pot odds", () => {
  it("mão fraca sem odds folda contra aposta grande", () => {
    // 7-2 em board de ases/reis: quase sem equity, aposta grande.
    const d = postflopDecision(ctx({
      hand: cardsFromString("7h2s"),
      board: cardsFromString("AhKd9c"),
      potSize: 100,
      toCall: 90,
      inPosition: false,
      wasPreflopAggressor: false,
    }));
    expect(d.action).toBe("fold");
  });

  it("com odds boas o suficiente, paga", () => {
    // Par bom contra aposta pequena: equity paga as odds baratas.
    const d = postflopDecision(ctx({
      hand: cardsFromString("KhKs"),
      board: cardsFromString("Qh7d2c"),
      potSize: 100,
      toCall: 10, // odds baratíssimas (~9%)
      inPosition: true,
      wasPreflopAggressor: false,
    }));
    expect(["call", "raise"]).toContain(d.action);
  });
});

describe("pós-flop — perfis diferenciam o blefe", () => {
  it("o maníaco dá c-bet de blefe muito mais que o TAG preciso", () => {
    // Mão sem valor (ar) em board seco, ação passada: mede frequência de aposta
    // ao longo de muitas amostras aleatórias.
    const kenney = profileById("kenney");
    const chidwick = profileById("chidwick");

    function betFrequency(profileId: ReturnType<typeof profileById>) {
      let bets = 0;
      const N = 160;
      for (let i = 0; i < N; i++) {
        const d = postflopDecision(ctx({
          // Ás-alto sem projeto forte: equity fica estável na "zona de blefe"
          // (acima do piso, abaixo do limiar de valor), onde o perfil decide.
          hand: cardsFromString("AhTc"),
          board: cardsFromString("Kc7h2d"),
          toCall: 0,
          profile: profileId,
          wasPreflopAggressor: true,
          rng: seededRng(1000 + i),
          equityIterations: 600,
        }));
        if (d.action === "bet") bets++;
      }
      return bets / N;
    }

    const fKenney = betFrequency(kenney);
    const fChidwick = betFrequency(chidwick);
    expect(fKenney).toBeGreaterThan(fChidwick);
  });
});

describe("pós-flop — barrel coerente (iniciativa)", () => {
  it("com iniciativa aposta o ar com mais frequência que sem", () => {
    function betFreq(hasInitiative: boolean) {
      let bets = 0;
      const N = 150;
      for (let i = 0; i < N; i++) {
        const d = postflopDecision(ctx({
          hand: cardsFromString("AhTc"), // ar (ás-alto) em board seco
          board: cardsFromString("Kc7h2d"),
          toCall: 0,
          hasInitiative,
          wasPreflopAggressor: hasInitiative,
          rng: seededRng(4000 + i),
          equityIterations: 500,
        }));
        if (d.action === "bet") bets++;
      }
      return bets / N;
    }
    expect(betFreq(true)).toBeGreaterThan(betFreq(false));
  });
});

describe("pós-flop — ICM aperta o all-in", () => {
  it("um all-in que pagaria por pot odds vira fold sob pressão de ICM", () => {
    // Confronto de bolha: pagar all-in deve exigir bem mais equity.
    const bubble = {
      stacks: [3000, 3000, 3000, 1000],
      payouts: [50, 30, 20],
      hero: 0,
      villain: 1,
      chips: 2900, // arriscar quase tudo na bolha → prêmio de risco alto
    };
    // Par médio dominado: paga um all-in barato por pot odds, mas não sob ICM.
    const spot = () => ({
      hand: cardsFromString("8h8d"),
      board: cardsFromString("AhKd2c"),
      potSize: 3000,
      toCall: 500, // pagar = all-in (heroStack 500), pot odds baixas (~14%)
      heroStack: 500,
      inPosition: false,
      numOpponents: 1,
      profile: BASELINE_PROFILE,
      wasPreflopAggressor: false,
      villainRangePct: 0.4,
      equityIterations: 5000,
    });

    const semIcm = postflopDecision({ ...spot(), rng: seededRng(77) });
    const comIcm = postflopDecision({ ...spot(), rng: seededRng(77), icmSpot: bubble });

    // Sem ICM, o preço baixo faz pagar; com ICM, a exigência sobe e folda.
    expect(comIcm.requiredEquity).toBeGreaterThan(semIcm.requiredEquity);
    expect(semIcm.action).not.toBe("fold");
    expect(comIcm.action).toBe("fold");
  });
});

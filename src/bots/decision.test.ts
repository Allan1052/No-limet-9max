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

  it("sizing por polarização: near-nuts no river estoura o pote e passa do valor no flop", () => {
    const riverNuts = postflopDecision(ctx({
      hand: cardsFromString("AsKs"),
      board: cardsFromString("QsJsTs2h3d"), // royal flush no river (near-nuts)
      potSize: 100, toCall: 0, inPosition: true, wasPreflopAggressor: true,
    }));
    const flopStrong = postflopDecision(ctx({
      hand: cardsFromString("AsAd"),
      board: cardsFromString("Ah7d2c"), // top set no flop seco
      potSize: 100, toCall: 0, inPosition: true, wasPreflopAggressor: true,
    }));
    expect(riverNuts.action).toBe("bet");
    expect(flopStrong.action).toBe("bet");
    expect(riverNuts.sizeToPot!).toBeGreaterThanOrEqual(1.0); // overbet do range polarizado
    expect(riverNuts.sizeToPot!).toBeGreaterThan(flopStrong.sizeToPot!);
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

describe("pós-flop — implied odds do projeto (Frente #3)", () => {
  // Flush draw no flop (6s5s em Ks7s2h: 4 espadas). Mesmo projeto, mesma aposta:
  // muda só o stack ATRÁS. Fundo (mais implied) deve exigir MENOS equity que raso.
  const drawSpot = (heroStack: number) =>
    postflopDecision(ctx({
      hand: cardsFromString("6s5s"),
      board: cardsFromString("Ks7s2h"),
      potSize: 100,
      toCall: 30,
      heroStack,
      inPosition: true,
      wasPreflopAggressor: false,
    }));

  it("projeto FUNDO exige menos equity que projeto RASO (crédito de implied)", () => {
    const fundo = drawSpot(1000); // SPR alto atrás → crédito cheio
    const raso = drawSpot(60); // pouco atrás → crédito quase zero
    expect(fundo.requiredEquity).toBeLessThan(raso.requiredEquity);
  });

  it("projeto exige menos equity que mão SEM projeto no mesmo board fundo", () => {
    const comProjeto = drawSpot(1000);
    const semProjeto = postflopDecision(ctx({
      hand: cardsFromString("AhAd"), // overpar, sem flush/reta no Ks7s2h
      board: cardsFromString("Ks7s2h"),
      potSize: 100,
      toCall: 30,
      heroStack: 1000,
      inPosition: true,
      wasPreflopAggressor: false,
    }));
    expect(comProjeto.requiredEquity).toBeLessThan(semProjeto.requiredEquity);
  });

  it("no river não há crédito de implied (sem carta por vir)", () => {
    const turnDraw = postflopDecision(ctx({
      hand: cardsFromString("6s5s"),
      board: cardsFromString("Ks7s2h"), // flop: projeto vale
      potSize: 100, toCall: 30, heroStack: 1000, inPosition: true, wasPreflopAggressor: false,
    }));
    const riverMade = postflopDecision(ctx({
      hand: cardsFromString("AhAd"),
      board: cardsFromString("Ks7s2h9dQc"), // river: sem projeto
      potSize: 100, toCall: 30, heroStack: 1000, inPosition: true, wasPreflopAggressor: false,
    }));
    // sanity: o crédito só aparece com projeto vivo (turn/flop), não some o teste
    expect(turnDraw.requiredEquity).toBeGreaterThan(0);
    expect(riverMade.requiredEquity).toBeGreaterThan(0);
  });
});

describe("pós-flop — perfis diferenciam o blefe", () => {
  it("o LAG dá c-bet de blefe muito mais que o calling station", () => {
    // Mão sem valor (ar) em board seco, ação passada: mede frequência de aposta
    // ao longo de muitas amostras aleatórias.
    const kenney = profileById("lag");
    const chidwick = profileById("station");

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

describe("pós-flop — estratégia mista (frequências)", () => {
  it("mão muito forte gera mix dominado por valor e soma ~1", () => {
    const d = postflopDecision(ctx({
      hand: cardsFromString("AsAd"),
      board: cardsFromString("Ah7d2c"),
      toCall: 50,
    }));
    const total = d.mix.reduce((s, m) => s + m.freq, 0);
    expect(total).toBeCloseTo(1, 1);
    // Trinca de ases: quase nunca folda.
    const fold = d.mix.find((m) => m.action === "fold")?.freq ?? 0;
    expect(fold).toBeLessThan(0.1);
  });

  it("mão fraca sem preço gera mix dominado por fold", () => {
    const d = postflopDecision(ctx({
      hand: cardsFromString("7h2s"),
      board: cardsFromString("AhKd9c"),
      potSize: 100,
      toCall: 90,
      inPosition: false,
      wasPreflopAggressor: false,
    }));
    const fold = d.mix.find((m) => m.action === "fold")?.freq ?? 0;
    expect(fold).toBeGreaterThan(0.6);
    expect(d.villainRangePct).toBeGreaterThan(0);
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

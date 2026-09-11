// ---------------------------------------------------------------------------
// O ICM EM NÚMERO — o teste que prova que a frase tem lastro.
//
// A regra da casa proibia o app de dizer "foi o ICM". A única forma honesta de
// dizer isso é MEDIR: rodar o motor duas vezes no mesmo spot, com e sem os
// prêmios na conta, e comparar. Estes testes garantem duas coisas:
//   1. que a medida é real — existe spot em que as duas respostas divergem;
//   2. que ela é conservadora — sem prêmios, ou com ICM que não aperta, a
//      medida não nasce (e a frase, por consequência, também não).
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import { cardsFromString } from "../engine/cards";
import { BASELINE_PROFILE } from "../bots/profiles";
import { preflopDecision, type PreflopContext } from "../ranges/preflop";
import { icmTightenFactor, type IcmSpot } from "../ranges/icm";

/** Bolha clássica: 4 jogadores, 3 pagam. O curto é quem mais sofre. */
const BOLHA: IcmSpot = {
  stacks: [12000, 30000, 28000, 30000],
  payouts: [50, 30, 20],
  hero: 0,
  villain: 1,
  chips: 12000,
};

function ctx(hand: string, icmSpot?: IcmSpot): PreflopContext {
  return {
    heroPosition: "SB",
    hand: cardsFromString(hand),
    effectiveBB: 15,
    profile: BASELINE_PROFILE,
    variant: "holdem",
    raiserPosition: "BTN",
    openSizeBB: 15, // o BTN empurrou: decisão de pagar ou largar
    betLevelFaced: 1,
    icmSpot,
  };
}

describe("ICM medido (com prêmios × sem prêmios)", () => {
  it("a bolha realmente aperta: o fator de ICM é menor que 1", () => {
    expect(icmTightenFactor(BOLHA, BASELINE_PROFILE.icmSensitivity)).toBeLessThan(1);
  });

  it("existe pelo menos uma mão em que os prêmios MUDAM a decisão", () => {
    const fam = (a: string) => (a === "fold" ? "fold" : a === "call" ? "call" : a === "check" ? "check" : "aggro");
    const maos = ["As Jd", "Ah Td", "Kh Qd", "Ad 9c", "Kd Jc", "Qh Jd", "8h 8d", "7h 7d", "6h 6d", "As 5d"];
    const divergem = maos.filter(
      (m) => fam(preflopDecision(ctx(m, BOLHA)).action) !== fam(preflopDecision(ctx(m)).action),
    );
    expect(divergem.length, "nenhuma mão mudou com ICM — a medida seria inútil").toBeGreaterThan(0);
  });

  it("a diferença é concreta: com a bolha, A9o larga o que largaria em cash", () => {
    expect(preflopDecision(ctx("Ad 9c")).action).toBe("call");
    expect(preflopDecision(ctx("Ad 9c", BOLHA)).action).toBe("fold");
  });

  it("quando muda de FAMÍLIA, é sempre para MAIS conservador (o ICM aperta)", () => {
    const risco = (a: string) => (a === "fold" ? 0 : a === "check" ? 1 : a === "call" ? 2 : 3);
    const maos = ["As Jd", "Ah Td", "Kh Qd", "Ad 9c", "Kd Jc", "Qh Jd", "8h 8d", "7h 7d", "As 5d", "Ah 7d", "5h 5d"];
    for (const m of maos) {
      const com = preflopDecision(ctx(m, BOLHA)).action;
      const sem = preflopDecision(ctx(m)).action;
      expect(risco(com), `${m}: com ICM ficou MAIS agressivo que sem`).toBeLessThanOrEqual(risco(sem));
    }
  });

  it("mesmo spot, mesma resposta: a medida é determinística (dá para repetir)", () => {
    for (const m of ["As Jd", "8h 8d"]) {
      expect(preflopDecision(ctx(m, BOLHA)).action).toBe(preflopDecision(ctx(m, BOLHA)).action);
      expect(preflopDecision(ctx(m)).action).toBe(preflopDecision(ctx(m)).action);
    }
  });

  it("quanto mais perto da bolha, mais o ICM aperta", () => {
    const cedo: IcmSpot = {
      stacks: [30000, 30000, 30000, 30000, 30000, 30000, 30000, 30000, 30000],
      payouts: [50, 30, 20], hero: 0, villain: 1, chips: 30000,
    };
    const apertoCedo = icmTightenFactor(cedo, BASELINE_PROFILE.icmSensitivity);
    const apertoBolha = icmTightenFactor(BOLHA, BASELINE_PROFILE.icmSensitivity);
    expect(apertoBolha).toBeLessThan(apertoCedo);
  });

  it("sem prêmios não existe ICM — e sem ICM a medida não nasce", () => {
    const semPremio: IcmSpot = { stacks: [12000, 30000], payouts: [], hero: 0, villain: 1, chips: 12000 };
    expect(icmTightenFactor(semPremio, BASELINE_PROFILE.icmSensitivity)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// A ponte: a medida chega mesmo à dica, e nunca contradiz a recomendação.
// ---------------------------------------------------------------------------
import { GameController } from "./gameController";
import { seededRng } from "../engine/cards";

describe("o ICM medido atravessa até a dica do herói", () => {
  /**
   * Roda uma MESA FINAL e coleta as dicas do pré-flop.
   *
   * É de propósito que seja mesa final e não o começo do torneio: numa mesa de
   * 9 com o prêmio longe, o ICM quase nunca vira a decisão — e é correto que não
   * vire. A diferença aparece onde ela existe de verdade: poucos jogadores,
   * stacks curtos, prêmio perto. Quem não sabia disso era o app, que falava de
   * ICM em todo lugar.
   */
  function coletar(comPremios: boolean) {
    const g = new GameController({
      rng: seededRng(20260911),
      startingStack: 1200, // stacks curtos: é onde o prêmio morde
      payouts: comPremios ? [50, 30, 20] : undefined,
    });
    if (comPremios) g.configureTournament({ buyIn: 11, entrants: 200, stage: "mesa_final" });
    const vistos: Array<{ acao: string; delta?: { comIcm: string; semIcm: string } }> = [];
    for (let mao = 0; mao < 120; mao++) {
      g.newHand();
      let guarda = 0;
      while (g.phase === "playing" && guarda++ < 60) {
        if (g.isHeroTurn()) {
          if (g.table.street === "preflop") {
            const a = g.computeHeroAdvice();
            if (a) vistos.push({ acao: a.action, delta: a.icmDelta });
          }
          const la = g.legal();
          if (la.canCheck) g.heroAct({ type: "check" });
          else if (la.canCall && la.callAmount <= g.table.players[0].stack * 0.3) g.heroAct({ type: "call" });
          else g.heroAct({ type: "fold" });
        } else {
          g.botStep();
        }
      }
      if (g.tournamentOver) break;
    }
    return vistos;
  }

  it("com prêmios na mesa, a medida aparece em pelo menos um spot", () => {
    const comPremio = coletar(true);
    expect(comPremio.length, "o teste não chegou a ver dica nenhuma").toBeGreaterThan(10);
    expect(comPremio.some((v) => v.delta !== undefined)).toBe(true);
  });

  it("SEM prêmios (cash) a medida nunca nasce — não há ICM para medir", () => {
    const semPremio = coletar(false);
    expect(semPremio.length).toBeGreaterThan(10);
    for (const v of semPremio) expect(v.delta).toBeUndefined();
  });

  it("quando aparece, o lado 'com ICM' é SEMPRE a ação recomendada na tela", () => {
    // Esta é a trava contra o pior erro possível: a dica dizer 'com a bolha é
    // fold' enquanto o botão recomenda outra coisa.
    for (const v of coletar(true)) {
      if (v.delta) expect(v.delta.comIcm).toBe(v.acao);
    }
  });

  it("e os dois lados são de famílias diferentes (senão não havia o que contar)", () => {
    const fam = (a: string) => (a === "fold" ? "fold" : a === "call" ? "call" : a === "check" ? "check" : "aggro");
    for (const v of coletar(true)) {
      if (v.delta) expect(fam(v.delta.comIcm)).not.toBe(fam(v.delta.semIcm));
    }
  });
});

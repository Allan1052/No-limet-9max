import { describe, expect, it } from "vitest";
import { lerImportancia, mereceReview, podeFicarCalado, type SinaisDoSpot } from "./importanciaDaMao";

// O caso que originou a régua (Allan, 17/09/2026): 82o em UTG é fold e ponto;
// a mão que ele JOGA é a que ele quer entender.
describe("a régua do silêncio", () => {
  it("82o UTG: fold de lixo, nada em jogo -> o coach cala a boca", () => {
    const lixo: SinaisDoSpot = {
      mix: [{ action: "fold", freq: 1 }],
      adviceFam: "fold",
      heroFam: "fold",
      betLevelFaced: 0,
    };
    expect(lerImportancia(lixo).nivel).toBe("obvia");
    expect(podeFicarCalado(lixo)).toBe(true);
  });

  it("AJo que abre: entrar no pote sempre merece o porquê", () => {
    const abre: SinaisDoSpot = {
      mix: [{ action: "raise", freq: 1 }],
      adviceFam: "aggro",
      heroFam: "aggro",
      betLevelFaced: 0,
    };
    const r = lerImportancia(abre);
    expect(r.nivel).toBe("interessante");
    expect(r.sinais).toContain("entrouNoPote");
    expect(podeFicarCalado(abre)).toBe(false);
  });

  it("call também é entrar no pote", () => {
    expect(lerImportancia({ adviceFam: "call" }).sinais).toContain("entrouNoPote");
  });

  it("check numa mão morna não acende nada", () => {
    expect(lerImportancia({ adviceFam: "check", heroFam: "check" }).nivel).toBe("obvia");
  });
});

describe("o que eleva a mão", () => {
  it("mão de borda (padrão misto) sai do silêncio mesmo sendo fold", () => {
    const borda: SinaisDoSpot = {
      mix: [{ action: "fold", freq: 0.6 }, { action: "raise", freq: 0.4 }],
      adviceFam: "fold",
      heroFam: "fold",
    };
    const r = lerImportancia(borda);
    expect(r.nivel).toBe("interessante");
    expect(r.sinais).toContain("decisaoDisputada");
  });

  it("preço na fronteira: equity colada na exigida", () => {
    expect(lerImportancia({ equity: 0.42, requiredEquity: 0.44 }).sinais).toContain("precoNaFronteira");
    expect(lerImportancia({ equity: 0.62, requiredEquity: 0.30 }).sinais).not.toContain("precoNaFronteira");
  });

  it("ICM só acende quando VIROU a decisão", () => {
    expect(lerImportancia({ icmDelta: { comIcm: "fold", semIcm: "call" } }).sinais).toContain("icmVirou");
    expect(lerImportancia({ icmDelta: { comIcm: "call", semIcm: "call" } }).sinais).not.toContain("icmVirou");
  });

  it("SPR crítico acende; SPR folgado não", () => {
    expect(lerImportancia({ spr: 1.2 }).sinais).toContain("sprCritico");
    expect(lerImportancia({ spr: 6 }).sinais).not.toContain("sprCritico");
    expect(lerImportancia({ spr: 0 }).sinais).not.toContain("sprCritico");
  });

  it("ponto de virada: a aposta está colada no valor que vira a decisão", () => {
    expect(lerImportancia({ breakEvenCallBB: 10, toCallBB: 9.5 }).sinais).toContain("pontoDeVirada");
    expect(lerImportancia({ breakEvenCallBB: 30, toCallBB: 9.5 }).sinais).not.toContain("pontoDeVirada");
  });

  it("3-bet ou mais é guerra de apostas", () => {
    expect(lerImportancia({ betLevelFaced: 2 }).sinais).toContain("guerraDeApostas");
    expect(lerImportancia({ betLevelFaced: 1 }).sinais).not.toContain("guerraDeApostas");
  });
});

describe("o que vira material de review", () => {
  it("ICM que virou a decisão vai direto para o review", () => {
    expect(mereceReview({ icmDelta: { comIcm: "fold", semIcm: "call" } })).toBe(true);
  });

  it("all-in na mesa vai direto para o review", () => {
    expect(mereceReview({ facingAllin: true })).toBe(true);
  });

  it("errar num spot que já era disputado vira review", () => {
    expect(mereceReview({
      adviceFam: "fold", heroFam: "call",          // errou
      mix: [{ action: "fold", freq: 0.6 }, { action: "call", freq: 0.4 }],
    })).toBe(true);
  });

  it("errar num spot simples é interessante, não excepcional", () => {
    const r = lerImportancia({ adviceFam: "fold", heroFam: "call", mix: [{ action: "fold", freq: 1 }] });
    expect(r.sinais).toContain("errouAFamilia");
    expect(r.nivel).toBe("interessante");
  });

  it("três sinais acesos bastam, mesmo sem nenhum pesado", () => {
    const r = lerImportancia({ adviceFam: "aggro", betLevelFaced: 2, spr: 1.0 });
    expect(r.sinais.length).toBeGreaterThanOrEqual(3);
    expect(r.nivel).toBe("excepcional");
  });
});

describe("sem dado, sem sinal", () => {
  it("spot vazio é mão óbvia — a régua não inventa importância", () => {
    expect(lerImportancia({}).nivel).toBe("obvia");
    expect(lerImportancia({}).sinais).toEqual([]);
  });

  it("campos ausentes não acendem sinal", () => {
    const r = lerImportancia({ equity: 0.5 }); // sem requiredEquity
    expect(r.sinais).not.toContain("precoNaFronteira");
  });
});

// ---------------------------------------------------------------------------
// A DICA AO VIVO NÃO PODE TREMER.
//
// Bug encontrado em 12/09/2026, com o painel do ▾ aberto na tela: a faixa dizia
// "equity 41%" e o painel, logo abaixo, "equity 38%" — a MESMA decisão, dois
// números. A causa: a dica era recalculada a cada render, e no pós-flop a
// equity vem de simulação, então cada repintura sorteava de novo.
//
// A correção é congelar a dica por SITUAÇÃO. Este teste guarda a correção lendo
// o próprio fonte: se alguém tirar o useMemo ou a chave do spot, ele reprova.
// (É a mesma técnica de contrato de tela que o projeto já usa em outros pontos.)
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import appSource from "./App.tsx?raw";

describe("a dica ao vivo é congelada por spot", () => {
  it("computeHeroCoachDecision roda dentro de um useMemo, não a cada render", () => {
    const m = appSource.match(/const coachDecision = useMemo\([\s\S]{0,400}?\);/);
    expect(m, "coachDecision voltou a ser calculado a cada render").not.toBeNull();
    expect(m![0]).toContain("computeHeroCoachDecision");
    expect(m![0]).toContain("spotKey");
  });

  it("a chave do spot cobre tudo que muda a recomendação", () => {
    const bloco = appSource.slice(appSource.indexOf("const spotKey"), appSource.indexOf("const coachDecision"));
    for (const campo of ["street", "board", "holeCards", "toAct", "pot", "callAmount", "currentBet"]) {
      expect(bloco, `a chave do spot não cobre ${campo}`).toContain(campo);
    }
  });

  it("as camadas ao vivo saem da MESMA fonte que a faixa (sem cálculo paralelo)", () => {
    const bloco = appSource.slice(appSource.indexOf("const coachCamadas"), appSource.indexOf("const temAlgoNoCoach"));
    expect(bloco).toContain("construirCamadas");
    expect(bloco).toContain("coachDecision");
    expect(bloco).toContain('"aoVivo"');
  });
});

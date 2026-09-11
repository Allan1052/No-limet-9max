import { describe, expect, it } from "vitest";
import type { FeedbackItem } from "../feedback/analyzer";
import { buildCoachV2PostHandDecision } from "./coachV2PostHand";

const base: FeedbackItem = {
  street: "Flop",
  heroAction: "Call",
  advice: "Call",
  rating: "boa",
  text: "Você tem equity suficiente para continuar.",
  equity: 0.41,
  potOdds: 0.25,
  evBB: 2.3,
  betSizePct: 0.6,
  betSizeBB: 9,
};

describe("Coach V2 pós-mão", () => {
  it("no modo simples lidera com a decisão (veredito + jogada), motivo, e SEM números", () => {
    const view = buildCoachV2PostHandDecision(base, "simple");

    // rating "boa" + herói fez o recomendado (Call): veredito positivo.
    expect(view.decisionLine).toBe("✔ Boa! Call era o caminho.");
    expect(view.reason).toBe(base.text);
    expect(view.metrics).toEqual([]);
  });

  it("quando a jogada não foi a ideal, o veredito mostra o recomendado", () => {
    const view = buildCoachV2PostHandDecision(
      { ...base, heroAction: "Call", advice: "Fold", rating: "ruim" },
      "simple",
    );
    expect(view.decisionLine).toBe("✗ Melhor era Fold. Você fez Call.");
  });

  // 11/09/2026: equity e preço SAÍRAM de `metrics` e viraram a camada "conta",
  // que existe nos DOIS modos (antes o recreativo, no modo simples, não via
  // número nenhum). `metrics` ficou só com o que não cabe em frase.
  it("no modo técnico mostra apenas métricas realmente presentes no feedback", () => {
    const view = buildCoachV2PostHandDecision(base, "technical");

    expect(view.metrics).toEqual([
      "EV +2.3bb",
      "Sizing ~60% · 9bb",
    ]);

    const withoutMetrics = buildCoachV2PostHandDecision(
      { ...base, equity: undefined, potOdds: undefined, evBB: undefined, betSizePct: undefined, betSizeBB: undefined },
      "technical",
    );
    expect(withoutMetrics.metrics).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// AS CAMADAS NOVAS (auditoria das dicas, 11/09/2026): "a leitura" e "a conta".
// O dado já era calculado pelo motor e morria antes da tela.
// ---------------------------------------------------------------------------
describe("Coach V2 pós-mão — a conta", () => {
  it("no modo SIMPLES fala em português, sem exigir saber o que é equity", () => {
    const v = buildCoachV2PostHandDecision({ ...base, equity: 0.22, potOdds: 0.33 }, "simple");
    expect(v.conta).toBe(
      "Você ganha 22 de cada 100 vezes. Pelo preço que estava pagando, precisaria ganhar 33 — faltam 11.",
    );
  });

  it("quando o preço estava bom, diz isso em vez de 'faltam'", () => {
    const v = buildCoachV2PostHandDecision({ ...base, equity: 0.45, potOdds: 0.33 }, "simple");
    expect(v.conta).toContain("só precisava de 33");
    expect(v.conta).toContain("o preço estava bom");
  });

  it("sem aposta para pagar, mostra só a chance de ganhar", () => {
    const v = buildCoachV2PostHandDecision({ ...base, equity: 0.6, potOdds: undefined }, "simple");
    expect(v.conta).toBe("Com essa mão você ganha 60 de cada 100 vezes.");
  });

  it("no modo TÉCNICO mostra os números crus", () => {
    const v = buildCoachV2PostHandDecision({ ...base, equity: 0.22, potOdds: 0.33 }, "technical");
    expect(v.conta).toBe("Equity 22% vs preço 33% — faltam 11 pontos.");
  });

  it("sem equity não inventa conta nenhuma", () => {
    const v = buildCoachV2PostHandDecision({ ...base, equity: undefined }, "simple");
    expect(v.conta).toBeUndefined();
  });
});

describe("Coach V2 pós-mão — a leitura do range do vilão", () => {
  it("traduz a largura sem esconder o número", () => {
    const apertado = buildCoachV2PostHandDecision({ ...base, villainRangePct: 0.15 }, "simple");
    expect(apertado.leitura).toBe("O vilão joga cerca de 15% das mãos nesse ponto — range apertado.");

    const largo = buildCoachV2PostHandDecision({ ...base, villainRangePct: 0.52 }, "simple");
    expect(largo.leitura).toContain("52%");
    expect(largo.leitura).toContain("range largo");
  });

  it("no modo técnico fica compacto", () => {
    const v = buildCoachV2PostHandDecision({ ...base, villainRangePct: 0.28 }, "technical");
    expect(v.leitura).toBe("Range do vilão ~28% (range médio).");
  });

  it("sem estimativa de range, não inventa leitura", () => {
    expect(buildCoachV2PostHandDecision(base, "simple").leitura).toBeUndefined();
    expect(buildCoachV2PostHandDecision({ ...base, villainRangePct: 0 }, "simple").leitura).toBeUndefined();
  });
});

describe("Coach V2 pós-mão — o que mudaria a decisão", () => {
  const fold = { ...base, adviceFam: "fold" as const, breakEvenCallBB: 2.1 };

  it("no modo SIMPLES responde a pergunta do vídeo", () => {
    expect(buildCoachV2PostHandDecision(fold, "simple").oQueMudaria).toBe(
      "Se ele tivesse apostado até 2.1bb, aí valeria pagar.",
    );
  });

  it("no modo TÉCNICO fica direto", () => {
    expect(buildCoachV2PostHandDecision(fold, "technical").oQueMudaria).toBe(
      "Viraria call com até 2.1bb para pagar.",
    );
  });

  // Num call já aprovado, dizer o ponto de virada é ruído: a decisão estava
  // certa e a frase só confundiria.
  it("só aparece quando o padrão era FOLDAR", () => {
    const call = { ...base, adviceFam: "call" as const, breakEvenCallBB: 2.1 };
    expect(buildCoachV2PostHandDecision(call, "simple").oQueMudaria).toBeUndefined();
  });

  it("sem ponto de virada calculado, não inventa", () => {
    const semVirada = { ...base, adviceFam: "fold" as const };
    expect(buildCoachV2PostHandDecision(semVirada, "simple").oQueMudaria).toBeUndefined();
  });
});

describe("Coach V2 pós-mão — cartas que te salvavam", () => {
  it("conta as cartas e a chance, em português", () => {
    const v = buildCoachV2PostHandDecision({ ...base, outs: { outs: 9, chance: 0.191 } }, "simple");
    expect(v.cartasSalvadoras).toBe("9 cartas te colocavam na frente — 19% de chance de vir na próxima.");
  });

  it("uma carta só não vira 'cartas'", () => {
    const v = buildCoachV2PostHandDecision({ ...base, outs: { outs: 1, chance: 0.021 } }, "simple");
    expect(v.cartasSalvadoras).toContain("1 carta te");
  });

  it("no modo técnico usa o termo do jogo", () => {
    const v = buildCoachV2PostHandDecision({ ...base, outs: { outs: 9, chance: 0.191 } }, "technical");
    expect(v.cartasSalvadoras).toBe("9 outs · 19% na próxima carta.");
  });

  it("sem outs, não aparece", () => {
    expect(buildCoachV2PostHandDecision(base, "simple").cartasSalvadoras).toBeUndefined();
    expect(buildCoachV2PostHandDecision({ ...base, outs: { outs: 0, chance: 0 } }, "simple").cartasSalvadoras).toBeUndefined();
  });
});

import { describe, it, expect } from "vitest";
import { preflopDecision } from "./preflop";
import { BASELINE_PROFILE } from "../bots/profiles";
import { cardsFromString } from "../engine/cards";

// ---------------------------------------------------------------------------
// REGRESSÃO — bugs de pré-flop pegos pelo Allan no review de um torneio real.
//
// 1) Em pote NÃO ABERTO o motor mandava o BB FOLDAR — inclusive AK. Causa: a
//    range de RFI do BB vale 0% por definição (ninguém "abre" do BB), então
//    toda mão caía fora da range e o retorno padrão era "fold". Só que o BB já
//    pagou o blind: ali a ação é PASSAR (ou isolar com valor), nunca foldar.
// 2) A largura de defesa do BB ignorava o TAMANHO da aposta: contra um
//    min-raise (o BB completa uma ninharia num pote grande) ele defendia como
//    se fosse um open padrão, e foldava mãos que pagam de olhos fechados.
// ---------------------------------------------------------------------------

const base = {
  profile: BASELINE_PROFILE,
  effectiveBB: 40,
} as const;

describe("BB nunca folda em pote não aberto", () => {
  it("AKo do BB com limpers: aumenta (isola) — jamais folda", () => {
    const d = preflopDecision({
      ...base,
      heroPosition: "BB",
      hand: cardsFromString("AsKc"),
      limpers: 2,
    });
    expect(d.action).not.toBe("fold");
    expect(["raise", "jam"]).toContain(d.action);
  });

  it("mão fraca do BB com limpers: PASSA (check), nunca folda", () => {
    const d = preflopDecision({
      ...base,
      heroPosition: "BB",
      hand: cardsFromString("9s5h"),
      limpers: 1,
    });
    expect(d.action).toBe("check");
  });

  it("nenhuma mão do BB em pote não aberto retorna fold", () => {
    const combos = ["AsKc", "9s5h", "7d2c", "Th7s", "QdQh", "3s2h", "Jc4d"];
    for (const c of combos) {
      const d = preflopDecision({ ...base, heroPosition: "BB", hand: cardsFromString(c), limpers: 1 });
      expect(d.action, `mão ${c} não pode ser fold no BB`).not.toBe("fold");
    }
  });
});

describe("BB defende pelo PREÇO contra abertura pequena", () => {
  it("T7s no BB contra min-raise de 1.5bb: não é fold", () => {
    const d = preflopDecision({
      ...base,
      heroPosition: "BB",
      hand: cardsFromString("Ts7s"),
      raiserPosition: "CO",
      openSizeBB: 1.5,
    });
    expect(d.action).not.toBe("fold");
  });

  it("o open PADRÃO (2bb) não muda de comportamento (calibração intacta)", () => {
    // A trava real da calibração é o SELO GTO; aqui só garantimos que o fator
    // de preço é neutro no tamanho padrão.
    const padrao = preflopDecision({
      ...base, heroPosition: "BB", hand: cardsFromString("Ts7s"), raiserPosition: "CO", openSizeBB: 2,
    });
    const semTamanho = preflopDecision({
      ...base, heroPosition: "BB", hand: cardsFromString("Ts7s"), raiserPosition: "CO",
    });
    expect(padrao.action).toBe(semTamanho.action);
  });
});

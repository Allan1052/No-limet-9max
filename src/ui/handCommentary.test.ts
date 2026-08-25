// Testes do motor de comentário hand-specific (UI layer) — não toca no motor.
import { describe, expect, it } from "vitest";
import { makeCard } from "../engine/cards";
import {
  getHandCommentary,
  handNamePretty,
  pickPro,
} from "./handCommentary";

// Helpers: rank=suited helper
const card = (rank: number, suit = 0) => makeCard(rank, suit);

const hands = {
  // AA: rank14, KK: 13, QQ: 12, JJ: 11, TT: 10, 99: 9, 88: 8, 22: 2
  AA: [card(14, 0), card(14, 1)],
  KK: [card(13, 0), card(13, 1)],
  QQ: [card(12, 0), card(12, 1)],
  JJ: [card(11, 0), card(11, 1)],
  TT: [card(10, 0), card(10, 1)],
  nines: [card(9, 0), card(9, 1)],
  eights: [card(8, 0), card(8, 1)],
  twos: [card(2, 0), card(2, 1)],
  AKs: [card(14, 0), card(13, 0)],
  AKo: [card(14, 0), card(13, 1)],
  AQs: [card(14, 0), card(12, 0)],
  AJo: [card(14, 0), card(11, 1)],
  ATo: [card(14, 0), card(10, 1)],
  A5s: [card(14, 0), card(5, 0)],
  A7o: [card(14, 0), card(7, 1)],
  KQo: [card(13, 0), card(12, 1)],
  KJo: [card(13, 0), card(11, 1)],
  QJo: [card(12, 0), card(11, 1)],
  T9s: [card(10, 0), card(9, 0)],
  nines8s: [card(9, 0), card(8, 0)],
  six5s: [card(6, 0), card(5, 0)],
  Q9s: [card(12, 0), card(9, 0)],
  T8o: [card(10, 0), card(8, 1)],
  eight3o: [card(8, 0), card(3, 1)],
  seven2o: [card(7, 0), card(2, 1)],
  nine2o: [card(9, 0), card(2, 1)],
  four3o: [card(4, 0), card(3, 1)],
};

describe("handCommentary — classificação por mão", () => {
  it("nomeia AA/KK/QQ como premium e comenta abertura", () => {
    for (const hand of [hands.AA, hands.KK, hands.QQ]) {
      const c = getHandCommentary(
        { heroHand: hand, heroAction: "Raise", position: "UTG", heroBB: 100, preflop: true, rating: "boa" },
        "free",
      );
      expect(c).not.toBeNull();
      expect(c!.lines[0]).toMatch(/mão mais forte|pede ação/i);
    }
  });

  it("trash 83o de UTG: fold é a mensagem", () => {
    const c = getHandCommentary(
      { heroHand: hands.eight3o, heroAction: "Fold", position: "UTG", preflop: true, rating: "boa" },
      "free",
    );
    expect(c).not.toBeNull();
    expect(c!.lines[0]).toMatch(/fold|Nem em sonho|não joga/i);
    expect(c!.handName).toMatch(/8/);
  });

  it("72o e 92o também são trash", () => {
    for (const h of [hands.seven2o, hands.nine2o]) {
      const c = getHandCommentary({ heroHand: h, heroAction: "Fold", position: "BTN", preflop: true }, "free");
      expect(c).not.toBeNull();
      expect(c!.lines[0]).toMatch(/fold|Não confunda|quase sempre/i);
    }
  });

  it("AKsRaise de BTN: voz de arma", () => {
    const c = getHandCommentary(
      { heroHand: hands.AKs, heroAction: "Raise", position: "BTN", preflop: true, rating: "boa" },
      "free",
    );
    expect(c).not.toBeNull();
    expect(c!.lines[0]).toMatch(/arma|abre|domina/i);
  });

  it("JJ de UTG: hand-raiser", () => {
    const c = getHandCommentary(
      { heroHand: hands.JJ, heroAction: "Raise", position: "UTG", preflop: true, rating: "boa" },
      "free",
    );
    expect(c!.lines[0]).toMatch(/com for|raise ou fold/i);
  });

  it("22 shove com 15bb: shove/fold", () => {
    const c = getHandCommentary(
      { heroHand: hands.twos, heroAction: "All-in", position: "BTN", heroBB: 15, preflop: true, rating: "boa" },
      "free",
    );
    expect(c!.lines[0]).toMatch(/shove/i);
  });

  it("T9s de BTN: suited connector abre com plano", () => {
    const c = getHandCommentary(
      { heroHand: hands.T9s, heroAction: "Raise", position: "BTN", preflop: true, rating: "boa" },
      "free",
    );
    expect(c!.lines[0]).toMatch(/pós-flop bom|abre com plano/i);
  });

  it("T9s de UTG fold: fold sem culpa", () => {
    const c = getHandCommentary(
      { heroHand: hands.T9s, heroAction: "Fold", position: "UTG", preflop: true, rating: "boa" },
      "free",
    );
    expect(c!.lines[0]).toMatch(/fold sem culpa|luxo|aceitável|equity morta/i);
  });

  it("KQo de UTG open-fold profundo: fold de ABERTURA, não de 3-bet", () => {
    // Sem re-agressão na frente (betLevelFaced 0): é um open-fold. A narração
    // NÃO pode falar de "3-bet" — tem que ser a frase de abertura da categoria.
    const c = getHandCommentary(
      { heroHand: hands.KQo, heroAction: "Fold", position: "UTG", heroBB: 100, preflop: true, rating: "boa", betLevelFaced: 0 },
      "free",
    );
    expect(c!.lines[0]).toMatch(/fold limpo|nobre/i);
    expect(c!.lines[0]).not.toMatch(/3-bet|frente a 3-bet/i);
  });

  it("A5s de BTN: abre com backdoor", () => {
    const c = getHandCommentary(
      { heroHand: hands.A5s, heroAction: "Raise", position: "BTN", preflop: true, rating: "boa" },
      "free",
    );
    expect(c!.lines[0]).toMatch(/backdoor/i);
  });

  it("A7o off: fold quase sempre", () => {
    const c = getHandCommentary(
      { heroHand: hands.A7o, heroAction: "Fold", position: "CO", preflop: true },
      "free",
    );
    expect(c!.lines[0]).toMatch(/quase sempre fold|Ás alto|não é covardia/i);
  });

  it("mão com <2 cartas: null", () => {
    expect(getHandCommentary({ heroHand: [hands.AA[0]] }, "free")).toBeNull();
    expect(getHandCommentary({ heroHand: [] }, "free")).toBeNull();
  });

  it("pós-flop 83o: fold rápido", () => {
    const c = getHandCommentary(
      { heroHand: hands.eight3o, heroAction: "Fold", position: "BTN", preflop: false, rating: "boa" },
      "free",
    );
    expect(c!.lines[0]).toMatch(/pós-flop|desistir|sem Ás/i);
  });
});

describe("handCommentary — spots de resposta pré-flop", () => {
  it("3-bet de LP: punição ao roubo", () => {
    const c = getHandCommentary(
      { heroHand: hands.A5s, heroAction: "3-bet", position: "BTN", heroBB: 100, preflop: true, rating: "boa" },
      "free",
    );
    expect(c).not.toBeNull();
    expect(c!.lines[0]).toMatch(/pune o roubo|imprime|squeeze/i);
  });
  it("3-bet de UTG: declaração de guerra", () => {
    const c = getHandCommentary(
      { heroHand: hands.AKs, heroAction: "3-bet", position: "UTG", heroBB: 100, preflop: true, rating: "boa" },
      "technical",
    );
    expect(c).not.toBeNull();
    expect(c!.lines[0]).toMatch(/declaração de guerra|QQ\+, AK|~46% de equity/i);
  });
  it("4-bet: linha dos extremos", () => {
    const c = getHandCommentary(
      { heroHand: hands.AA, heroAction: "4-bet", position: "CO", heroBB: 100, preflop: true, rating: "boa" },
      "free",
    );
    expect(c).not.toBeNull();
    expect(c!.lines[0]).toMatch(/linha dos extremos|AA\/KK\/AK/i);
  });
  it("call de 3-bet: arma de posição (betLevelFaced 2)", () => {
    const c = getHandCommentary(
      { heroHand: hands.KQo, heroAction: "Call", position: "BTN", heroBB: 100, preflop: true, rating: "ok", betLevelFaced: 2 },
      "free",
    );
    expect(c).not.toBeNull();
    expect(c!.lines[0]).toMatch(/arma de posição|TT\/AJs\/KQs/i);
  });
  it("fold a 3-bet de early: aritmética (betLevelFaced 2)", () => {
    const c = getHandCommentary(
      { heroHand: hands.KJo, heroAction: "Fold", position: "UTG", heroBB: 100, preflop: true, rating: "boa", betLevelFaced: 2 },
      "technical",
    );
    expect(c).not.toBeNull();
    expect(c!.lines[0]).toMatch(/não é covardia|equity morta|66%|abre em ~100% do range/i);
  });
  it("stack curto muda a resposta", () => {
    const c = getHandCommentary(
      { heroHand: hands.A5s, heroAction: "3-bet", position: "BTN", heroBB: 12, preflop: true, rating: "boa" },
      "free",
    );
    expect(c!.lines[0]).toMatch(/stack curto|push\/fold/i);
  });
  it("REGRESSÃO (bug Allan): open-fold de K5s em UTG+1 NÃO fala de 3-bet", () => {
    // Cenário do print: UTG+1, K♥5♥, ninguém aumentou (betLevelFaced 0) e o
    // herói foldou a abertura. A narração jamais pode mencionar 3-bet.
    const K5s = [card(13, 2), card(5, 2)];
    for (const mode of ["free", "technical"] as const) {
      const c = getHandCommentary(
        { heroHand: K5s, heroAction: "Fold", position: "UTG1", heroBB: 100, preflop: true, rating: "boa", betLevelFaced: 0 },
        mode,
      );
      expect(c).not.toBeNull();
      expect(c!.lines[0]).not.toMatch(/3-bet|frente a 3-bet|KJo\/AQo/i);
    }
  });
  it("fold a um OPEN simples (betLevelFaced 1) não é fold-a-3bet", () => {
    // Enfrentou só uma abertura, não um 3-bet: sem narração de "vs 3-bet".
    const c = getHandCommentary(
      { heroHand: hands.KJo, heroAction: "Fold", position: "UTG", heroBB: 100, preflop: true, rating: "boa", betLevelFaced: 1 },
      "free",
    );
    expect(c!.lines[0]).not.toMatch(/frente a 3-bet|declaração de guerra/i);
  });
  it("herói 3-beta um open (Raise + betLevelFaced 1): narração de 3-bet", () => {
    // No jogo ao vivo o 3-bet do herói vem rotulado "Raise"; betLevelFaced 1
    // é o que revela que foi re-agressão por cima de uma abertura.
    const c = getHandCommentary(
      { heroHand: hands.AKs, heroAction: "Raise", position: "BTN", heroBB: 100, preflop: true, rating: "boa", betLevelFaced: 1 },
      "free",
    );
    expect(c!.lines[0]).toMatch(/pune o roubo|squeeze|imprime/i);
  });
  it("herói 4-beta um 3-bet (Raise + betLevelFaced 2): linha dos extremos", () => {
    const c = getHandCommentary(
      { heroHand: hands.AA, heroAction: "Raise", position: "CO", heroBB: 100, preflop: true, rating: "boa", betLevelFaced: 2 },
      "free",
    );
    expect(c!.lines[0]).toMatch(/linha dos extremos|AA\/KK\/AK/i);
  });
  it("pós-flop ignora o branch de resposta", () => {
    const c = getHandCommentary(
      { heroHand: hands.KJo, heroAction: "Call", position: "BTN", preflop: false, rating: "boa" },
      "free",
    );
    expect(c!.lines[0]).not.toMatch(/linha dos extremos|arma de posição/i);
    expect(c!.lines[0]).toMatch(/pós-flop|sem Ás/i);
  });
});

describe("handCommentary — voz do Coach", () => {
  it("Simples acerto = Coach", () => {
    expect(pickPro("free", "boa")).toBe("yuri");
    expect(pickPro("free", "ok")).toBe("yuri");
  });
  it("Simples erro = Coach", () => {
    expect(pickPro("free", "ruim")).toBe("negreanu");
    expect(pickPro("free", "imprecisa")).toBe("negreanu");
  });
  it("Técnico acerto = Coach (técnico)", () => {
    expect(pickPro("technical", "boa")).toBe("hellmuth");
  });
  it("Técnico erro = Coach (técnico)", () => {
    expect(pickPro("technical", "ruim")).toBe("polk");
    expect(pickPro("technical", "imprecisa")).toBe("polk");
  });
});

describe("handCommentary — nome bonito da mão", () => {
  it("AA: dois ases com naipes", () => {
    expect(handNamePretty(hands.AA)).toBe("A♣ A♦");
  });
  it("AKo: com label", () => {
    expect(handNamePretty(hands.AKo)).toBe("A♣ K♦ (AKo)");
  });
  it("T9s: com label suited", () => {
    expect(handNamePretty(hands.T9s)).toBe("T♣ 9♣ (T9s)");
  });
});

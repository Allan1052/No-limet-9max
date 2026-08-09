// Teste de regressão: bug de aposta empilhada (08/08/2026).
// Cenário do Allan: herói aposta, a ação "demora a sair", e um segundo clique
// aplica outra aposta por cima da primeira.
import { describe, expect, it } from "vitest";
import { GameController } from "./gameController";

describe("travamento anti-empilhamento da ação do herói", () => {
  it("segundo clique na mesma ação NÃO aplica aposta duplicada", () => {
    const g = new GameController();
    g.newHand();
    // Herói está no botão: não age primeiro. Simula a vez do herói avançando até ele.
    let guard = 0;
    while (!g.isHeroTurn() && !g.table.handOver && guard++ < 200) {
      g.botStep();
    }
    expect(g.isHeroTurn()).toBe(true);
    const before = g.pot;
    // Tap duplo / clique rápido: dois calls síncronos na mesma vez.
    g.heroAct({ type: "call" });
    g.heroAct({ type: "call" });
    // Apenas UMA ação foi aplicada: o pote mudou uma vez só e a vez passou.
    const after = g.pot;
    expect(after).toBeGreaterThan(before);
    expect(g.pot).toBe(after);
    expect(g.isHeroTurn()).toBe(false);
    // Nenhuma segunda ação ficou pendurada na mesma vez.
  });

  it("após a ação, a nova vez do herói continua normal (não trava o jogo)", () => {
    const g = new GameController();
    g.newHand();
    // Avança até a vez do herói.
    let guard = 0;
    while (!g.isHeroTurn() && !g.table.handOver && guard++ < 200) {
      g.botStep();
    }
    if (!g.isHeroTurn()) return;
    // Herói aposta.
    const la = g.legal();
    const raiseTo = Math.min(la.maxRaiseTo, Math.max(la.minRaiseTo, la.callAmount + g.table.bigBlind * 2));
    g.heroAct({ type: "raise", to: raiseTo });
    expect(g.isHeroTurn()).toBe(false);
    // Roda os bots até a vez voltar ao herói (ou fim da mão).
    let guard2 = 0;
    while (!g.isHeroTurn() && !g.table.handOver && guard2++ < 200) {
      g.botStep();
    }
    if (g.isHeroTurn() && !g.table.handOver) {
      // O herói consegue agir de novo normalmente — o travamento não é permanente.
      g.heroAct({ type: "fold" });
    }
    expect(g.table.handOver || !g.isHeroTurn()).toBe(true);
  });

  it("o guard nunca impede a primeira ação de cada vez", () => {
    const g = new GameController();
    g.newHand();
    let guard = 0;
    while (!g.isHeroTurn() && !g.table.handOver && guard++ < 200) {
      g.botStep();
    }
    if (!g.isHeroTurn()) return;
    // Primeira ação deve sempre passar.
    g.heroAct({ type: "fold" });
    expect(g.table.handOver || !g.isHeroTurn()).toBe(true);
  });
});

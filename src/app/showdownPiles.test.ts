// Regressão: no showdown, as apostas da rua não podem continuar pintadas na
// frente dos assentos (sobreposição de pilhas que o Allan viu no vídeo).
// Cenário idêntico ao do vídeo: hero faz raise no river, oponente responde
// all-in, e a mão vai ao showdown.
import { describe, it, expect } from "vitest";
import { GameController } from "./gameController";

function buildController(): GameController {
  const gc = new GameController();
  gc.configureTournament({ buyIn: 109, entrants: 500, stage: "inicio" });
  return gc;
}


describe("showdown sem pilhas sobrepostas", () => {
  it("após showdown, todas as apostas foram recolhidas ao pote", () => {
    const gc = buildController();
    let safety = 0;
    while (!gc.table.handOver && safety < 500) {
      safety++;
      if (gc.table.toAct === 0) {
        // Hero sempre faz raise (empurra dinheiro pro pote).
        const raiseTo = Math.min(200, gc.table.currentBet + 10);
        gc.heroAct({ type: "raise", to: raiseTo });
        continue;
      }
      gc.botStep();
    }
    // Mão encerrada: ninguém pode ter aposta na frente dos assentos.
    expect(gc.table.handOver).toBe(true);
    for (const p of gc.table.players) {
      expect(p.committed).toBe(0);
    }
    // O dinheiro recolhido soma exatamente o pote central.
    const pot = gc.table.players.reduce((s, p) => s + p.totalCommitted, 0);
    const resultTotal = Object.values(gc.table.result?.winningsBySeat ?? {}).reduce(
      (s, v) => s + v,
      0,
    );
    expect(resultTotal).toBe(pot);
  });

  it("all-in do oponente após raise do hero não deixa pilha dupla", () => {
    const gc = buildController();
    let heroRaised = false;
    let safety = 0;
    while (!gc.table.handOver && safety < 500) {
      safety++;
      if (gc.table.toAct === 0) {
        if (!heroRaised) {
          gc.heroAct({ type: "raise", to: Math.min(150, gc.table.currentBet + 20) });
          heroRaised = true;
          continue;
        }
        // Depois do raise, hero paga o all-in se precisar.
        const toCall = gc.table.currentBet - gc.table.players[0].committed;
        if (toCall > 0) gc.heroAct({ type: "call" });
        continue;
      }
      gc.botStep();
    }
    expect(gc.table.handOver).toBe(true);
    const leftover = gc.table.players.some((p) => p.committed > 0);
    expect(leftover).toBe(false);
  });
});

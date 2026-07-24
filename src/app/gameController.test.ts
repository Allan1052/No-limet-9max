import { describe, it, expect } from "vitest";
import { GameController } from "./gameController";

describe("reposição de jogadores (seat refill)", () => {
  it("cash/estágio normal: cadeira vazia recebe novo jogador", () => {
    const g = new GameController();
    // "Quebra" o bot do assento 1.
    g.table.players[1].stack = 0;
    g.table.players[1].status = "out";
    const oldName = g.table.players[1].name;

    g.newHand();

    // Foi reposto: tem fichas e um perfil ativo de novo.
    expect(g.table.players[1].stack).toBeGreaterThan(0);
    expect(g.table.players[1].profileId).toBeTruthy();
    // Stack próximo da média da mesa (não herdou 0).
    expect(g.table.players[1].stack).toBeGreaterThan(1000);
    void oldName;
  });

  it("mesa final: cadeira vazia NÃO é reposta — a mesa encolhe", () => {
    const g = new GameController();
    g.configureTournament({ buyIn: 11, entrants: 500, stage: "mesa_final" });
    g.table.players[1].stack = 0;
    g.table.players[1].status = "out";

    g.newHand();

    // Continua fora: sem reposição na mesa final.
    expect(g.table.players[1].stack).toBe(0);
  });

  it("herói eliminado encerra a sessão (não repõe o herói)", () => {
    const g = new GameController();
    g.table.players[0].stack = 0; // herói
    g.newHand();
    expect(g.phase).toBe("handOver");
    expect(g.message).toMatch(/eliminad/i);
  });
});

describe("torneio — campo, classificação e persistência", () => {
  it("mostra jogadores restantes, classificação e status de dinheiro", () => {
    const g = new GameController();
    g.configureTournament({ buyIn: 11, entrants: 2500, stage: "inicio" });
    const f = g.fieldStatus()!;
    expect(f.entrants).toBe(2500);
    expect(f.remaining).toBe(2500);
    expect(f.heroRank).toBeGreaterThanOrEqual(1);
    expect(f.heroRank).toBeLessThanOrEqual(2500);
    expect(f.inMoney).toBe(false); // longe do dinheiro no início
  });

  it("salvar e retomar preserva o torneio (stacks, campo, prêmios)", () => {
    const g = new GameController();
    g.configureTournament({ buyIn: 22, entrants: 1000, stage: "meio" });
    // Simula progresso: joga algumas mãos.
    for (let i = 0; i < 5 && !g.tournamentOver; i++) {
      g.newHand();
      let guard = 0;
      while (g.phase === "playing" && guard++ < 500) {
        if (g.isHeroTurn()) g.heroAct({ type: "fold" });
        else g.botStep();
      }
    }
    const snap = g.snapshot();
    expect(snap).toBeTruthy();
    const beforeField = g.tournament!.fieldRemaining;
    const beforeStack = g.table.players[0].stack;

    // Restaura num controlador novo.
    const g2 = new GameController();
    g2.restore(snap!);
    expect(g2.tournament!.entrants).toBe(1000);
    expect(g2.tournament!.fieldRemaining).toBeCloseTo(beforeField, 5);
    expect(g2.table.players[0].stack).toBe(beforeStack);
    expect(g2.tournament!.ladder).toEqual(g.tournament!.ladder);
  });

  it("herói bustado no torneio recebe posição final e status ITM", () => {
    const g = new GameController();
    g.configureTournament({ buyIn: 11, entrants: 500, stage: "mesa_final" });
    g.table.players[0].stack = 0; // herói busta
    g.newHand();
    expect(g.tournamentOver).toBe(true);
    const sum = g.tournamentSummary()!;
    expect(sum.finishPlace).toBeGreaterThanOrEqual(1);
    expect(sum.entrants).toBe(500);
    // Na mesa final de 500, bustar já está no dinheiro.
    expect(sum.inMoney).toBe(true);
    expect(sum.cash).toBeGreaterThan(0);
  });
});

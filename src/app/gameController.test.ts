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

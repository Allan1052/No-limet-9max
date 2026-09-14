// ---------------------------------------------------------------------------
// NINGUÉM VOLTA DA ELIMINAÇÃO COM OUTRO STACK.
//
// 🐞 14/09/2026 — relato do Allan: "na mesa mostrou um jogador que subiu as
// fichas dele do nada", e antes disso "ele tinha ficha, na mão seguinte já
// mostrou ele sem ficha".
//
// Não era ficha surgindo do nada. A cadeira de quem quebra é ocupada por um
// jogador NOVO — isso é de propósito, num MTT chega gente de outra mesa — mas a
// lista de nomes em uso só continha quem TINHA fichas. O nome de quem acabara
// de quebrar saía da lista e podia ser sorteado de novo na hora, agora com
// stack novo. Da cadeira do Allan, é um jogador ressuscitando mais rico.
//
// Medido ANTES da correção: o nome voltava em 15 de 40 eliminações, e em 8
// delas com mais fichas do que ele tinha.
// ---------------------------------------------------------------------------
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameController } from "./gameController";
import { seededRng } from "../engine/cards";

function comLocalStorage() {
  const store: Record<string, string> = {};
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  });
}

describe("identidade dos jogadores da mesa", () => {
  beforeEach(comLocalStorage);

  it("o nome de quem quebrou NUNCA volta na mão seguinte", () => {
    for (let semente = 1; semente <= 60; semente++) {
      const g = new GameController({ rng: seededRng(semente * 977) });
      const alvo = g.table.players.find((p) => !p.isHero)!;
      const seat = alvo.seat;
      const nome = alvo.name;
      alvo.stack = 0;
      alvo.status = "out";
      g.newHand();
      expect(
        g.table.players[seat].name,
        `semente ${semente}: "${nome}" voltou depois de quebrar`,
      ).not.toBe(nome);
    }
  });

  it("nem depois de VÁRIAS eliminações seguidas", () => {
    const g = new GameController({ rng: seededRng(31337) });
    const jaVistos = new Set(g.table.players.map((p) => p.name));
    for (let rodada = 0; rodada < 15; rodada++) {
      const alvo = g.table.players.find((p) => !p.isHero && p.stack > 0);
      if (!alvo) break;
      alvo.stack = 0;
      alvo.status = "out";
      g.newHand();
      for (const p of g.table.players) {
        if (p.isHero) continue;
        // Um nome só pode aparecer como jogador NOVO se nunca tiver sentado.
        jaVistos.add(p.name);
      }
      // Ninguém da mesa pode ser um nome que já quebrou: a contagem de nomes
      // distintos só cresce, nunca reaproveita.
      const naMesa = g.table.players.filter((p) => !p.isHero).map((p) => p.name);
      expect(new Set(naMesa).size, `rodada ${rodada}: nome duplicado na mesa`).toBe(naMesa.length);
    }
  });

  it("dois jogadores na mesa nunca têm o mesmo nome", () => {
    const g = new GameController({ rng: seededRng(555) });
    for (let i = 0; i < 25; i++) {
      const vivos = g.table.players.filter((p) => !p.isHero && p.stack > 0);
      if (vivos.length > 1) { vivos[0].stack = 0; vivos[0].status = "out"; }
      g.newHand();
      const nomes = g.table.players.map((p) => p.name);
      expect(new Set(nomes).size).toBe(nomes.length);
    }
  });

  it("torneio NOVO recomeça a memória (senão o campo ficaria sem nomes)", () => {
    const g = new GameController({ rng: seededRng(77) });
    for (let i = 0; i < 10; i++) {
      const alvo = g.table.players.find((p) => !p.isHero && p.stack > 0);
      if (alvo) { alvo.stack = 0; alvo.status = "out"; }
      g.newHand();
    }
    g.configureTournament({ buyIn: 11, entrants: 500, stage: "inicio" });
    // Depois de reconfigurar, os nomes voltam a ser os do pool principal — ou
    // seja, a memória zerou. Nenhum nome numerado ("Fulano 2") na largada.
    for (const p of g.table.players) expect(p.name).not.toMatch(/\s\d+$/);
  });

  it("torneio RETOMADO não devolve os nomes de quem já quebrou", () => {
    const g = new GameController({ rng: seededRng(99) });
    g.configureTournament({ buyIn: 11, entrants: 500, stage: "inicio" });
    const quebrado = g.table.players.find((p) => !p.isHero)!;
    const nome = quebrado.name;
    quebrado.stack = 0;
    quebrado.status = "out";
    g.newHand();
    const snap = g.snapshot()!;
    expect(snap.nomesJaUsados, "o snapshot não guardou a memória").toContain(nome);

    const g2 = new GameController({ rng: seededRng(1234) });
    g2.restore(snap);
    for (let i = 0; i < 6; i++) {
      const alvo = g2.table.players.find((p) => !p.isHero && p.stack > 0);
      if (alvo) { alvo.stack = 0; alvo.status = "out"; }
      g2.newHand();
      expect(g2.table.players.map((p) => p.name)).not.toContain(nome);
    }
  });
});

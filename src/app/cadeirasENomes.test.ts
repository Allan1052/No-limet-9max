// ---------------------------------------------------------------------------
// DUAS MENTIRAS QUE A MESA CONTAVA (relatadas pelo Allan em 14/09/2026).
//
// 1) "Mostrou Muralha numa mão, ele estava com vinte e poucos, e na mão
//    seguinte, sem ele ter ação nenhuma, mostrou que ele estava sem ficha."
//
//    Não perdeu ficha: MUDOU DE MESA. O balanceamento do torneio tira gente da
//    mesa do herói (ela está acima do tamanho-alvo) e marcava status "out" com
//    stack 0 — o mesmo estado de quem quebrou. A mesa então escrevia
//    "— sem fichas —" para alguém que segue vivo no torneio.
//
// 2) "Esse torneio é de cem jogador e os nome está tudo repetido: O Certinho,
//    O Certinho 2, O Certinho 3 na mesma mesa minha."
//
//    O sorteio de nome só olhava a lista DO ARQUÉTIPO sorteado. Esgotados os
//    quatro nomes de "tag", ele numerava — mesmo com dezenas de nomes livres
//    nos outros arquétipos.
// ---------------------------------------------------------------------------
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameController } from "./gameController";
import { seededRng } from "../engine/cards";
import { buildFieldSeats, pickReplacement } from "../bots/field";

function comLocalStorage() {
  const store: Record<string, string> = {};
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  });
}

describe("cadeira vazia × jogador sem fichas", () => {
  beforeEach(comLocalStorage);

  it("quem SAI da mesa no balanceamento deixa cadeira VAZIA, não 'sem fichas'", () => {
    let saiuAlguem = false;
    for (let semente = 1; semente <= 40; semente++) {
      const g = new GameController({ rng: seededRng(semente * 613) });
      g.configureTournament({ buyIn: 11, entrants: 1000, stage: "inicio" });
      // Campo encolhendo: 10 vivos em 2 mesas = alvo de 5 por mesa. A mesa do
      // herói está com 9 → o balanceamento TEM de mover gente para fora.
      g.tournament!.fieldRemaining = 10;
      g.tournament!.tables = 2;
      const antes = g.table.players.filter((p) => !p.isHero && p.stack > 0).length;
      g.newHand();
      const depois = g.table.players.filter((p) => !p.isHero && p.stack > 0).length;
      if (depois < antes) saiuAlguem = true;

      for (const p of g.table.players) {
        if (p.isHero || p.status !== "out") continue;
        // Se a cadeira NÃO está marcada como vazia, a mesa vai escrever
        // "— sem fichas —". Isso só pode valer para quem jogou esta mão e
        // zerou nela — nunca para quem apenas mudou de mesa.
        if (!p.cadeiraVazia) {
          expect(
            p.totalCommitted > 0,
            `semente ${semente}: "${p.name}" apareceu sem fichas sem ter jogado a mão`,
          ).toBe(true);
        }
      }
    }
    expect(saiuAlguem, "o balanceamento nunca tirou ninguém — teste não mediu nada").toBe(true);
  });

  it("cadeira ocupada de novo deixa de estar vazia", () => {
    const g = new GameController({ rng: seededRng(4242) });
    const alvo = g.table.players.find((p) => !p.isHero)!;
    alvo.stack = 0;
    alvo.status = "out";
    g.newHand();
    const agora = g.table.players[alvo.seat];
    if (agora.stack > 0) expect(agora.cadeiraVazia).toBe(false);
  });
});

describe("apelidos da mesa nunca repetem", () => {
  beforeEach(comLocalStorage);

  it("o campo inicial de um torneio de 100 sai sem apelido numerado", () => {
    for (let semente = 1; semente <= 30; semente++) {
      const seats = buildFieldSeats(11, 100, seededRng(semente * 31));
      const nomes = seats.map((s) => s.name);
      expect(new Set(nomes).size, `semente ${semente}: nome repetido`).toBe(nomes.length);
      const numerados = nomes.filter((n) => /\s\d+$/.test(n));
      expect(numerados, `semente ${semente}: apelido numerado`).toEqual([]);
    }
  });

  it("128 reposições seguidas continuam sem numerar", () => {
    const rng = seededRng(909);
    const usados = new Set<string>();
    for (let i = 0; i < 128; i++) {
      const rep = pickReplacement(11, usados, rng);
      expect(usados.has(rep.name), `reposição ${i}: "${rep.name}" repetiu`).toBe(false);
      expect(rep.name, `reposição ${i} numerou cedo demais`).not.toMatch(/\s\d+$/);
      usados.add(rep.name);
    }
  });

  it("o nome continua combinando com o estilo do bot", () => {
    // O apelido é dica de estilo: se pegamos o nome emprestado de outro
    // arquétipo, o PERFIL vai junto — senão "Muralha" jogaria como maluco.
    const rng = seededRng(17);
    const usados = new Set<string>();
    const porArquetipo: Record<string, string[]> = {};
    for (let i = 0; i < 100; i++) {
      const rep = pickReplacement(11, usados, rng);
      usados.add(rep.name);
      (porArquetipo[rep.profileId] ??= []).push(rep.name);
    }
    // Nenhum nome aparece em dois arquétipos diferentes.
    const vistos = new Map<string, string>();
    for (const [arq, nomes] of Object.entries(porArquetipo)) {
      for (const n of nomes) {
        expect(vistos.get(n) ?? arq).toBe(arq);
        vistos.set(n, arq);
      }
    }
  });

  it("um torneio inteiro de 100 jogadores: nunca dois iguais na mesa do herói", () => {
    const g = new GameController({ rng: seededRng(2026) });
    g.configureTournament({ buyIn: 11, entrants: 100, stage: "inicio" });
    for (let mao = 0; mao < 120; mao++) {
      const vivos = g.table.players.filter((p) => !p.isHero && p.stack > 0);
      if (vivos.length > 1 && mao % 3 === 0) { vivos[0].stack = 0; vivos[0].status = "out"; }
      g.newHand();
      const nomes = g.table.players.filter((p) => p.stack > 0).map((p) => p.name);
      expect(new Set(nomes).size, `mão ${mao}: nome repetido na mesa`).toBe(nomes.length);
    }
  });
});

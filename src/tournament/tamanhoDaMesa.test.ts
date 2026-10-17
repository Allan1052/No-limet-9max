// ---------------------------------------------------------------------------
// 8 OU 9 CADEIRAS — e o motor tem de obedecer.
//
// O Allan pediu para padronizar em 8. A medição mostrou que ele joga PokerStars,
// onde os MTTs regulares seguem 9-max e o 8-max aparece em Turbo/PKO — e 50,3%
// do volume dele é turbo. Fixar em 8 erraria nos regulares; por isso virou
// escolha. Estes testes guardam que a escolha chega até o feltro.
// ---------------------------------------------------------------------------
import { beforeEach, describe, expect, it } from "vitest";
import { GameController } from "../app/gameController";
import { seededRng } from "../engine/cards";
import { tablePositions } from "../ranges/positions";
import {
  TAMANHOS,
  TAMANHO_PADRAO,
  botsNaMesa,
  ehTamanhoValido,
  ondeSeUsa,
  rotuloDoTamanho,
  salvarTamanhoPreferido,
  tamanhoPreferido,
} from "./tamanhoDaMesa";

class MemStorage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}
beforeEach(() => {
  (globalThis as unknown as { localStorage: MemStorage }).localStorage = new MemStorage();
});

describe("A escolha", () => {
  it("só aceita 8 ou 9", () => {
    expect(TAMANHOS).toEqual([8, 9]);
    expect(ehTamanhoValido(8)).toBe(true);
    expect(ehTamanhoValido(9)).toBe(true);
    for (const ruim of [6, 10, 0, -1, null, undefined, "9", NaN]) {
      expect(ehTamanhoValido(ruim)).toBe(false);
    }
  });

  it("o padrão é 9 — os MTTs regulares do PokerStars, onde ele joga", () => {
    expect(TAMANHO_PADRAO).toBe(9);
    expect(tamanhoPreferido()).toBe(9);
  });

  it("lembra a escolha, e ignora lixo no storage", () => {
    salvarTamanhoPreferido(8);
    expect(tamanhoPreferido()).toBe(8);
    localStorage.setItem("cof-mesa-tamanho-v1", "7");
    expect(tamanhoPreferido()).toBe(TAMANHO_PADRAO);
  });

  it("o herói ocupa um assento — o resto é bot", () => {
    expect(botsNaMesa(9)).toBe(8);
    expect(botsNaMesa(8)).toBe(7);
  });

  it("diz onde cada formato é a realidade, sem inventar", () => {
    expect(ondeSeUsa(8)).toContain("GGPoker");
    expect(ondeSeUsa(8)).toContain("Turbo");
    expect(ondeSeUsa(9)).toContain("PokerStars");
    // frase pronta, com a preposição certa — "como em os MTTs" saiu na tela
    for (const n of TAMANHOS) {
      expect(ondeSeUsa(n).startsWith("Como n")).toBe(true);
      expect(ondeSeUsa(n)).not.toContain("em os");
    }
    expect(rotuloDoTamanho(8)).toBe("8-max");
  });
});

describe("O motor obedece a escolha", () => {
  for (const n of TAMANHOS) {
    it(`${n}-max senta exatamente ${n} jogadores`, () => {
      const g = new GameController({ rng: seededRng(4242) });
      g.configureTournament({ buyIn: 109, entrants: 300, stage: "inicio", tamanhoDaMesa: n });
      expect(g.table.players).toHaveLength(n);
      expect(g.table.players.filter((p) => p.isHero)).toHaveLength(1);
      expect(g.cadeirasDaMesa).toBe(n);
    });
  }

  it("sem escolher, cai no padrão de 9", () => {
    const g = new GameController({ rng: seededRng(1) });
    g.configureTournament({ buyIn: 109, entrants: 300, stage: "inicio" });
    expect(g.table.players).toHaveLength(TAMANHO_PADRAO);
  });

  it("a mesa final se forma no tamanho da mesa, não num 9 fixo", () => {
    const g = new GameController({ rng: seededRng(7) });
    // começa já na mesa final: o campo restante é o tamanho da mesa
    g.configureTournament({ buyIn: 109, entrants: 8, stage: "mesa_final", tamanhoDaMesa: 8 });
    expect(g.tournament!.finalTableFormed).toBe(true);
  });

  it("o campo é dividido pelo tamanho certo de mesa", () => {
    const g8 = new GameController({ rng: seededRng(11) });
    g8.configureTournament({ buyIn: 109, entrants: 800, stage: "inicio", tamanhoDaMesa: 8 });
    const g9 = new GameController({ rng: seededRng(11) });
    g9.configureTournament({ buyIn: 109, entrants: 800, stage: "inicio", tamanhoDaMesa: 9 });
    // mesmo campo, mesas menores ⇒ MAIS mesas
    expect(g8.tournament!.tables!).toBeGreaterThan(g9.tournament!.tables!);
    expect(g8.tournament!.tables).toBe(Math.ceil(g8.tournament!.fieldRemaining / 8));
  });
});

describe("Retomar não pode trocar o tamanho da mesa", () => {
  it("um torneio 8-max volta 8-max", () => {
    const g = new GameController({ rng: seededRng(31) });
    g.configureTournament({ buyIn: 5, entrants: 300, stage: "inicio", tamanhoDaMesa: 8 });
    const snap = g.snapshot()!;
    expect(snap.tamanhoDaMesa).toBe(8);

    const outro = new GameController({ rng: seededRng(99) });
    outro.restore(snap);
    expect(outro.cadeirasDaMesa).toBe(8);
    expect(outro.table.players).toHaveLength(8);
  });

  it("save ANTIGO, sem o campo, é tratado como 9-max (o que ele era)", () => {
    const g = new GameController({ rng: seededRng(33) });
    g.configureTournament({ buyIn: 5, entrants: 300, stage: "inicio", tamanhoDaMesa: 9 });
    const snap = g.snapshot()!;
    delete (snap as { tamanhoDaMesa?: number }).tamanhoDaMesa;

    const outro = new GameController({ rng: seededRng(1) });
    outro.restore(snap);
    expect(outro.cadeirasDaMesa).toBe(TAMANHO_PADRAO);
  });
});

describe("As posições se ajustam sozinhas — era o que barateava tudo", () => {
  it("com 8 jogadores a posição mais early (UTG) some, e começa em UTG1", () => {
    const nove = Object.values(tablePositions([0,1,2,3,4,5,6,7,8], 0));
    const oito = Object.values(tablePositions([0,1,2,3,4,5,6,7], 0));
    expect(nove).toContain("UTG");
    expect(oito).not.toContain("UTG");
    expect(oito).toContain("UTG1");
  });

  it("os dois tamanhos mantêm SB, BB, BTN e CO — o eixo das ranges", () => {
    for (const seats of [[0,1,2,3,4,5,6,7], [0,1,2,3,4,5,6,7,8]]) {
      const pos = Object.values(tablePositions(seats, 0));
      for (const p of ["SB", "BB", "BTN", "CO"]) expect(pos).toContain(p);
      expect(new Set(pos).size).toBe(seats.length); // nenhuma posição repetida
    }
  });
});

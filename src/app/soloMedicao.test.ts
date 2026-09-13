// ---------------------------------------------------------------------------
// A REGRA DURA DO "JOGAR SOZINHO", testada no motor de verdade.
//
// O número que o Allan vai usar para julgar o próprio jogo não pode aceitar uma
// espiada. Aqui a gente joga mãos no GameController com o botão ligado, com ele
// desligado, e ligando no MEIO da mão — e exige que só o jogo realmente às
// cegas conte como às cegas.
// ---------------------------------------------------------------------------
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameController } from "./gameController";
import { seededRng } from "../engine/cards";
import { lerPlacarSozinho, zerarPlacarSozinho } from "../train/soloMode";

function jogarUmaMao(g: GameController): void {
  let guarda = 0;
  while (g.phase === "playing" && guarda++ < 60) {
    if (g.isHeroTurn()) {
      const la = g.legal();
      if (la.canCheck) g.heroAct({ type: "check" });
      else g.heroAct({ type: "fold" });
    } else g.botStep();
  }
}

describe("regra dura do Jogar sozinho", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    });
    zerarPlacarSozinho();
  });

  it("com o botão LIGADO, as decisões contam como sozinho", () => {
    const g = new GameController({ rng: seededRng(7) });
    g.setDicasLigadas(false);
    for (let i = 0; i < 12; i++) { g.newHand(); jogarUmaMao(g); }
    const p = lerPlacarSozinho();
    expect(p.sozinho.total).toBeGreaterThan(0);
    expect(p.comDica.total).toBe(0);
  });

  it("com as dicas na tela, NADA conta como sozinho", () => {
    const g = new GameController({ rng: seededRng(7) });
    g.setDicasLigadas(true);
    for (let i = 0; i < 12; i++) { g.newHand(); jogarUmaMao(g); }
    const p = lerPlacarSozinho();
    expect(p.sozinho.total).toBe(0);
    expect(p.comDica.total).toBeGreaterThan(0);
  });

  it("ESPIOU NO MEIO DA MÃO: a mão INTEIRA deixa de contar como sozinho", () => {
    const g = new GameController({ rng: seededRng(11) });
    g.setDicasLigadas(false);
    g.newHand();
    // Anda até a primeira vez do herói e liga a dica ANTES de agir.
    let guarda = 0;
    while (!g.isHeroTurn() && g.phase === "playing" && guarda++ < 40) g.botStep();
    g.setDicasLigadas(true);
    g.setDicasLigadas(false); // desligou de novo — não adianta: já viu
    jogarUmaMao(g);
    expect(lerPlacarSozinho().sozinho.total).toBe(0);
    expect(lerPlacarSozinho().comDica.total).toBeGreaterThan(0);
  });

  it("a contaminação vale só para a mão em que houve: a próxima volta a contar", () => {
    const g = new GameController({ rng: seededRng(11) });
    g.setDicasLigadas(false);
    g.newHand();
    g.setDicasLigadas(true);
    g.setDicasLigadas(false);
    jogarUmaMao(g);
    const depoisDaSuja = lerPlacarSozinho().sozinho.total;
    g.newHand(); // mão nova, limpa
    jogarUmaMao(g);
    expect(lerPlacarSozinho().sozinho.total).toBeGreaterThan(depoisDaSuja);
  });

  it("o placar da SESSÃO só conta o que foi às cegas", () => {
    const g = new GameController({ rng: seededRng(3) });
    g.setDicasLigadas(true);
    for (let i = 0; i < 6; i++) { g.newHand(); jogarUmaMao(g); }
    expect(g.sessaoSozinho.total).toBe(0);
    g.setDicasLigadas(false);
    for (let i = 0; i < 6; i++) { g.newHand(); jogarUmaMao(g); }
    expect(g.sessaoSozinho.total).toBeGreaterThan(0);
    expect(g.sessaoSozinho.certas).toBeLessThanOrEqual(g.sessaoSozinho.total);
  });

  it("cada decisão avaliada carrega a marca, para as telas não terem de adivinhar", () => {
    const g = new GameController({ rng: seededRng(5) });
    g.setDicasLigadas(false);
    g.newHand();
    jogarUmaMao(g);
    expect(g.feedback.length).toBeGreaterThan(0);
    for (const it of g.feedback) expect(it.semDica).toBe(true);
  });
});

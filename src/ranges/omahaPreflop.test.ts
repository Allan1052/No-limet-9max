import { describe, it, expect } from "vitest";
import { cardFromString } from "../engine/cards";
import { omahaPreflopDecision, omahaPreflopScore } from "./omahaPreflop";
import { BASELINE_PROFILE } from "../bots/profiles";
import type { Position } from "./types";

function hand(cards: string[]) {
  return cards.map(cardFromString);
}

function decide(
  cards: string[],
  heroPosition: Position,
  opts: Partial<Parameters<typeof omahaPreflopDecision>[0]> = {},
) {
  return omahaPreflopDecision({
    heroPosition,
    hand: hand(cards),
    effectiveBB: 100,
    profile: BASELINE_PROFILE,
    variant: "omaha",
    ...opts,
  });
}

// Mãos de referência.
const AAKK_DS = ["As", "Ac", "Ks", "Kc"]; // par duplo, double-suited, nut flush
const JT98_DS = ["Js", "Th", "9s", "8h"]; // rundown premium double-suited
const TRASH = ["8c", "5d", "3s", "2h"]; // sem par, rainbow, desconectada

describe("Omaha pré-flop — força de mão ordena corretamente", () => {
  it("AAKK ds > JT98 ds > lixo", () => {
    const a = omahaPreflopScore(hand(AAKK_DS));
    const b = omahaPreflopScore(hand(JT98_DS));
    const c = omahaPreflopScore(hand(TRASH));
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
  });
});

describe("Omaha pré-flop — abertura (RFI)", () => {
  it("mão premium abre de UTG", () => {
    expect(decide(AAKK_DS, "UTG").action).toBe("raise");
  });

  it("rundown premium abre do CO", () => {
    expect(decide(JT98_DS, "CO").action).toBe("raise");
  });

  it("lixo folda até do BTN", () => {
    expect(decide(TRASH, "BTN").action).toBe("fold");
  });

  // A regressão principal: antes, UTG1/LJ/HJ foldavam 100% (posição faltante).
  it("premium abre de TODAS as 8 cadeiras que abrem (inclui UTG1/LJ/HJ)", () => {
    const seats: Position[] = ["UTG", "UTG1", "MP", "LJ", "HJ", "CO", "BTN", "SB"];
    for (const s of seats) {
      const d = decide(AAKK_DS, s);
      expect(["raise", "jam"]).toContain(d.action);
    }
  });

  it("BB fecha a ação sem limper → check (call de graça)", () => {
    const d = decide(AAKK_DS, "BB");
    expect(d.action).toBe("call");
    expect(d.sizeBB).toBe(0);
  });

  it("abertura de PLO ≈ pote (3.5bb) e sobe +1bb por limper", () => {
    expect(decide(AAKK_DS, "CO").sizeBB).toBeCloseTo(3.5, 5);
    expect(decide(AAKK_DS, "CO", { limpers: 2 }).sizeBB).toBeCloseTo(5.5, 5);
  });
});

describe("Omaha pré-flop — enfrentando uma abertura", () => {
  it("premium dá 3-bet por valor", () => {
    const d = decide(AAKK_DS, "BTN", { raiserPosition: "CO", openSizeBB: 7 });
    expect(d.action).toBe("3bet");
  });

  it("lixo folda contra a abertura", () => {
    const d = decide(TRASH, "BTN", { raiserPosition: "CO", openSizeBB: 7 });
    expect(d.action).toBe("fold");
  });

  it("mão jogável em posição continua (não folda)", () => {
    const d = decide(["Kc", "Qc", "Jh", "Th"], "BTN", { raiserPosition: "CO", openSizeBB: 7 });
    expect(d.action).not.toBe("fold");
  });
});

describe("Omaha pré-flop — enfrentando um 3-bet (herói abriu)", () => {
  it("mão de topo dá 4-bet por valor", () => {
    const d = decide(AAKK_DS, "CO", { raiserPosition: "BTN", openSizeBB: 7, threeBet: true });
    expect(d.action).toBe("3bet"); // representa 4-bet
  });

  it("lixo folda contra o 3-bet", () => {
    const d = decide(TRASH, "CO", { raiserPosition: "BTN", openSizeBB: 7, threeBet: true });
    expect(d.action).toBe("fold");
  });
});

describe("Omaha pré-flop — largura de range coerente (não folda tudo)", () => {
  function openFraction(pos: Position): number {
    let open = 0;
    const N = 3000;
    // gerador determinístico simples para o teste ser estável.
    let seed = 12345;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let i = 0; i < N; i++) {
      const set = new Set<number>();
      while (set.size < 4) set.add(Math.floor(rnd() * 52));
      const d = omahaPreflopDecision({
        heroPosition: pos,
        hand: [...set],
        effectiveBB: 100,
        profile: BASELINE_PROFILE,
        variant: "omaha",
      });
      if (d.action === "raise" || d.action === "jam") open++;
    }
    return open / N;
  }

  it("BTN abre ~30-60% (largo), UTG bem mais apertado", () => {
    const btn = openFraction("BTN");
    const utg = openFraction("UTG");
    expect(btn).toBeGreaterThan(0.3);
    expect(btn).toBeLessThan(0.6);
    expect(utg).toBeGreaterThan(0.05);
    expect(utg).toBeLessThan(btn); // early position abre menos que o botão
  });
});

describe("Omaha pré-flop — stack curto (push/fold)", () => {
  it("premium dá all-in com stack raso", () => {
    expect(decide(AAKK_DS, "CO", { effectiveBB: 10 }).action).toBe("jam");
  });

  it("lixo folda com stack raso", () => {
    expect(decide(TRASH, "UTG", { effectiveBB: 10 }).action).toBe("fold");
  });
});

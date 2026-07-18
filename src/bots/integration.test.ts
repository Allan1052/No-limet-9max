import { describe, it, expect } from "vitest";
import { seededRng } from "../engine/cards";
import { createTable, startHand, applyAction, freshShuffledDeck, moveButton } from "../game/engine";
import type { TableState } from "../game/state";
import { botPreflopAction, botPostflopActionPlaceholder } from "./preflopBot";
import { PROFILES } from "./profiles";

// Mesa 9-max: herói no assento 0 + os 8 perfis nos demais assentos.
function makeNineMax(stack = 3000): TableState {
  const seats = [
    { name: "Você", stack, isHero: true },
    ...PROFILES.map((p) => ({ name: p.name, stack, profileId: p.id })),
  ];
  return createTable({ smallBlind: 25, bigBlind: 50 }, seats, 0);
}

function playHand(t: TableState): void {
  let guard = 0;
  while (!t.handOver) {
    if (guard++ > 2000) throw new Error("mão não terminou");
    const seat = t.toAct;
    const action = t.street === "preflop"
      ? botPreflopAction(t, seat)
      : botPostflopActionPlaceholder(t, seat);
    applyAction(t, action);
  }
}

describe("integração — mesa 9-max com os 8 perfis", () => {
  it("joga uma mão completa e mostra o log", () => {
    const t = makeNineMax();
    startHand(t, freshShuffledDeck(seededRng(42)));
    playHand(t);
    expect(t.handOver).toBe(true);

    // Imprime o desenrolar da mão (visível ao rodar os testes).
    console.log("\n===== MÃO DE EXEMPLO (9-max, blinds 25/50) =====");
    for (const line of t.log) console.log("  " + line);
    const total = t.players.reduce((s, p) => s + p.stack, 0);
    expect(total).toBe(3000 * 9);
  });

  it("roda 300 mãos com os 8 perfis sem quebrar e conservando fichas", () => {
    const t = makeNineMax();
    const START = 3000 * 9;
    for (let h = 0; h < 300; h++) {
      if (t.players.filter((p) => p.stack > 0).length < 2) break;
      startHand(t, freshShuffledDeck(seededRng(5000 + h)));
      playHand(t);
      const total = t.players.reduce((s, p) => s + p.stack, 0);
      expect(total).toBe(START);
      moveButton(t);
    }
  });

  it("perfis têm VPIP distintos: o maníaco entra em mais potes que o TAG preciso", () => {
    // Mede quantas vezes cada perfil NÃO foldou no pré-flop, em muitas mãos.
    const entered: Record<string, number> = {};
    const dealt: Record<string, number> = {};
    for (const p of PROFILES) {
      entered[p.id] = 0;
      dealt[p.id] = 0;
    }

    for (let h = 0; h < 400; h++) {
      const t = makeNineMax();
      startHand(t, freshShuffledDeck(seededRng(9000 + h)));
      // Só o pré-flop: conta quem colocou fichas voluntariamente.
      const committedBefore = t.players.map((p) => p.committed);
      let guard = 0;
      while (!t.handOver && t.street === "preflop") {
        if (guard++ > 200) break;
        const seat = t.toAct;
        applyAction(t, botPreflopAction(t, seat));
      }
      for (let s = 1; s < t.players.length; s++) {
        const p = t.players[s];
        const id = p.profileId!;
        dealt[id]++;
        // VPIP: colocou fichas voluntariamente (além do blind forçado). As
        // fichas apostadas permanecem em `committed` mesmo se depois foldar.
        if (p.committed > committedBefore[s]) entered[id]++;
      }
    }

    const vpip = (id: string) => entered[id] / dealt[id];
    // Kenney (maníaco) deve entrar em bem mais potes que Chidwick (TAG preciso).
    expect(vpip("kenney")).toBeGreaterThan(vpip("chidwick"));
    // E o hiperagressivo (Astedt) também mais que o TAG preciso.
    expect(vpip("astedt")).toBeGreaterThan(vpip("chidwick"));
  });
});

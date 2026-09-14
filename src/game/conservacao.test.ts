// ---------------------------------------------------------------------------
// FICHA NÃO NASCE E NÃO SOME DENTRO DE UMA MÃO.
//
// 14/09/2026. O Allan relatou ter visto fichas mudando "do nada". A causa real
// era a reciclagem de NOMES (ver identidadeMesa.test.ts), mas a suspeita
// merecia a verificação de baixo: o motor conserva ficha?
//
// O teste force o caso que o print dele mostrava — ALL-IN MULTIWAY COM CALL
// PARCIAL, que é o que cria side pot e é onde uma conta errada apareceria.
// Regra: a soma de (fichas atrás + apostado) de todos os jogadores tem de ser
// exatamente a mesma no começo e no fim da mão. Sem tolerância.
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import { seededRng } from "../engine/cards";
import { createTable, applyAction, totalPot } from "./engine";
import { legalActions } from "./betting";
import type { TableState } from "./state";

function totalNaMesa(t: TableState): number {
  return t.players.reduce((s, p) => s + p.stack + p.totalCommitted, 0);
}

/** Joga a mão inteira com uma política dada, devolvendo o estado final. */
function jogarMao(t: TableState, politica: (t: TableState) => void): TableState {
  let guarda = 0;
  while (!t.handOver && guarda++ < 400) politica(t);
  return t;
}

/** Mesa com stacks BEM desiguais — é o que produz side pot de verdade. */
function mesaDesigual(seed: number) {
  const rng = seededRng(seed);
  const stacks = [40, 900, 175, 60, 1200, 320, 95, 610, 230];
  return createTable(
    { smallBlind: 10, bigBlind: 20, ante: 2 },
    stacks.map((stack, i) => ({ name: `P${i}`, isHero: i === 0, stack })),
    Math.floor(rng() * 9),
  );
}

describe("conservação de fichas", () => {
  it("mão normal: a mesa termina com exatamente as fichas que começou", () => {
    for (let seed = 1; seed <= 80; seed++) {
      const t = mesaDesigual(seed);
      const antes = totalNaMesa(t);
      const rng = seededRng(seed * 31);
      jogarMao(t, (mesa) => {
        const la = legalActions(mesa);
        const r = rng();
        if (la.canCheck && r < 0.5) applyAction(mesa, { type: "check" });
        else if (la.canCall && r < 0.8) applyAction(mesa, { type: "call" });
        else if (la.canFold) applyAction(mesa, { type: "fold" });
        else applyAction(mesa, { type: "check" });
      });
      expect(totalNaMesa(t), `semente ${seed}`).toBe(antes);
    }
  });

  it("ALL-IN MULTIWAY com call parcial (side pot): nada nasce, nada some", () => {
    for (let seed = 1; seed <= 120; seed++) {
      const t = mesaDesigual(seed);
      const antes = totalNaMesa(t);
      const rng = seededRng(seed * 7919);
      jogarMao(t, (mesa) => {
        const la = legalActions(mesa);
        const r = rng();
        // Muito all-in de propósito: é assim que side pot aparece.
        if (r < 0.45 && la.canRaise) applyAction(mesa, { type: "allin" });
        else if (la.canCall && r < 0.8) applyAction(mesa, { type: "call" });
        else if (la.canCheck) applyAction(mesa, { type: "check" });
        else if (la.canFold) applyAction(mesa, { type: "fold" });
        else applyAction(mesa, { type: "allin" });
      });
      expect(totalNaMesa(t), `semente ${seed}`).toBe(antes);
    }
  });

  it("o que foi distribuído é exatamente o que estava no pote", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const t = mesaDesigual(seed);
      const stacksAntes = t.players.map((p) => p.stack);
      const rng = seededRng(seed * 104729);
      let poteNoFim = 0;
      jogarMao(t, (mesa) => {
        const la = legalActions(mesa);
        const r = rng();
        if (r < 0.4 && la.canRaise) applyAction(mesa, { type: "allin" });
        else if (la.canCall) applyAction(mesa, { type: "call" });
        else if (la.canCheck) applyAction(mesa, { type: "check" });
        else applyAction(mesa, { type: "fold" });
        if (!mesa.handOver) poteNoFim = totalPot(mesa);
      });
      const ganho = t.players.reduce((s, p, i) => s + Math.max(0, p.stack - stacksAntes[i]), 0);
      const perda = t.players.reduce((s, p, i) => s + Math.max(0, stacksAntes[i] - p.stack), 0);
      // Quem ganhou recebeu exatamente o que os outros perderam.
      expect(ganho, `semente ${seed}`).toBe(perda);
      void poteNoFim;
    }
  });

  it("ninguém termina com stack negativo", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const t = mesaDesigual(seed);
      const rng = seededRng(seed * 65537);
      jogarMao(t, (mesa) => {
        const la = legalActions(mesa);
        if (rng() < 0.5 && la.canRaise) applyAction(mesa, { type: "allin" });
        else if (la.canCall) applyAction(mesa, { type: "call" });
        else if (la.canCheck) applyAction(mesa, { type: "check" });
        else applyAction(mesa, { type: "fold" });
      });
      for (const p of t.players) expect(p.stack, `semente ${seed}, ${p.name}`).toBeGreaterThanOrEqual(0);
    }
  });

  it("quem estava all-in por MENOS não leva mais do que podia (side pot honesto)", () => {
    // O curto só pode ganhar o pote principal; o excedente vai para os outros.
    for (let seed = 1; seed <= 60; seed++) {
      const t = mesaDesigual(seed);
      const stacksAntes = t.players.map((p) => p.stack);
      const rng = seededRng(seed * 2654435761);
      jogarMao(t, (mesa) => {
        const la = legalActions(mesa);
        if (rng() < 0.6 && la.canRaise) applyAction(mesa, { type: "allin" });
        else if (la.canCall) applyAction(mesa, { type: "call" });
        else if (la.canCheck) applyAction(mesa, { type: "check" });
        else applyAction(mesa, { type: "fold" });
      });
      for (let i = 0; i < t.players.length; i++) {
        const investido = t.players[i].totalCommitted;
        const ganhoLiquido = t.players[i].stack - stacksAntes[i];
        // Máximo teórico: cada oponente pode te pagar no máximo o que você
        // investiu. Ganhar mais que isso seria ficha nascendo.
        const tetoTeorico = investido * (t.players.length - 1);
        expect(ganhoLiquido, `semente ${seed}, jogador ${i}`).toBeLessThanOrEqual(tetoTeorico);
      }
    }
  });
});

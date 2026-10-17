// Sob demanda: joga torneios 8-max INTEIROS e compara com 9-max.
//   CF_REGUA=1 npx vitest run src/sim/_oitoMaxRun.test.ts
import { describe, it, expect } from "vitest";
import { GameController } from "../app/gameController";
import { seededRng } from "../engine/cards";
import type { Action } from "../game/engine";

function acao(g: GameController): Action {
  const la = g.legal();
  const adv = g.computeHeroAdvice();
  const a = adv?.action ?? (la.canCheck ? "check" : "fold");
  if (a === "fold") return la.canCheck ? { type: "check" } : { type: "fold" };
  if (a === "check") return la.canCheck ? { type: "check" } : { type: "fold" };
  if (a === "call") return la.canCall ? { type: "call" } : la.canCheck ? { type: "check" } : { type: "fold" };
  if (!la.canRaise) return la.canCall ? { type: "call" } : la.canCheck ? { type: "check" } : { type: "fold" };
  const to = Math.max(la.minRaiseTo, Math.min(la.maxRaiseTo, g.suggestedRaiseTo() ?? la.minRaiseTo));
  return to >= la.maxRaiseTo ? { type: "allin" } : { type: "raise", to };
}

describe("torneio 8-max inteiro", () => {
  it("roda do começo ao fim, igual ao 9-max", () => {
    const L: string[] = ["tam  torneios  maos/torn  dec/torn  terminou%  posicoes vistas"];
    for (const tam of [8, 9] as const) {
      let maos = 0, dec = 0, fim = 0;
      const posicoes = new Set<string>();
      const T = 6;
      for (let t = 0; t < T; t++) {
        const g = new GameController({ rng: seededRng(777 + t * 101) });
        g.configureTournament({ buyIn: 109, entrants: 300, stage: "inicio", tamanhoDaMesa: tam });
        expect(g.table.players).toHaveLength(tam);
        g.newHand();
        for (let p = 0; p < 40_000; p++) {
          if (g.tournamentOver) { fim++; break; }
          if (g.phase === "handOver") { g.newHand(); maos++; continue; }
          if (!g.isHeroTurn()) { g.botStep(); continue; }
          const antes = g.feedback.length;
          g.heroAct(acao(g));
          for (let i = antes; i < g.feedback.length; i++) dec++;
          const adv = g.computeHeroAdvice();
          if (adv?.heroPosition) posicoes.add(adv.heroPosition);
        }
      }
      L.push([
        String(tam).padStart(3), String(T).padStart(10),
        (maos / T).toFixed(1).padStart(11), (dec / T).toFixed(1).padStart(10),
        `${Math.round(fim / T * 100)}%`.padStart(10),
        "  " + [...posicoes].sort().join(" "),
      ].join(""));
    }
    console.log("\n" + L.join("\n") + "\n");
  }, 900_000);
});

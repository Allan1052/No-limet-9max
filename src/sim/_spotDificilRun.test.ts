// Execução sob demanda: QUANTOS SPOTS DIFÍCEIS existem de verdade, cruzando a
// régua de acumulação com a régua de importância (importanciaDaMao.ts), e por
// RUA. É o que decide se o alvo pode ser filtrado sem nunca encher.
//   CF_REGUA=1 npx vitest run src/sim/_spotDificilRun.test.ts
import { describe, it } from "vitest";
import { GameController } from "../app/gameController";
import { seededRng } from "../engine/cards";
import type { Action } from "../game/engine";
import type { Importancia } from "../feedback/importanciaDaMao";

function acaoDoPadrao(g: GameController): Action {
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

describe("quantos spots difíceis existem", () => {
  it("cruza acumulação × importância × rua", () => {
    const T = Number(process.env.CF_TORNEIOS || 10);
    const porNivel: Record<Importancia, number> = { obvia: 0, interessante: 0, excepcional: 0 };
    const acumPorNivel: Record<Importancia, number> = { obvia: 0, interessante: 0, excepcional: 0 };
    const porRua: Record<string, number> = {};
    const dificilPorRua: Record<string, number> = {};
    const sinais: Record<string, number> = {};
    let decisoes = 0, acum = 0;

    for (let t = 0; t < T; t++) {
      const g = new GameController({ rng: seededRng(20261014 + t * 7919) });
      g.configureTournament({ buyIn: 109, entrants: 300, stage: "inicio" });
      g.newHand();
      for (let passo = 0; passo < 40_000; passo++) {
        if (g.tournamentOver) break;
        if (g.phase === "handOver") { g.newHand(); continue; }
        if (!g.isHeroTurn()) { g.botStep(); continue; }
        const antes = g.feedback.length;
        const rua = g.table.street;
        g.heroAct(acaoDoPadrao(g));
        for (let i = antes; i < g.feedback.length; i++) {
          const it = g.feedback[i];
          decisoes++;
          const nivel = it.importancia?.nivel ?? "obvia";
          porNivel[nivel]++;
          porRua[rua] = (porRua[rua] ?? 0) + 1;
          const dificil = nivel !== "obvia";
          if (dificil) dificilPorRua[rua] = (dificilPorRua[rua] ?? 0) + 1;
          if (it.adviceFam === "aggro") { acum++; acumPorNivel[nivel]++; }
          for (const s of it.importancia?.sinais ?? []) sinais[s] = (sinais[s] ?? 0) + 1;
        }
      }
    }
    const pc = (n: number) => `${(n / Math.max(1, decisoes) * 100).toFixed(1)}%`;
    const L: string[] = [];
    L.push(`${T} torneios · ${decisoes} decisões do herói · ${acum} de acumulação`);
    L.push("");
    L.push("TODAS as decisões, por nível de importância:");
    for (const n of ["obvia", "interessante", "excepcional"] as Importancia[]) {
      L.push(`  ${n.padEnd(13)} ${String(porNivel[n]).padStart(5)}  ${pc(porNivel[n]).padStart(7)}  (${(porNivel[n]/T).toFixed(1)}/torneio)`);
    }
    L.push("");
    L.push("Só as de ACUMULAÇÃO (o que o alvo conta hoje):");
    for (const n of ["obvia", "interessante", "excepcional"] as Importancia[]) {
      L.push(`  ${n.padEnd(13)} ${String(acumPorNivel[n]).padStart(5)}  (${(acumPorNivel[n]/T).toFixed(1)}/torneio)`);
    }
    L.push("");
    L.push("Por RUA — todas × difíceis (interessante+excepcional):");
    for (const r of ["preflop", "flop", "turn", "river"]) {
      const tot = porRua[r] ?? 0, dif = dificilPorRua[r] ?? 0;
      L.push(`  ${r.padEnd(9)} ${String(tot).padStart(5)} total · ${String(dif).padStart(4)} difíceis  (${(dif/T).toFixed(1)}/torneio)`);
    }
    L.push("");
    L.push("Sinais que mais acendem:");
    for (const [k, v] of Object.entries(sinais).sort((a, b) => b[1] - a[1])) {
      L.push(`  ${k.padEnd(18)} ${String(v).padStart(5)}  ${pc(v)}`);
    }
    console.log("\n" + L.join("\n") + "\n");
  }, 1_800_000);
});

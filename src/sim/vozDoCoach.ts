// ---------------------------------------------------------------------------
// QUANTO O COACH FALA — a régua, antes de mandar ele falar menos.
//
// 17/09/2026. O plano de evolução que o Allan trouxe pede "silêncio em mãos
// triviais". Só que ninguém sabia quanto o coach fala hoje: sem linha de base,
// "falar menos" é chute. Esta régua joga torneios de verdade e conta, decisão
// por decisão, em que nível a régua de importância (importanciaDaMao.ts)
// classificou o spot.
//
// O herói joga a LINHA DE BASE (a recomendação do motor), igual às outras
// réguas: o que se mede aqui é o quanto o coach TERIA a dizer, não a qualidade
// de quem joga.
//
// Roda com:
//   CF_REGUA=1 npx vitest run src/sim/_vozRun.test.ts
// ---------------------------------------------------------------------------

import type { Action } from "../game/state";
import { GameController } from "../app/gameController";
import type { Stage } from "../tournament/types";
import type { Importancia } from "../feedback/importanciaDaMao";
import { seededRng } from "../engine/cards";

export interface VozResultado {
  buyIn: number;
  torneios: number;
  maos: number;
  decisoes: number;
  /** Quantas decisões caíram em cada nível. */
  porNivel: Record<Importancia, number>;
  /** Quantas vezes cada sinal acendeu. */
  porSinal: Record<string, number>;
  /** Decisões sem leitura de importância (não deveria haver nenhuma). */
  semLeitura: number;
}

function acaoDoPadrao(g: GameController): Action {
  const la = g.legal();
  const adv = g.computeHeroAdvice();
  const a = adv?.action ?? (la.canCheck ? "check" : "fold");
  if (a === "fold") return la.canCheck ? { type: "check" } : { type: "fold" };
  if (a === "check") return la.canCheck ? { type: "check" } : { type: "fold" };
  if (a === "call") return la.canCall ? { type: "call" } : la.canCheck ? { type: "check" } : { type: "fold" };
  if (!la.canRaise) return la.canCall ? { type: "call" } : la.canCheck ? { type: "check" } : { type: "fold" };
  const to = g.suggestedRaiseTo() ?? la.minRaiseTo;
  const alvo = Math.max(la.minRaiseTo, Math.min(la.maxRaiseTo, to));
  return alvo >= la.maxRaiseTo ? { type: "allin" } : { type: "raise", to: alvo };
}

export function medirVoz(opts: {
  buyIn: number;
  torneios: number;
  entrants?: number;
  stage?: Stage;
  semente?: number;
  maxPassos?: number;
}): VozResultado {
  const { buyIn, torneios, entrants = 100, stage = "inicio", semente = 2026 } = opts;
  const maxPassos = opts.maxPassos ?? 40_000;
  const r: VozResultado = {
    buyIn, torneios, maos: 0, decisoes: 0,
    porNivel: { obvia: 0, interessante: 0, excepcional: 0 },
    porSinal: {}, semLeitura: 0,
  };

  for (let t = 0; t < torneios; t++) {
    const g = new GameController({ rng: seededRng(semente + t * 7919) });
    g.configureTournament({ buyIn, entrants, stage });
    g.newHand();
    let maoContada = false;

    for (let passo = 0; passo < maxPassos; passo++) {
      if (g.tournamentOver) break;
      if (g.phase === "handOver") { g.newHand(); maoContada = false; continue; }
      if (!g.isHeroTurn()) { g.botStep(); continue; }
      if (!maoContada) { r.maos++; maoContada = true; }

      // ⚠️ `g.feedback` é POR MÃO (o controller zera a cada newHand), então o
      // recorte tem de ser tomado ANTES da ação — um contador acumulado entre
      // mãos lê 27 decisões em 530 mãos (erro meu, achado na primeira amostra).
      const antes = g.feedback.length;
      g.heroAct(acaoDoPadrao(g));
      for (let i = antes; i < g.feedback.length; i++) {
        const imp = g.feedback[i].importancia;
        if (!imp) { r.semLeitura++; continue; }
        r.decisoes++;
        r.porNivel[imp.nivel]++;
        for (const s of imp.sinais) r.porSinal[s] = (r.porSinal[s] ?? 0) + 1;
      }
    }
  }
  return r;
}

/** Percentuais prontos para a tabela. */
export function taxas(r: VozResultado) {
  const d = Math.max(1, r.decisoes);
  const pct = (n: number) => Math.round((n / d) * 1000) / 10;
  return {
    calado: pct(r.porNivel.obvia),
    comentada: pct(r.porNivel.interessante),
    review: pct(r.porNivel.excepcional),
    sinais: Object.entries(r.porSinal)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ${pct(v)}%`),
  };
}

// ---------------------------------------------------------------------------
// COM QUE FREQUÊNCIA APARECE UM SPOT DE ACUMULAÇÃO — a régua, antes do alvo.
//
// 13/10/2026. A comparação do histórico do Allan com o do irmão (bbru156)
// mostrou que os dois sobrevivem igual — ITM 23,5% × 23,6%, e o Allan até joga
// MAIS campo (57,8% × 55,0%). A diferença medida está em ACUMULAR: 2,7× menos
// poder de vitória normalizado pelo campo.
//
// O alvo que o Allan pediu ("uma coisa com linha de chegada") precisa de um
// tamanho — e tamanho sem medição é chute. Esta régua joga torneios de verdade
// e conta quantas decisões do herói são SPOT DE ACUMULAÇÃO, isto é: o padrão
// recomendou escalar (adviceFam === "aggro").
//
// Por que "o padrão recomendou aggro" e não "o herói foi passivo": o alvo
// precisa saber ANTES da ação se aquele spot conta, senão a barra de progresso
// pula de um jeito que o jogador não entende. `adviceFam` é conhecido no
// momento da decisão; o erro só se sabe depois.
//
// O herói joga a LINHA DE BASE (a própria recomendação do motor) — o que se
// mede aqui é a FREQUÊNCIA do spot, não a qualidade de quem joga.
//
// Roda com:
//   CF_REGUA=1 npx vitest run src/sim/_acumulacaoRun.test.ts
// ---------------------------------------------------------------------------

import type { Action } from "../game/state";
import { GameController } from "../app/gameController";
import type { Stage } from "../tournament/types";
import { seededRng } from "../engine/cards";

export interface AcumulacaoResultado {
  buyIn: number;
  entrants: number;
  torneios: number;
  maos: number;
  /** Todas as decisões do herói. */
  decisoes: number;
  /** Decisões em que o padrão mandou ESCALAR (adviceFam === "aggro"). */
  spots: number;
  spotsPreflop: number;
  spotsPostflop: number;
  /** Mãos em que apareceu pelo menos um spot de acumulação. */
  maosComSpot: number;
  /** Decisões sem adviceFam (não deveria haver nenhuma). */
  semFamilia: number;
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

export function medirAcumulacao(opts: {
  buyIn: number;
  torneios: number;
  entrants?: number;
  stage?: Stage;
  semente?: number;
  maxPassos?: number;
}): AcumulacaoResultado {
  const { buyIn, torneios, entrants = 100, stage = "inicio", semente = 2026 } = opts;
  const maxPassos = opts.maxPassos ?? 40_000;
  const r: AcumulacaoResultado = {
    buyIn, entrants, torneios, maos: 0, decisoes: 0,
    spots: 0, spotsPreflop: 0, spotsPostflop: 0, maosComSpot: 0, semFamilia: 0,
  };

  for (let t = 0; t < torneios; t++) {
    const g = new GameController({ rng: seededRng(semente + t * 7919) });
    g.configureTournament({ buyIn, entrants, stage });
    g.newHand();
    let maoContada = false;
    let spotNestaMao = false;

    for (let passo = 0; passo < maxPassos; passo++) {
      if (g.tournamentOver) break;
      if (g.phase === "handOver") { g.newHand(); maoContada = false; spotNestaMao = false; continue; }
      if (!g.isHeroTurn()) { g.botStep(); continue; }
      if (!maoContada) { r.maos++; maoContada = true; }

      // ⚠️ `g.feedback` é POR MÃO (zera a cada newHand): o recorte tem de ser
      // tomado ANTES da ação. Mesma armadilha da régua da voz.
      const antes = g.feedback.length;
      g.heroAct(acaoDoPadrao(g));
      for (let i = antes; i < g.feedback.length; i++) {
        const it = g.feedback[i];
        r.decisoes++;
        if (!it.adviceFam) { r.semFamilia++; continue; }
        if (it.adviceFam !== "aggro") continue;
        r.spots++;
        if (it.kind === "postflop") r.spotsPostflop++; else r.spotsPreflop++;
        if (!spotNestaMao) { r.maosComSpot++; spotNestaMao = true; }
      }
    }
  }
  return r;
}

/** Números prontos para a tabela da régua. */
export function taxasDeAcumulacao(r: AcumulacaoResultado) {
  const t = Math.max(1, r.torneios);
  const d = Math.max(1, r.decisoes);
  const m = Math.max(1, r.maos);
  const um = (n: number) => Math.round(n * 10) / 10;
  return {
    spotsPorTorneio: um(r.spots / t),
    maosPorTorneio: um(r.maos / t),
    decisoesPorTorneio: um(r.decisoes / t),
    pctDasDecisoes: um((r.spots / d) * 100),
    pctDasMaos: um((r.maosComSpot / m) * 100),
    pctPreflop: um((r.spotsPreflop / Math.max(1, r.spots)) * 100),
  };
}

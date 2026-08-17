// ---------------------------------------------------------------------------
// FRENTE #2 — Loop fechado: VAZAMENTO → TREINO DIRIGIDO → EVOLUÇÃO.
//
// O detector de vazamentos (feedback/leaks) já diz ONDE você erra. Faltava
// FECHAR o loop: gerar um treino de EXATAMENTE aquele erro e MEDIR se você
// melhorou. É o que este módulo faz — a promessa do "professor pessoal"
// cumprida de verdade.
//
// Ideia central: cada vazamento tem um lado CERTO (a família de ação que o
// motor recomendava). O drill dirigido só mostra spots onde o certo é ISSO —
// martela a decisão que você erra, não spots aleatórios. E cada rodada é
// gravada por vazamento, então dá pra mostrar a curva subindo (45% → 78%).
//
// Praia do MOTOR (Claude): a lógica de mapear vazamento→spot e medir evolução.
// A UI (botão "Treinar esse ponto fraco" + gráfico) é da Manus — ela só
// consome createLeakDrillSession / recordLeakTraining / leakTrainingTrend.
// ---------------------------------------------------------------------------

import type { Family } from "../feedback/analyzer";
import type { Position } from "../ranges/types";
import {
  type DrillSpotConfig,
  type DrillSession,
  type DrillHand,
  generateDrillHand,
} from "./drill";

/** Família da ação (pré-flop não tem "check"). */
function famOf(action: string): Family {
  if (action === "fold") return "fold";
  if (action === "call") return "call";
  return "aggro"; // raise / 3bet / jam
}

export interface LeakPlan {
  /** Onde treinar: o drill pré-flop, ou o treino de ruas (pós-flop). */
  mode: "preflop" | "postflop";
  /** As famílias de CONSELHO que o treino reforça (o lado certo do erro). */
  targetFams: Family[];
  /** O que focar, em uma frase (a UI mostra ao abrir o treino). */
  focus: string;
}

/**
 * Mapa vazamento → plano de treino. As famílias-alvo são o LADO CERTO de cada
 * erro em leaks.ts (o que o motor recomendava). O drill só mostra spots onde o
 * certo é uma dessas famílias — treinando exatamente a decisão que você erra.
 */
export const LEAK_PLANS: Record<string, LeakPlan> = {
  // ---- Pré-flop (cobertos pelo drill open/vsOpen) ----
  tight_preflop: { mode: "preflop", targetFams: ["call", "aggro"], focus: "Spots onde FOLDAR é o erro — treine continuar com as mãos jogáveis." },
  loose_preflop: { mode: "preflop", targetFams: ["fold"], focus: "Spots onde ENTRAR é o erro — treine soltar o lixo." },
  passive_preflop: { mode: "preflop", targetFams: ["aggro"], focus: "Spots onde só PAGAR deixa valor na mesa — treine aumentar." },
  overaggro_preflop: { mode: "preflop", targetFams: ["call", "fold"], focus: "Spots onde AUMENTAR é demais — treine pagar/foldar." },
  // ---- Pós-flop (encaminha pro treino de ruas; drill pré-flop não cobre) ----
  loose_call_postflop: { mode: "postflop", targetFams: ["fold"], focus: "Boards onde pagar sem equity é o erro — treine o fold." },
  overfold_postflop: { mode: "postflop", targetFams: ["call", "aggro"], focus: "Boards onde desistir cedo é o erro — treine continuar com equity." },
  overbet_bluff_postflop: { mode: "postflop", targetFams: ["check", "call"], focus: "Boards onde apostar demais é o erro — treine o check." },
  missed_value_postflop: { mode: "postflop", targetFams: ["aggro"], focus: "Boards onde só pagar/checar perde valor — treine apostar." },
};

/** O plano de treino de um vazamento (ou null se o id for desconhecido). */
export function planForLeak(leakId: string): LeakPlan | null {
  return LEAK_PLANS[leakId] ?? null;
}

/** Pool de spots pré-flop candidatos (abertura de cada posição + defesa do BB). */
function candidateSpots(effBB: number): DrillSpotConfig[] {
  const opens: Position[] = ["UTG", "MP", "HJ", "CO", "BTN", "SB"];
  const spots: DrillSpotConfig[] = opens.map((p) => ({
    type: "open",
    heroPosition: p,
    effectiveBB: effBB,
    handCount: 0,
  }));
  for (const r of ["MP", "HJ", "CO", "BTN"] as Position[]) {
    spots.push({ type: "vsOpen", heroPosition: "BB", raiserPosition: r, openSizeBB: 2.5, effectiveBB: effBB, handCount: 0 });
  }
  return spots;
}

/**
 * Cria uma sessão de drill DIRIGIDA ao vazamento: todas as mãos são spots onde
 * a jogada certa é a família que você erra. Retorna null para vazamentos de
 * pós-flop (a UI abre o treino de ruas nesse caso) ou id desconhecido.
 *
 * Compatível com o fluxo de drill existente (answerDrillHand / computeDrillResult):
 * é uma DrillSession normal; cada DrillHand carrega o seu próprio `spot`.
 */
export function createLeakDrillSession(
  leakId: string,
  handCount = 12,
  rng: () => number = Math.random,
): DrillSession | null {
  const plan = LEAK_PLANS[leakId];
  if (!plan || plan.mode !== "preflop") return null;

  const effBB = 40;
  const pool = candidateSpots(effBB);
  const hands: DrillHand[] = [];
  const maxTries = handCount * 400;
  let tries = 0;

  while (hands.length < handCount && tries < maxTries) {
    tries++;
    const spot = pool[Math.floor(rng() * pool.length)];
    const h = generateDrillHand(spot, rng);
    if (plan.targetFams.includes(famOf(h.advice.action))) hands.push(h);
  }
  if (hands.length === 0) return null;

  return { spot: hands[0].spot, hands, currentIndex: 0, correctCount: 0, done: false };
}

// ---------------------------------------------------------------------------
// EVOLUÇÃO — progresso por vazamento (localStorage). Mede se o treino pegou.
// ---------------------------------------------------------------------------

const LEAK_STORAGE_KEY = "cof-leak-training-v1";

export interface LeakTrainingEntry {
  attempts: number;
  firstAccuracy: number; // a primeira vez que treinou esse vazamento
  lastAccuracy: number; // a mais recente
  bestAccuracy: number;
  history: number[]; // últimos 10 resultados (%)
}

export type LeakTrainingStore = Record<string, LeakTrainingEntry>;

export function loadLeakTraining(): LeakTrainingStore {
  try {
    const raw = localStorage.getItem(LEAK_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LeakTrainingStore) : {};
  } catch {
    return {};
  }
}

export function saveLeakTraining(store: LeakTrainingStore): void {
  try {
    localStorage.setItem(LEAK_STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

/** Grava o resultado (% de acerto) de uma rodada de treino do vazamento. */
export function recordLeakTraining(leakId: string, accuracy: number): LeakTrainingStore {
  const store = loadLeakTraining();
  const cur = store[leakId];
  const acc = Math.max(0, Math.min(100, Math.round(accuracy)));
  if (!cur) {
    store[leakId] = { attempts: 1, firstAccuracy: acc, lastAccuracy: acc, bestAccuracy: acc, history: [acc] };
  } else {
    cur.attempts += 1;
    cur.lastAccuracy = acc;
    cur.bestAccuracy = Math.max(cur.bestAccuracy, acc);
    cur.history = [...cur.history, acc].slice(-10);
    store[leakId] = cur;
  }
  saveLeakTraining(store);
  return store;
}

export interface LeakTrend {
  attempts: number;
  first: number;
  last: number;
  best: number;
  /** Ganho da primeira para a última rodada (pode ser negativo). */
  delta: number;
  /** Já treinou o suficiente pra considerar o vazamento "corrigido"? */
  improved: boolean;
  history: number[];
}

/** A curva de evolução de um vazamento (ou null se nunca foi treinado). */
export function leakTrainingTrend(leakId: string): LeakTrend | null {
  const store = loadLeakTraining();
  const e = store[leakId];
  if (!e) return null;
  const delta = e.lastAccuracy - e.firstAccuracy;
  return {
    attempts: e.attempts,
    first: e.firstAccuracy,
    last: e.lastAccuracy,
    best: e.bestAccuracy,
    delta,
    // "corrigido" = já treinou 2+ vezes e a última rodada foi sólida (>=75%).
    improved: e.attempts >= 2 && e.lastAccuracy >= 75,
    history: e.history,
  };
}

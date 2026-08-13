// ---------------------------------------------------------------------------
// DRILL MODE — Treino intensivo de um spot específico.
//
// O jogador escolhe UM spot (ex.: "BTN vs SB 3-bet, 25bb") e treina 30 mãos
// seguidas NESSE spot exato. Cada mão: sorteia cartas, calcula a decisão
// correta com o motor, o jogador responde, recebe feedback instantâneo.
//
// Ao final: resumo com % de acerto, spots fracos, e comparação com o ideal.
//
// Spots suportados (v1):
//   - Pote não aberto (abrir de qualquer posição)
//   - Enfrentando abertura (call / 3-bet / fold)
//   - Enfrentando 3-bet (call / 4-bet / jam / fold)
//   - Push/fold (≤15bb, all-in ou fold)
//
// Tudo puro e testável; a UI só apresenta.
// ---------------------------------------------------------------------------
import { fullDeck, shuffle, cardsToString, type Card } from "../engine/cards";
import { BASELINE_PROFILE } from "../bots/profiles";
import { preflopDecision, type PreflopContext } from "../ranges/preflop";
import { gradeDecision, type FeedbackItem, type HeroAdvice } from "../feedback/analyzer";
import type { Position } from "../ranges/types";

// ---------------------------------------------------------------------------
// Tipos do Drill
// ---------------------------------------------------------------------------

export type DrillSpotType = "open" | "vsOpen" | "vsThreeBet" | "pushFold";

export interface DrillSpotConfig {
  type: DrillSpotType;
  heroPosition: Position;
  raiserPosition?: Position;
  openSizeBB?: number; // só para vsOpen
  effectiveBB: number;
  handCount: number; // quantas mãos no drill (default 30)
}

export interface DrillHand {
  hand: Card[];
  spot: DrillSpotConfig;
  advice: HeroAdvice;
  feedback?: FeedbackItem;
  heroChoice?: "fold" | "call" | "raise" | "allin";
}

export interface DrillSession {
  spot: DrillSpotConfig;
  hands: DrillHand[];
  currentIndex: number;
  correctCount: number;
  done: boolean;
}

// ---------------------------------------------------------------------------
// Configurações predefinidas de spots para o jogador escolher
// ---------------------------------------------------------------------------

export interface DrillPreset {
  id: string;
  icon: string;
  title: string;
  description: string;
  build: (rng?: () => number) => DrillSpotConfig;
}

export const DRILL_PRESETS: DrillPreset[] = [
  {
    id: "btn_open",
    icon: "🎯",
    title: "BTN — Abertura",
    description: "Treine suas aberturas do botão (mão mais ampla do jogo)",
    build: (rng = Math.random) => ({
      type: "open",
      heroPosition: "BTN",
      effectiveBB: 30 + Math.floor(rng() * 40), // 30–70bb
      handCount: 30,
    }),
  },
  {
    id: "sb_open",
    icon: "⚡",
    title: "SB — Abertura",
    description: "O botão pequeno é traiçoeiro: aprenda a abrir certo",
    build: (rng = Math.random) => ({
      type: "open",
      heroPosition: "SB",
      effectiveBB: 30 + Math.floor(rng() * 40),
      handCount: 30,
    }),
  },
  {
    id: "bb_defense",
    icon: "🛡️",
    title: "BB — Defender",
    description: "Defenda o big blind contra aberturas de várias posições",
    build: (rng = Math.random) => {
      const positions: Position[] = ["MP", "HJ", "CO", "BTN"];
      return {
        type: "vsOpen",
        heroPosition: "BB",
        raiserPosition: positions[Math.floor(rng() * positions.length)],
        openSizeBB: 2.3,
        effectiveBB: 30 + Math.floor(rng() * 40),
        handCount: 30,
      };
    },
  },
  {
    id: "btn_steal_defense",
    icon: "🔥",
    title: "vs BTN Steal (BB/SB)",
    description: "O vilão abre do botão — você defende de BB ou SB",
    build: (rng = Math.random) => ({
      type: "vsOpen",
      heroPosition: rng() > 0.5 ? "BB" : "SB",
      raiserPosition: "BTN",
      openSizeBB: 2.3,
      effectiveBB: 20 + Math.floor(rng() * 40),
      handCount: 30,
    }),
  },
  {
    id: "vs_three_bet",
    icon: "💀",
    title: "Enfrentando 3-bet",
    description: "Você abriu e tomou 3-bet — saiba quando pagar, 4-betar ou foldar",
    build: (rng = Math.random) => {
      const positions: Position[] = ["MP", "HJ", "CO", "BTN"];
      return {
        type: "vsThreeBet",
        heroPosition: positions[Math.floor(rng() * positions.length)],
        raiserPosition: "SB", // quem 3-betou
        openSizeBB: 2.3,
        effectiveBB: 30 + Math.floor(rng() * 40),
        handCount: 30,
      };
    },
  },
  {
    id: "push_fold_sb",
    icon: "🚀",
    title: "Push/Fold — SB",
    description: "Stack curto (≤15bb): all-in ou fold do SB",
    build: (rng = Math.random) => ({
      type: "pushFold",
      heroPosition: "SB",
      effectiveBB: 8 + Math.floor(rng() * 7), // 8–14bb
      handCount: 30,
    }),
  },
  {
    id: "push_fold_bb",
    icon: "🚀",
    title: "Push/Fold — BB",
    description: "Stack curto (≤15bb): all-in ou fold do BB",
    build: (rng = Math.random) => ({
      type: "pushFold",
      heroPosition: "BB",
      effectiveBB: 8 + Math.floor(rng() * 7),
      handCount: 30,
    }),
  },
  {
    id: "push_fold_mp",
    icon: "🚀",
    title: "Push/Fold — MP/HJ/CO",
    description: "Stack curto: push ou fold das posições do meio",
    build: (rng = Math.random) => {
      const positions: Position[] = ["MP", "HJ", "CO"];
      return {
        type: "pushFold",
        heroPosition: positions[Math.floor(rng() * positions.length)],
        effectiveBB: 8 + Math.floor(rng() * 7),
        handCount: 30,
      };
    },
  },
];

// ---------------------------------------------------------------------------
// Lógica do Drill
// ---------------------------------------------------------------------------

/** Gera uma mão de drill a partir do spot configurado. */
export function generateDrillHand(spot: DrillSpotConfig, rng: () => number = Math.random): DrillHand {
  const deck = shuffle(fullDeck(), rng);
  const hand: Card[] = [deck[0], deck[1]];

  const ctx: PreflopContext = {
    heroPosition: spot.heroPosition,
    hand,
    effectiveBB: spot.effectiveBB,
    profile: BASELINE_PROFILE,
    variant: "holdem",
  };

  if (spot.type === "vsOpen" || spot.type === "vsThreeBet") {
    ctx.raiserPosition = spot.raiserPosition;
    ctx.openSizeBB = spot.openSizeBB;
  }

  const advice: HeroAdvice = {
    kind: "preflop",
    action: "fold",
    reason: "",
    mix: undefined,
    effectiveBB: spot.effectiveBB,
  };

  const d = preflopDecision(ctx);
  advice.action = d.action;
  advice.reason = d.reason;
  advice.mix = d.mix;

  return {
    hand,
    spot,
    advice,
  };
}

/** Cria uma sessão de drill completa (gera todas as mãos). */
export function createDrillSession(presetId: string, handCount = 30, rng = Math.random): DrillSession {
  const preset = DRILL_PRESETS.find((p) => p.id === presetId) ?? DRILL_PRESETS[0];
  const spot = preset.build(rng);
  const hands: DrillHand[] = [];
  for (let i = 0; i < handCount; i++) {
    hands.push(generateDrillHand(spot, rng));
  }
  return {
    spot,
    hands,
    currentIndex: 0,
    correctCount: 0,
    done: false,
  };
}

/** Responde uma mão do drill e retorna o feedback. */
export function answerDrillHand(
  session: DrillSession,
  choice: "fold" | "call" | "raise" | "allin",
): { feedback: FeedbackItem; correct: boolean } {
  const hand = session.hands[session.currentIndex];
  hand.heroChoice = choice;

  const feedback = gradeDecision("Drill", "technical", choice, hand.advice);
  hand.feedback = feedback;

  const correct = feedback.rating === "boa" || feedback.rating === "ok";
  if (correct) session.correctCount++;
  session.currentIndex++;

  if (session.currentIndex >= session.hands.length) {
    session.done = true;
  }

  return { feedback, correct };
}

/** Resultado final do drill. */
export interface DrillResult {
  spot: DrillSpotConfig;
  totalHands: number;
  correctCount: number;
  accuracy: number; // % de acerto
  mastery: "beginner" | "intermediate" | "advanced" | "master";
  mistakes: { hand: string; choice: string; advice: string }[];
}

export function computeDrillResult(session: DrillSession): DrillResult {
  const accuracy = session.hands.length
    ? Math.round((session.correctCount / session.hands.length) * 100)
    : 0;

  let mastery: DrillResult["mastery"];
  if (accuracy >= 90) mastery = "master";
  else if (accuracy >= 75) mastery = "advanced";
  else if (accuracy >= 60) mastery = "intermediate";
  else mastery = "beginner";

  const mistakes = session.hands
    .filter((h) => h.feedback && (h.feedback.rating === "ruim" || h.feedback.rating === "imprecisa"))
    .map((h) => ({
      hand: cardsToString(h.hand),
      choice: h.heroChoice ?? "?",
      advice: h.advice.action,
    }));

  return {
    spot: session.spot,
    totalHands: session.hands.length,
    correctCount: session.correctCount,
    accuracy,
    mastery,
    mistakes,
  };
}

// ---------------------------------------------------------------------------
// Persistência do progresso de drill (localStorage)
// ---------------------------------------------------------------------------

const DRILL_STORAGE_KEY = "cof-drill-progress-v1";

export interface DrillProgress {
  [presetId: string]: {
    attempts: number;
    bestAccuracy: number;
    lastAccuracy: number;
    mastery: string;
    history: number[]; // últimos 10 resultados
  };
}

export function loadDrillProgress(): DrillProgress {
  try {
    const raw = localStorage.getItem(DRILL_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DrillProgress) : {};
  } catch {
    return {};
  }
}

export function saveDrillProgress(progress: DrillProgress): void {
  try {
    localStorage.setItem(DRILL_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* ignore */
  }
}

export function recordDrillResult(presetId: string, accuracy: number, mastery: string): DrillProgress {
  const progress = loadDrillProgress();
  const entry = progress[presetId] ?? {
    attempts: 0,
    bestAccuracy: 0,
    lastAccuracy: 0,
    mastery: "",
    history: [],
  };
  entry.attempts++;
  entry.lastAccuracy = accuracy;
  entry.bestAccuracy = Math.max(entry.bestAccuracy, accuracy);
  entry.mastery = mastery;
  entry.history = [...entry.history, accuracy].slice(-10);
  progress[presetId] = entry;
  saveDrillProgress(progress);
  return progress;
}

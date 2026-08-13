// ---------------------------------------------------------------------------
// DRILL PÓS-FLOP — Treino intensivo de spots pós-flop.
//
// O jogador escolhe UM spot pós-flop (ex.: "Flop AKQ rainbow, flush draw")
// e treina 30 mãos seguidas NESSE spot. Cada mão:
//   - Board fixo (o mesmo spot)
//   - Cartas do herói variadas (umas acertam o spot, outras não)
//   - Villão bet (tamanho fixo ou variável)
//   - Jogador decide: check / bet / call / raise / fold
//   - Feedback instantâneo baseado em equity vs pot odds
//
// Tudo puro e testável; a UI só apresenta.
// ---------------------------------------------------------------------------
import { fullDeck, shuffle, type Card, cardFromString } from "../engine/cards";
import { buildTopRange } from "../ranges/build";
import { rangeCombos } from "../ranges/types";
import { equityHandVsRange } from "../engine/equity";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
export type PostflopDrillAction = "fold" | "check" | "call" | "bet" | "raise";

export interface PostflopDrillSpot {
  id: string;
  icon: string;
  title: string;
  description: string;
  board: Card[]; // 3 cartas (flop)
  potBB: number;
  villainBetBB: number; // 0 = vilão não apostou
  villainRangePct: number; // % top range do vilão
  equityThresholdCall: number; // equity mínima pra call (%)
  equityThresholdRaise: number; // equity pra raise (%)
  handCount: number;
}

export interface PostflopDrillHand {
  hand: Card[];
  spot: PostflopDrillSpot;
  equity: number; // 0-100
  potOdds: number; // 0-100, null se vilão não bet
  evLabel: "+EV" | "-EV" | "0EV";
  bestAction: PostflopDrillAction;
  explanation: string;
  heroChoice?: PostflopDrillAction;
  correct?: boolean;
}

export interface PostflopDrillSession {
  spot: PostflopDrillSpot;
  hands: PostflopDrillHand[];
  currentIndex: number;
  correctCount: number;
  done: boolean;
}

// ---------------------------------------------------------------------------
// Board helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Spots predefinidos
// ---------------------------------------------------------------------------
export const POSTFLOP_DRILL_SPOTS: PostflopDrillSpot[] = [
  {
    id: "flush_draw",
    icon: "🌊",
    title: "Flush Draw no Flop",
    description: "Board com 2 do seu naipe — você tem flush draw. Vilão bet 1/3 pot.",
    board: [cardFromString("7h"), cardFromString("3h"), cardFromString("2s")],
    potBB: 8,
    villainBetBB: 3,
    villainRangePct: 0.30,
    equityThresholdCall: 28,
    equityThresholdRaise: 45,
    handCount: 30,
  },
  {
    id: "top_pair",
    icon: "👑",
    title: "Top Pair — Board Seco",
    description: "Você acertou o par mais alto num board seco. Vilão bet 1/2 pot.",
    board: [cardFromString("Kh"), cardFromString("7d"), cardFromString("2c")],
    potBB: 8,
    villainBetBB: 4,
    villainRangePct: 0.25,
    equityThresholdCall: 35,
    equityThresholdRaise: 60,
    handCount: 30,
  },
  {
    id: "overpair",
    icon: "💪",
    title: "Overpair no Flop",
    description: "Seu par é maior que qualquer carta do board. Vilão bet 2/3 pot.",
    board: [cardFromString("8h"), cardFromString("4d"), cardFromString("2c")],
    potBB: 8,
    villainBetBB: 5,
    villainRangePct: 0.35,
    equityThresholdCall: 30,
    equityThresholdRaise: 55,
    handCount: 30,
  },
  {
    id: "monster_dry",
    icon: "🏆",
    title: "Trinca/Monarca em Board Seco",
    description: "Board com uma carta baixa. Vilão bet 1/2 pot — você tem a nuts.",
    board: [cardFromString("Ah"), cardFromString("5d"), cardFromString("2c")],
    potBB: 8,
    villainBetBB: 4,
    villainRangePct: 0.30,
    equityThresholdCall: 50,
    equityThresholdRaise: 70,
    handCount: 30,
  },
  {
    id: "air_facing_bet",
    icon: "😰",
    title: "Ar contra aposta (Bluff-catch)",
    description: "Você não tem nada no board. Vilão bet 1/2 pot. Hora de foldar?",
    board: [cardFromString("Qs"), cardFromString("8d"), cardFromString("3c")],
    potBB: 8,
    villainBetBB: 4,
    villainRangePct: 0.25,
    equityThresholdCall: 30,
    equityThresholdRaise: 50,
    handCount: 30,
  },
  {
    id: "straight_draw",
    icon: "🎢",
    title: "Straight Draw (OESD)",
    description: "Open-ended straight draw. Vilão bet 1/2 pot.",
    board: [cardFromString("8h"), cardFromString("7d"), cardFromString("2c")],
    potBB: 8,
    villainBetBB: 4,
    villainRangePct: 0.30,
    equityThresholdCall: 28,
    equityThresholdRaise: 45,
    handCount: 30,
  },
];

// ---------------------------------------------------------------------------
// Lógica
// ---------------------------------------------------------------------------
/** Determina o board de cartas mortas para não sortear cartas duplicadas. */
function getDeadCards(spot: PostflopDrillSpot): Card[] {
  return [...spot.board];
}

/** Gera uma mão de drill pós-flop. */
export function generatePostflopDrillHand(
  spot: PostflopDrillSpot,
  rng: () => number = Math.random,
): PostflopDrillHand {
  const deck = shuffle(fullDeck(), rng);
  const dead = getDeadCards(spot);
  // Sortear 2 cartas que não estejam no board
  const hand: Card[] = [];
  for (let i = 0; i < deck.length && hand.length < 2; i++) {
    if (!dead.includes(deck[i])) {
      hand.push(deck[i]);
      dead.push(deck[i]);
    }
  }

  // Calcular equity vs villain range
  const villainRange = buildTopRange(spot.villainRangePct);
  const villainCombos = rangeCombos(villainRange);
  const eq = equityHandVsRange(hand, villainCombos, spot.board, 2000, rng);
  const equity = Math.round(eq.equity * 100);

  // Pot odds
  let potOdds: number;
  if (spot.villainBetBB > 0) {
    potOdds = Math.round((spot.villainBetBB / (spot.potBB + 2 * spot.villainBetBB)) * 100);
  } else {
    potOdds = 0; // vilão não bet — pot odds é 0 (free option)
  }

  // EV label
  let evLabel: "+EV" | "-EV" | "0EV";
  if (equity > potOdds + 5) evLabel = "+EV";
  else if (equity < potOdds - 5) evLabel = "-EV";
  else evLabel = "0EV";

  // Best action
  let bestAction: PostflopDrillAction;
  let explanation: string;

  if (spot.villainBetBB === 0) {
    // Vilão não apostou — check ou bet
    if (equity >= spot.equityThresholdRaise) {
      bestAction = "bet";
      explanation = `Equity ${equity}% — forte o suficiente pra apostar.`;
    } else {
      bestAction = "check";
      explanation = `Equity ${equity}% — sem mão feita, check.`;
    }
  } else {
    // Vilão apostou — fold, call ou raise
    if (equity >= spot.equityThresholdRaise) {
      bestAction = "raise";
      explanation = `Equity ${equity}% vs pot odds ${potOdds}% — mão forte, raiser aqui.`;
    } else if (equity >= spot.equityThresholdCall) {
      bestAction = "call";
      explanation = `Equity ${equity}% vs pot odds ${potOdds}% — preço justo pra pagar.`;
    } else {
      bestAction = "fold";
      explanation = `Equity ${equity}% vs pot odds ${potOdds}% — sem preço, fold.`;
    }
  }

  return {
    hand,
    spot,
    equity,
    potOdds,
    evLabel,
    bestAction,
    explanation,
  };
}

/** Cria uma sessão de drill pós-flop. */
export function createPostflopDrillSession(spotId: string, handCount = 30, rng = Math.random): PostflopDrillSession {
  const spot = POSTFLOP_DRILL_SPOTS.find((s) => s.id === spotId) ?? POSTFLOP_DRILL_SPOTS[0];
  const hands: PostflopDrillHand[] = [];
  for (let i = 0; i < handCount; i++) {
    hands.push(generatePostflopDrillHand(spot, rng));
  }
  return {
    spot,
    hands,
    currentIndex: 0,
    correctCount: 0,
    done: false,
  };
}

/** Responde uma mão e retorna se acertou. */
export function answerPostflopDrillHand(
  session: PostflopDrillSession,
  choice: PostflopDrillAction,
): boolean {
  const hand = session.hands[session.currentIndex];
  hand.heroChoice = choice;
  // Acertou se escolheu a best action
  const correct = choice === hand.bestAction;
  hand.correct = correct;
  if (correct) session.correctCount++;
  session.currentIndex++;
  if (session.currentIndex >= session.hands.length) {
    session.done = true;
  }
  return correct;
}

// ---------------------------------------------------------------------------
// DRILL PÓS-FLOP — Treino intensivo de spots pós-flop.
//
// O jogador escolhe UM spot pós-flop (ex.: "Overpair no Flop")
// e treina 30 mãos seguidas NESSE spot. Cada mão:
//   - Board fixo (o mesmo spot)
//   - Cartas do herói GARANTIDAS compatíveis com o título do spot
//     (overpair é overpair, flush draw tem flush draw, trinca é trinca...)
//   - Villão bet (tamanho fixo ou variável)
//   - Jogador decide: check / bet / call / raise / fold
//   - Feedback instantâneo, específico da mão, em UMA linha (sem repetição)
//
// Tudo puro e testável; a UI só apresenta.
// ---------------------------------------------------------------------------
import { fullDeck, shuffle, type Card, cardFromString, rankOf, suitOf } from "../engine/cards";
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
function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Monta a mão GARANTINDO a condição do spot — a mão sempre bate com o título.
 * Antes o sorteio era livre e o título podia mentir (ex.: "Overpair" com Q♠A♥
 * num board 8-4-2). Agora cada spot tem seu construtor dedicado.
 */
function generateHandForSpot(spot: PostflopDrillSpot, rng: () => number): Card[] {
  const board = spot.board;
  const dead = new Set<Card>(board);

  /** Carta com rank/naipe dados, ou undefined se já estiver no board/mão. */
  const card = (rank: number, suit: number): Card | undefined => {
    const c = ((rank - 2) * 4 + suit) as Card;
    return dead.has(c) ? undefined : c;
  };

  /** Adiciona a carta à mão e a mata. */
  const take = (c: Card | undefined, hand: Card[]): void => {
    if (c === undefined) return;
    hand.push(c);
    dead.add(c);
  };

  switch (spot.id) {
    // FLUSH DRAW — board 7h3h2s: herói recebe 2 cartas de copas (9 outs).
    case "flush_draw": {
      const hand: Card[] = [];
      const candidates: Card[] = [];
      for (let rank = 2; rank <= 14; rank++) {
        const c = card(rank, 2); // ♥ copas = suit 2
        if (c !== undefined) candidates.push(c);
      }
      take(pick(candidates, rng), hand);
      take(pick(candidates.filter((c) => !dead.has(c)), rng), hand);
      return hand;
    }

    // TOP PAIR — board Kh7d2c: herói recebe Kx (K + kicker).
    case "top_pair": {
      const hand: Card[] = [];
      const aces = [0, 1, 2, 3].map((s) => card(13, s)).filter((c): c is Card => c !== undefined);
      take(pick(aces, rng), hand);
      const kickers: Card[] = [];
      for (let rank = 2; rank <= 12; rank++) {
        for (let s = 0; s < 4; s++) {
          const c = card(rank, s);
          if (c !== undefined) kickers.push(c);
        }
      }
      take(pick(kickers, rng), hand);
      return hand;
    }

    // OVERPAIR — board 8h4d2c: herói recebe TT/JJ/QQ/KK/AA.
    case "overpair": {
      const boardMax = Math.max(...board.map((c) => rankOf(c)));
      const pairs: Card[][] = [];
      for (let rank = boardMax + 1; rank <= 14; rank++) {
        const suits = [0, 1, 2, 3].map((s) => card(rank, s)).filter((c): c is Card => c !== undefined);
        for (let i = 0; i < suits.length; i++) {
          for (let j = i + 1; j < suits.length; j++) {
            pairs.push([suits[i], suits[j]]);
          }
        }
      }
      return pick(pairs, rng);
    }

    // TRINCA/MONARCA — board Ah5d2c. 50% monarca Ax, 50% trinca (55 ou 22).
    case "monster_dry": {
      const hand: Card[] = [];
      if (rng() < 0.5) {
        // Monarca: A + kicker (não A, não board)
        const aces = [0, 1, 2, 3].map((s) => card(14, s)).filter((c): c is Card => c !== undefined);
        take(pick(aces, rng), hand);
        const kickers: Card[] = [];
        for (let rank = 2; rank <= 13; rank++) {
          for (let s = 0; s < 4; s++) {
            const c = card(rank, s);
            if (c !== undefined) kickers.push(c);
          }
        }
        take(pick(kickers, rng), hand);
      } else {
        // Trinca: par na mão de uma carta do board (55 ou 22)
        const boardRank = pick([5, 2], rng);
        const suits = [0, 1, 2, 3].map((s) => card(boardRank, s)).filter((c): c is Card => c !== undefined);
        take(pick(suits, rng), hand);
        take(pick(suits.filter((c) => !dead.has(c)), rng), hand);
      }
      return hand;
    }

    // AIR — board Qs8d3c: 2 cartas baixas, sem par, sem draw, sem conectividade.
    case "air_facing_bet": {
      const hand: Card[] = [];
      const lowCards: Card[] = [];
      for (let rank = 2; rank <= 9; rank++) {
        for (let s = 0; s < 4; s++) {
          const c = card(rank, s);
          if (c !== undefined) lowCards.push(c);
        }
      }
      // Repete até achar 2 cartas compatíveis (sem par / sem draw)
      for (let attempt = 0; attempt < 50; attempt++) {
        hand.length = 0;
        dead.clear();
        for (const c of board) dead.add(c);
        take(pick(lowCards, rng), hand);
        if (hand.length === 0) continue;
        const c1 = hand[0];
        const rest = lowCards.filter(
          (c) =>
            !dead.has(c) &&
            rankOf(c) !== rankOf(c1) && // sem par
            suitOf(c) !== suitOf(c1) && // sem flush draw
            Math.abs(rankOf(c) - rankOf(c1)) >= 3, // sem straight draw / conector
        );
        if (rest.length === 0) continue;
        take(pick(rest, rng), hand);
        if (hand.length === 2) return hand;
      }
      // Fallback (degenerado): 2 cartas baixas quaisquer não-board
      hand.length = 0;
      dead.clear();
      for (const c of board) dead.add(c);
      take(pick(lowCards, rng), hand);
      take(pick(lowCards.filter((c) => !dead.has(c)), rng), hand);
      return hand;
    }

    // STRAIGHT DRAW (OESD) — board 8h7d2c. Combos que dão abertura real
    // (4 ranks em linha + out nas duas pontas): T9, 96, 65.
    case "straight_draw": {
      const combos: Array<[number, number]> = [
        [10, 9],
        [9, 6],
        [6, 5],
      ];
      const [r1, r2] = pick(combos, rng);
      const hand: Card[] = [];
      const s1 = [0, 1, 2, 3].map((s) => card(r1, s)).filter((c): c is Card => c !== undefined);
      take(pick(s1, rng), hand);
      const s2 = [0, 1, 2, 3].map((s) => card(r2, s)).filter((c): c is Card => c !== undefined && !dead.has(c));
      take(pick(s2, rng), hand);
      return hand;
    }

    default: {
      // Fallback: sorteio livre (não deve acontecer com os spots definidos)
      const deck = shuffle(fullDeck(), rng);
      const hand: Card[] = [];
      const used = new Set<Card>(board);
      for (const c of deck) {
        if (hand.length >= 2) break;
        if (!used.has(c)) { hand.push(c); used.add(c); }
      }
      return hand;
    }
  }
}

/** Gera uma mão de drill pós-flop — sempre compatível com o spot. */
export function generatePostflopDrillHand(
  spot: PostflopDrillSpot,
  rng: () => number = Math.random,
): PostflopDrillHand {
  const hand = generateHandForSpot(spot, rng);

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

  // Best action + explicação específica da mão — UMA linha só, sem repetição
  let bestAction: PostflopDrillAction;
  let explanation: string;

  const spotNote = spotHandNote(spot, hand);
  const verb: Record<PostflopDrillAction, string> = {
    bet: "aposte",
    check: "dê check",
    call: "pague",
    raise: "dê raise",
    fold: "folde",
  };

  if (spot.villainBetBB === 0) {
    if (equity >= spot.equityThresholdRaise) {
      bestAction = "bet";
      explanation = `${spotNote} Equity ${equity}% — forte o suficiente pra apostar: ${verb.bet}.`;
    } else {
      bestAction = "check";
      explanation = `${spotNote} Equity ${equity}% — sem preço pra agredir, ${verb.check}.`;
    }
  } else {
    if (equity >= spot.equityThresholdRaise) {
      bestAction = "raise";
      explanation = `${spotNote} Equity ${equity}% vs pot odds ${potOdds}% — ${verb.raise}.`;
    } else if (equity >= spot.equityThresholdCall) {
      bestAction = "call";
      explanation = `${spotNote} Equity ${equity}% vs pot odds ${potOdds}% — ${verb.call}.`;
    } else {
      bestAction = "fold";
      explanation = `${spotNote} Equity ${equity}% < ${potOdds}% de pot odds — ${verb.fold}.`;
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

/** Uma frase curta identificando o que a mão é neste spot. */
function spotHandNote(spot: PostflopDrillSpot, hand: Card[]): string {
  const br = (c: Card) => "23456789TJQKA"[rankOf(c) - 2];
  const bs = (c: Card) => "♣♦♥♠"[suitOf(c)];
  const label = `${br(hand[0])}${bs(hand[0])}${br(hand[1])}${bs(hand[1])}`;
  switch (spot.id) {
    case "flush_draw": return `${label}: flush draw — 9 outs de flush.`;
    case "top_pair": return `${label}: top pair neste board seco.`;
    case "overpair": return `${label}: overpair — par maior que o board.`;
    case "monster_dry": return `${label}: mão monstruosa neste board seco.`;
    case "air_facing_bet": return `${label}: ar puro — sem par, sem draw.`;
    case "straight_draw": return `${label}: straight draw aberto.`;
    default: return `${label}:`;
  }
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

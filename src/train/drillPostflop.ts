// ---------------------------------------------------------------------------
// DRILL PÓS-FLOP — Treino intensivo de spots pós-flop.
//
// O jogador escolhe UM spot pós-flop (ex.: "Overpair no Flop")
// e treina 30 mãos seguidas NESSE spot. Cada mão:
//   - Board NOVO a cada jogada (pools de texturas realistas, sem repetição
//     dentro da sessão — como num torneio de verdade)
//   - Cartas do herói GARANTIDAS compatíveis com o título do spot
//     (overpair é overpair, flush draw tem flush draw, trinca é trinca...)
//   - Mão e board NUNCA se repetem dentro da mesma sessão
//   - Villão bet (tamanho fixo ou variável)
//   - Feedback instantâneo, específico da mão, em UMA linha (sem repetição)
//
// Tudo puro e testável; a UI só apresenta.
// ---------------------------------------------------------------------------
import {
  fullDeck,
  shuffle,
  type Card,
  cardFromString,
  rankOf,
  suitOf,
} from "../engine/cards";
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
  board: Card[]; // flop padrão (compatível com todos os boards da pool)
  boards: Card[][]; // pool de flops reais — variedade tipo torneio
  potBB: number;
  villainBetBB: number; // 0 = vilão não apostou
  villainRangePct: number; // % top range do vilão
  equityThresholdCall: number; // equity mínima pra call (%)
  equityThresholdRaise: number; // equity pra raise (%)
  handCount: number;
}

export interface PostflopDrillHand {
  hand: Card[];
  board: Card[];
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
// Pools de boards — texturas realistas por tipo de spot.
// Cada board da pool é compatível com a condição do spot.
// ---------------------------------------------------------------------------

/** Boards com 2 cartas de copas — flush draw em ♥. */
const FLUSH_DRAW_BOARDS: string[][] = [
  ["7h", "3h", "2s"],
  ["9h", "4h", "8c"],
  ["5h", "Ah", "2d"],
  ["Qh", "6h", "3s"],
  ["8h", "2h", "9d"],
  ["Th", "4h", "6c"],
  ["Ah", "7h", "4s"],
  ["6h", "9h", "Jc"],
  ["Kh", "5h", "2s"],
  ["3h", "Jh", "7d"],
];

/** Boards secos com carta alta — top pair em Kx/Ax. */
const TOP_PAIR_BOARDS: string[][] = [
  ["Kh", "7d", "2c"],
  ["Ah", "8d", "3c"],
  ["Kh", "5d", "9s"],
  ["Qh", "6d", "2c"],
  ["Ah", "9d", "4s"],
  ["Kh", "3d", "7c"],
  ["Th", "8d", "2s"],
  ["Ah", "4d", "6c"],
  ["Qh", "9d", "3s"],
  ["Kh", "2d", "8s"],
];

/** Boards secos com carta média-baixa — overpair TT+. */
const OVERPAIR_BOARDS: string[][] = [
  ["8h", "4d", "2c"],
  ["7h", "3d", "2c"],
  ["9h", "4d", "3c"],
  ["6h", "3d", "2c"],
  ["8h", "5d", "3s"],
  ["7h", "4d", "3c"],
  ["9h", "5d", "2s"],
  ["6h", "4d", "2s"],
  ["8h", "3d", "2s"],
  ["7h", "5d", "2c"],
];

/** Boards secos com A alto + 2 baixas — monarca Ax / trinca baixa. */
const MONSTER_DRY_BOARDS: string[][] = [
  ["Ah", "5d", "2c"],
  ["Ah", "6d", "3c"],
  ["Ah", "4d", "2s"],
  ["Ah", "7d", "2c"],
  ["Ah", "3d", "5s"],
  ["Ah", "8d", "2c"],
  ["Ah", "2d", "6c"],
  ["Ah", "9d", "3s"],
  ["Kh", "4d", "2c"],
  ["Ah", "5s", "3d"],
];

/** Boards secos altos — air puro sem par/draw. */
const AIR_FACING_BET_BOARDS: string[][] = [
  ["Qs", "8d", "3c"],
  ["Ks", "9d", "4c"],
  ["Qs", "7d", "2c"],
  ["Js", "8d", "3c"],
  ["Ks", "7d", "3s"],
  ["Qs", "9d", "5c"],
  ["As", "7d", "4c"],
  ["Ks", "6d", "2c"],
  ["Qs", "6d", "3s"],
  ["Js", "9d", "2c"],
];

/** Boards conectados — OESD real com o hero. */
const STRAIGHT_DRAW_BOARDS: string[][] = [
  ["8h", "7d", "2c"],
  ["9h", "8d", "3c"],
  ["7h", "6d", "2c"],
  ["Th", "9d", "3c"],
  ["6h", "5d", "2c"],
  ["8h", "6d", "2c"],
  ["9h", "7d", "2s"],
  ["Th", "8d", "2c"],
  ["7h", "5d", "2c"],
  ["8h", "9d", "4c"],
];

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
    boards: FLUSH_DRAW_BOARDS.map((b) => b.map(cardFromString)),
    potBB: 8,
    villainBetBB: 3,
    villainRangePct: 0.3,
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
    boards: TOP_PAIR_BOARDS.map((b) => b.map(cardFromString)),
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
    boards: OVERPAIR_BOARDS.map((b) => b.map(cardFromString)),
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
    boards: MONSTER_DRY_BOARDS.map((b) => b.map(cardFromString)),
    potBB: 8,
    villainBetBB: 4,
    villainRangePct: 0.3,
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
    boards: AIR_FACING_BET_BOARDS.map((b) => b.map(cardFromString)),
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
    boards: STRAIGHT_DRAW_BOARDS.map((b) => b.map(cardFromString)),
    potBB: 8,
    villainBetBB: 4,
    villainRangePct: 0.3,
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
 * Funciona para QUALQUER board da pool do spot (board variável por jogada).
 */
function generateHandForSpot(spot: PostflopDrillSpot, board: Card[], rng: () => number): Card[] {
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
    // FLUSH DRAW — board com 2 cartas de ♥: herói recebe 2 cartas de ♥ (9 outs).
    case "flush_draw": {
      const hand: Card[] = [];
      const flopHearts = board.filter((c) => suitOf(c) === 2);
      // naipe do flush draw = naipe das 2 cartas do board (padrão ♥=2)
      const drawSuit = flopHearts.length >= 2 ? suitOf(flopHearts[0]) : 2;
      const candidates: Card[] = [];
      for (let rank = 2; rank <= 14; rank++) {
        const c = card(rank, drawSuit);
        if (c !== undefined) candidates.push(c);
      }
      take(pick(candidates, rng), hand);
      take(pick(candidates.filter((c) => !dead.has(c)), rng), hand);
      return hand;
    }

    // TOP PAIR — board com carta alta: herói recebe a carta alta do board + kicker.
    case "top_pair": {
      const hand: Card[] = [];
      // carta alta do board (o "top" do top pair)
      const topCard = board.reduce((a, b) => (rankOf(b) > rankOf(a) ? b : a));
      const topRank = rankOf(topCard);
      // qualquer naipe disponível do top rank
      const tops = [0, 1, 2, 3]
        .map((s) => card(topRank, s))
        .filter((c): c is Card => c !== undefined);
      take(pick(tops, rng), hand);
      // kicker SEMPRE menor que o top do board — senão a mão passa a ser
      // Ax/Kx sem par (não é top pair) e o título do spot mente.
      const kickers: Card[] = [];
      for (let rank = 2; rank < topRank; rank++) {
        for (let s = 0; s < 4; s++) {
          const c = card(rank, s);
          if (c !== undefined) kickers.push(c);
        }
      }
      take(pick(kickers, rng), hand);
      return hand;
    }

    // OVERPAIR — board com carta média-baixa: herói recebe TT/JJ/QQ/KK/AA.
    case "overpair": {
      const boardMax = Math.max(...board.map((c) => rankOf(c)));
      const pairs: Card[][] = [];
      for (let rank = boardMax + 1; rank <= 14; rank++) {
        const suits = [0, 1, 2, 3]
          .map((s) => card(rank, s))
          .filter((c): c is Card => c !== undefined);
        for (let i = 0; i < suits.length; i++) {
          for (let j = i + 1; j < suits.length; j++) {
            pairs.push([suits[i], suits[j]]);
          }
        }
      }
      return pick(pairs, rng);
    }

    // TRINCA/MONARCA — board com carta alta (A ou K) + 2 baixas.
    // 50% monarca (PAR da carta alta do board, ex.: A♥A♦ no board Ah-4-2),
    // 50% trinca (par na mão de uma das cartas baixas do board).
    case "monster_dry": {
      const hand: Card[] = [];
      const highCard = board.reduce((a, b) => (rankOf(b) > rankOf(a) ? b : a));
      const lowBoard = board.filter((c) => c !== highCard);
      if (rng() < 0.5) {
        // Monarca: PAR da carta alta do board — a 3ª carta do mesmo rank
        // fecha a trinca; é o "set de monarca" do título.
        const suits = [0, 1, 2, 3]
          .map((s) => card(rankOf(highCard), s))
          .filter((c): c is Card => c !== undefined);
        take(pick(suits, rng), hand);
        take(pick(suits.filter((c) => !dead.has(c)), rng), hand);
      } else {
        // Trinca: par na mão de uma das cartas baixas do board
        const boardRank = pick(lowBoard, rng);
        const suits = [0, 1, 2, 3]
          .map((s) => card(rankOf(boardRank), s))
          .filter((c): c is Card => c !== undefined);
        take(pick(suits, rng), hand);
        take(pick(suits.filter((c) => !dead.has(c)), rng), hand);
      }
      return hand;
    }

    // AIR — board seco alto: 2 cartas baixas desconectadas, sem par, sem draw.
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

    // STRAIGHT DRAW (OESD) — board conectado (8-7, 9-8, 7-6...). Combos que
    // completam abertura real de 4 ranks em linha + out nas duas pontas.
    case "straight_draw": {
      const ranks = board.map((c) => rankOf(c)).sort((a, b) => a - b);
      // ranks conectados do board (2 mais próximos que distam <=2)
      const combos = oesdCombosWithBoard(ranks);
      if (combos.length === 0) {
        // board desconectado (improvável com a pool, mas fallback)
        const deck = shuffle(fullDeck(), rng);
        const h: Card[] = [];
        const used = new Set<Card>(board);
        for (const c of deck) {
          if (h.length >= 2) break;
          if (!used.has(c)) {
            h.push(c);
            used.add(c);
          }
        }
        return h;
      }
      const [r1, r2] = pick(combos, rng);
      const hand: Card[] = [];
      const s1 = [0, 1, 2, 3]
        .map((s) => card(r1, s))
        .filter((c): c is Card => c !== undefined);
      take(pick(s1, rng), hand);
      const s2 = [0, 1, 2, 3]
        .map((s) => card(r2, s))
        .filter((c): c is Card => c !== undefined && !dead.has(c));
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
        if (!used.has(c)) {
          hand.push(c);
          used.add(c);
        }
      }
      return hand;
    }
  }
}

/**
 * Retorna combos de 2 ranks que, junto com os ranks do board, formam uma
 * OESD real: 5 ranks consecutivos com os 2 ranks do herói nas pontas
 * da janela (outs nas duas extremidades).
 */
function oesdCombosWithBoard(boardRanks: number[]): Array<[number, number]> {
  const combos: Array<[number, number]> = [];
  const distinct = Array.from(new Set(boardRanks));
  // OESD real: junto com os 2 ranks do herói, os 5 ranks formam uma janela
  // de 5 consecutivos com EXATAMENTE 1 faltante — e a falta tem de ser nas
  // pontas da janela (outs nas duas extremidades).
  for (let r1 = 2; r1 <= 14; r1++) {
    for (let r2 = r1 + 1; r2 <= 14; r2++) {
      const all = Array.from(new Set([...distinct, r1, r2]));
      for (let w = 2; w <= 10 && !combos.some(([a, b]) => (a === r1 && b === r2)); w++) {
        const window = [w, w + 1, w + 2, w + 3, w + 4];
        const present = window.filter((r) => all.includes(r));
        const missing = window.filter((r) => !all.includes(r));
        if (present.length === 4 && missing.length === 1 && (missing[0] === w || missing[0] === w + 4)) {
          combos.push([r1, r2]);
        }
      }
    }
  }
  return combos;
}

/** Gera uma mão de drill pós-flop — sempre compatível com o spot. */
export function generatePostflopDrillHand(
  spot: PostflopDrillSpot,
  rng: () => number = Math.random,
): PostflopDrillHand {
  const board = pick(spot.boards, rng);
  return buildPostflopDrillHand(spot, board, rng);
}

/** Monta o PostflopDrillHand com board e mão dados. */
export function buildPostflopDrillHand(
  spot: PostflopDrillSpot,
  board: Card[],
  rng: () => number,
): PostflopDrillHand {
  const hand = generateHandForSpot(spot, board, rng);

  // Calcular equity vs villain range
  const villainRange = buildTopRange(spot.villainRangePct);
  const villainCombos = rangeCombos(villainRange);
  const eq = equityHandVsRange(hand, villainCombos, board, 2000, rng);
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
    board,
    spot,
    equity,
    potOdds,
    evLabel,
    bestAction,
    explanation,
  };
}

/** Monta o PostflopDrillHand a partir de board e mão já decididos. */
function handFromSpot(
  spot: PostflopDrillSpot,
  board: Card[],
  hand: Card[],
  rng: () => number,
): PostflopDrillHand {
  const res = buildPostflopDrillHand(spot, board, rng);
  res.hand = hand; // usa a mão escolhida pela sessão (sem repetição), não a regenerada
  return res;
}

/** Uma frase curta identificando o que a mão é neste spot. */
function spotHandNote(spot: PostflopDrillSpot, hand: Card[]): string {
  const br = (c: Card) => "23456789TJQKA"[rankOf(c) - 2];
  const bs = (c: Card) => "♣♦♥♠"[suitOf(c)];
  const label = `${br(hand[0])}${bs(hand[0])}${br(hand[1])}${bs(hand[1])}`;
  switch (spot.id) {
    case "flush_draw":
      return `${label}: flush draw — 9 outs de flush.`;
    case "top_pair":
      return `${label}: top pair neste board seco.`;
    case "overpair":
      return `${label}: overpair — par maior que o board.`;
    case "monster_dry":
      return `${label}: mão monstruosa neste board seco.`;
    case "air_facing_bet":
      return `${label}: ar puro — sem par, sem draw.`;
    case "straight_draw":
      return `${label}: straight draw aberto.`;
    default:
      return `${label}:`;
  }
}

/**
 * Cria uma sessão de drill pós-flop SEM repetição: cada jogada recebe um
 * board único da pool e uma mão única — como num torneio de verdade.
 */
/** Embaralha boards (arrays de cartas) com o mesmo RNG — shim para o shuffle fixo em Card[]. */
function shuffleBoards(boards: Card[][], rng: () => number): Card[][] {
  const arr = [...boards];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/** Chave de uma mão: cartas ordenadas (rank + naipe) — uma mão de pôquer
 * é a combinação exata das 2 cartas; A♣A♦ ≠ A♥A♠. Isso dá ~500 chaves
 * válidas por spot contra 30 mãos, eliminando a repetição. */
function handKey(hand: Card[]): string {
  return [hand[0], hand[1]].sort((a, b) => a - b).join(",");
}

/**
 * Cria uma sessão de drill pós-flop SEM repetição: boards rotacionam pela
 * pool embaralhada (10 texturas distintas) e cada mão é única na sessão —
 * como num torneio de verdade, onde a mesma mão nunca aparece duas vezes.
 * Nota: cartas da mão podem se repetir entre mãos (o baralho se
 * reembaralha a cada mão), mas a COMBINAÇÃO nunca repete.
 */
export function createPostflopDrillSession(
  spotId: string,
  handCount = 30,
  rng = Math.random,
): PostflopDrillSession {
  const spot = POSTFLOP_DRILL_SPOTS.find((s) => s.id === spotId) ?? POSTFLOP_DRILL_SPOTS[0];

  // Pool de boards embaralhada — rotaciona sem repetição imediata
  const boards = shuffleBoards([...spot.boards], rng);

  const hands: PostflopDrillHand[] = [];
  const usedHandKeys = new Set<string>();
  for (let i = 0; i < handCount; i++) {
    const board = boards[i % boards.length];
    // gera mãos até achar uma nunca vista na sessão (1326 combos → fácil).
    // tenta primeiro com o board corrente; se 200 tentativas não bastarem
    // (escassez de combos válidos), aceita com repetição mínima.
    let finalHand: Card[] = generateHandForSpot(spot, board, rng);
    let found = false;
    for (let attempt = 0; attempt < 200 && !found; attempt++) {
      const candidate = generateHandForSpot(spot, board, rng);
      const key = handKey(candidate);
      const freshInThisHand = new Set<Card>(board);
      if (!usedHandKeys.has(key) && candidate.filter((c) => !freshInThisHand.has(c)).length === 2) {
        finalHand = candidate;
        found = true;
      }
    }
    usedHandKeys.add(handKey(finalHand));

    hands.push(handFromSpot(spot, board, finalHand, rng));
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

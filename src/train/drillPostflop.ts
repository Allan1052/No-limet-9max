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

/** Boards com 2 cartas do mesmo naipe — flush draw. 30 texturas:
 * naipes variados (♣♦♥♠), regiões baixa/média/alta e conectividade variada.
 * Nenhum board compartilha 2 ranks com outro da mesma região dominante. */
const FLUSH_DRAW_BOARDS: string[][] = [
  // ♥ — baixos
  ["7h", "3h", "2s"],
  ["9h", "4h", "8c"],
  ["5h", "Ah", "2d"],
  // ♥ — médios/altos
  ["Qh", "6h", "3s"],
  ["8h", "2h", "9d"],
  ["Th", "4h", "6c"],
  ["Ah", "7h", "4s"],
  ["6h", "9h", "Jc"],
  ["Kh", "5h", "2s"],
  ["3h", "Jh", "7d"],
  // ♦ — baixos
  ["8d", "4d", "9s"],
  ["6d", "2d", "7h"],
  // ♦ — médios/altos
  ["Qd", "5d", "3c"],
  ["Ad", "7d", "2s"],
  ["9d", "3d", "Kh"],
  ["7d", "2d", "Tc"],
  ["Jd", "6d", "4s"],
  ["5d", "Kd", "8h"],
  // ♠ — baixos
  ["9s", "3s", "6h"],
  ["7s", "2s", "Td"],
  // ♠ — médios/altos
  ["Qs", "5s", "8d"],
  ["As", "6s", "3h"],
  ["8s", "3s", "Jd"],
  ["5s", "Ks", "2c"],
  ["Js", "4s", "9h"],
  ["6s", "Ts", "Ah"],
  // ♣ — mistos
  ["7c", "2c", "Qh"],
  ["9c", "4c", "Ad"],
  ["Tc", "3c", "5s"],
  ["Jc", "6c", "2h"],
];

/** Boards secos com carta alta — top pair. 15 boards, no máximo um por
 * top rank: o rank do par do herói (o topo do board) nunca se repete na
 * sessão de 15 mãos — textura variada de seco/baixo a semi-conectado. */
const TOP_PAIR_BOARDS: string[][] = [
  // 15 boards — UM por top rank: A, K, Q, J, T, 9..3 + extras. Assim a
  // sessão de 15 mãos TEMPO 100% diferente em rank de par (percepção de
  // Allan: "par de rei umas 10 vezes" — nunca mais).
  // Texturas variadas: seco/baixo, molhado/médio, conectado/alto.
  ["Ah", "3d", "8c"], // top A — seco baixo
  ["As", "6d", "2c"], // top A — seco
  ["Kh", "7d", "2c"], // top K — seco baixo
  ["Kd", "4h", "9s"], // top K — seco médio-alto
  ["Qh", "5d", "2c"], // top Q — seco baixo
  ["Qd", "8c", "3s"], // top Q — seco médio
  ["Jh", "7d", "2s"], // top J — seco baixo
  ["Js", "4c", "9d"], // top J — desconectado
  ["Th", "8d", "3s"], // top T — semi-conectado
  ["Ts", "6c", "9h"], // top T — meio molhado
  ["9h", "7d", "2c"], // top 9 — semi-conectado baixo
  ["8h", "5d", "2c"], // top 8 — seco baixo
  ["7h", "4d", "2s"], // top 7 — arco-íris muito seco
  ["6h", "4d", "2c"], // top 6 — rainbow low
  ["5h", "3d", "2s"], // top 5 — conectividade baixa total
];

/** Boards secos com carta média-baixa — overpair TT+. 12 texturas:
 * cada topo aparece no máximo 2×; a sessão reserva 1 rank de par por
 * board (greedy prefere o rank livre mais alto — TT+/JJ+ de verdade). */
const OVERPAIR_BOARDS: string[][] = [
  // 12 boards — cada top do board aparece no máximo 2×, com naipes e
  // kickers variados; o greedy reserva 1 rank de par por board, garantindo
  // que nenhum par se repete na sessão de 12 mãos.
  ["9c", "3d", "5s"], // max 9 — seco baixo
  ["8h", "4d", "2c"], // max 8 — rainbow seco
  ["7s", "3c", "5d"], // max 7 — arco-íris
  ["6h", "2s", "4c"], // max 6 — rainbow low
  ["5h", "2c", "7d"], // max 7 — seco
  ["4c", "8d", "2s"], // max 8 — disconnected
  ["Th", "4s", "6c"], // max 10 — semi-conectado
  ["Td", "5c", "3s"], // max 10 — low-mid
  ["8c", "6s", "3d"], // max 8 — mid
  ["7h", "5s", "4d"], // max 7 — conectado baixo
  ["9h", "5c", "2d"], // max 9 — seco
  ["6c", "3h", "8d"], // max 8 — varied
];

/** Boards secos com carta alta + 2 baixas — monarca Ax / trinca baixa.
 * 15 texturas: monarcas A/K/Q/J/T/9 com cartas baixas variadas — o greedy
 * reserva 1 rank (monarca ou trinca) por board sem repetir. */
const MONSTER_DRY_BOARDS: string[][] = [
  // 15 boards — o herói pode ter monarca (AA/KK) OU trinca de carta baixa
  // do board. As cartas baixas variam tanto que o greedy nunca repete o
  // rank da trinca/monarca: cada board oferece 3 ranks, 45 slots para 15
  // mãos.
  ["Ah", "5d", "2c"], // monarca A
  ["Ad", "6h", "3s"], // monarca A
  ["As", "4c", "7d"], // monarca A
  ["Ac", "8s", "2h"], // monarca A
  ["Ah", "3d", "9s"], // monarca A
  ["Kh", "4d", "2s"], // monarca K
  ["Ks", "6c", "3d"], // monarca K
  ["Kc", "5h", "2d"], // monarca K
  ["Kd", "7s", "3c"], // monarca K
  ["Qh", "4c", "2d"], // monarca Q
  ["Qs", "5d", "3c"], // monarca Q
  ["Jh", "4d", "2s"], // monarca J
  ["Js", "5c", "3d"], // monarca J
  ["Th", "4s", "2c"], // monarca T
  ["9h", "4d", "2s"], // monarca 9
];

/** Boards secos altos — air puro sem par/draw. 30 texturas:
 * cartas altas variadas (A, K, Q, J), naipes variados, sem dominância. */
const AIR_FACING_BET_BOARDS: string[][] = [
  // Q alto
  ["Qs", "8d", "3c"],
  ["Qc", "7h", "4d"],
  ["Qd", "9s", "2h"],
  ["Qh", "6c", "3s"],
  ["Qs", "5d", "9h"],
  ["Qc", "8s", "2d"],
  // K alto
  ["Ks", "9d", "4c"],
  ["Kc", "7s", "3h"],
  ["Kd", "6h", "2s"],
  ["Kh", "8c", "5d"],
  ["Ks", "4d", "9h"],
  ["Kc", "7d", "2s"],
  // J alto
  ["Js", "8d", "3c"],
  ["Jc", "9h", "4s"],
  ["Jd", "7c", "2h"],
  ["Jh", "6s", "5d"],
  ["Js", "9c", "3d"],
  ["Jc", "5h", "8d"],
  // A alto
  ["As", "7d", "4c"],
  ["Ac", "8h", "3d"],
  ["Ad", "6s", "2h"],
  ["Ah", "9c", "5d"],
  ["As", "4d", "7c"],
  ["Ac", "5h", "2s"],
  // mistos
  ["Qs", "6d", "8h"],
  ["Kh", "3c", "7s"],
  ["Js", "6d", "9c"],
  ["As", "5c", "8h"],
  ["Qh", "3s", "7c"],
  ["Kd", "9c", "4s"],
];

/** Boards conectados — OESD real com o hero. 30 texturas:
 * conectados em várias regiões do board (5-6, 6-7, 7-8, 8-9, 9-T) com
 * kickers variados em regiões baixa/média/alta e naipes variados. */
const STRAIGHT_DRAW_BOARDS: string[][] = [
  // conectados 8-7
  ["8h", "7d", "2c"],
  ["8s", "7c", "5d"],
  ["8c", "7h", "Td"],
  ["8d", "7s", "3h"],
  ["8h", "7c", "Ah"],
  ["8s", "7d", "6c"],
  // conectados 9-8
  ["9h", "8d", "3c"],
  ["9s", "8c", "2h"],
  ["9c", "8h", "5d"],
  ["9d", "8s", "Th"],
  ["9h", "8c", "6s"],
  ["9s", "8d", "Ah"],
  // conectados 7-6
  ["7h", "6d", "2c"],
  ["7s", "6c", "4h"],
  ["7c", "6h", "9d"],
  ["7d", "6s", "Ts"],
  ["7h", "6c", "3s"],
  ["7s", "6d", "Jc"],
  // conectados T-9
  ["Th", "9d", "3c"],
  ["Ts", "9c", "2h"],
  ["Tc", "9h", "5d"],
  ["Td", "9s", "7h"],
  ["Th", "9c", "4s"],
  ["Ts", "9d", "Jh"],
  // conectados 6-5 / 5-4
  ["6h", "5d", "2c"],
  ["5s", "4c", "9h"],
  ["6c", "5h", "Td"],
  ["5d", "4s", "Kh"],
  // conectados 9-7 / 8-6 (gap draw)
  ["9h", "7c", "2s"],
  ["8h", "6c", "3d"],
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
    // handCount reduzido: o top pair usa o rank do topo do board — repetir
    // boards com o mesmo topo repetiria o par. 15 boards distintos garantem
    // ranks de par únicos em toda a sessão.
    handCount: 15,
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
    // idem: overpair precisa de rank > topo do board; cada board reserva 1
    // rank de par único — os ranks úteis (9..A) são 6, então 6 mãos com par
    // distinto de verdade (TT, JJ, QQ, KK, AA + 99). Pool de 12 texturas
    // garante board novo e diferente a cada mão.
    handCount: 6,
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
    // idem: monarca/trinca usa o rank de uma carta do board; os ranks
    // únicos viáveis (A, K e 2..8) são 9 — então 9 mãos com par/trinca
    // distinto de verdade. Pool de 15 texturas garante board novo a cada.
    handCount: 9,
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
export function generateHandForSpot(
  spot: PostflopDrillSpot,
  board: Card[],
  rng: () => number,
  /** Rank de par reservado pela sessão (spots de par) — evita repetição de par na sessão. */
  reservedRank?: number,
  /** Top_pair: rank do kicker reservado pelo combo único da sessão. */
  reservedKickerRank?: number,
  /** Top_pair: naipe da carta do top reservado pelo combo único da sessão. */
  reservedTopSuit?: number,
): Card[] {
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
    // FLUSH DRAW — board com 2 cartas do mesmo naipe: herói recebe 2 cartas
    // desse EXATO naipe (9 outs). O naipe do draw vem do board, nunca fixo.
    case "flush_draw": {
      const hand: Card[] = [];
      const counts = [0, 0, 0, 0];
      for (const c of board) counts[suitOf(c)]++;
      // naipe do draw = o único naipe com 2+ cartas no board
      const drawSuit = counts.findIndex((n) => n >= 2) >= 0 ? counts.findIndex((n) => n >= 2) : 0;
      const candidates: Card[] = [];
      for (let rank = 2; rank <= 14; rank++) {
        const c = card(rank, drawSuit);
        if (c !== undefined) candidates.push(c);
      }
      take(pick(candidates, rng), hand);
      const rest = candidates.filter((c) => !dead.has(c));
      take(rest.length > 0 ? pick(rest, rng) : undefined, hand);
      if (hand.length < 2) {
        // fallback: board com 3 cartas do draw (só sobrou 1) — pega 1 do draw
        // + 1 carta de outro naipe para não quebrar a sessão
        const other: Card[] = [];
        for (let rank = 2; rank <= 14; rank++) {
          for (let s = 0; s < 4; s++) {
            if (s === drawSuit) continue;
            const c = card(rank, s);
            if (c !== undefined) other.push(c);
          }
        }
        take(pick(other, rng), hand);
      }
      return hand;
    }

    // TOP PAIR — board com carta alta: herói recebe a carta alta do board + kicker.
    // O "par" aqui é sempre do top rank do board; a sessão reserva o naipe do
    // top para evitar colisão de mão exata entre boards com o mesmo topo.
    case "top_pair": {
      const hand: Card[] = [];
      // carta alta do board (o "top" do top pair)
      const topCard = board.reduce((a, b) => (rankOf(b) > rankOf(a) ? b : a));
      const topRank = rankOf(topCard);
      // O naipe do top vem da reserva da sessão (nunca repete o mesmo combo)
      const tops = [0, 1, 2, 3]
        .map((s) => card(topRank, s))
        .filter((c): c is Card => c !== undefined);
      const topChoice =
        reservedTopSuit !== undefined
          ? tops.find((c) => suitOf(c) === reservedTopSuit) ?? pick(tops, rng)
          : pick(tops, rng);
      take(topChoice, hand);
      // kicker SEMPRE menor que o top do board — senão a mão passa a ser
      // Ax/Kx sem par (não é top pair) e o título do spot mente.
      const kickers: Card[] = [];
      for (let rank = 2; rank < topRank; rank++) {
        for (let s = 0; s < 4; s++) {
          const c = card(rank, s);
          if (c !== undefined) kickers.push(c);
        }
      }
      // kicker reservado pelo combo único da sessão (se houver)
      const reservedKicker = reservedKickerRank; // passado como parâmetro extra
      if (reservedKicker !== undefined) {
        const reservedKickers = kickers.filter((c) => rankOf(c) === reservedKicker);
        take(pick(reservedKickers.length > 0 ? reservedKickers : kickers, rng), hand);
      } else {
        take(pick(kickers, rng), hand);
      }
      return hand;
    }

    // OVERPAIR — board com carta média-baixa: herói recebe TT/JJ/QQ/KK/AA.
    // Se a sessão reservou um rank, o par é construído EXATAMENTE nele.
    case "overpair": {
      const boardMax = Math.max(...board.map((c) => rankOf(c)));
      const pairRank = reservedRank ?? pick(
        Array.from({ length: 14 - boardMax }, (_, k) => boardMax + 1 + k),
        rng,
      );
      const suits = [0, 1, 2, 3]
        .map((s) => card(pairRank, s))
        .filter((c): c is Card => c !== undefined);
      const pairs: Card[][] = [];
      for (let i = 0; i < suits.length; i++) {
        for (let j = i + 1; j < suits.length; j++) {
          pairs.push([suits[i], suits[j]]);
        }
      }
      return pairs.length > 0 ? pick(pairs, rng) : [suits[0]!, suits[1]!];
    }

    // TRINCA/MONARCA — board com carta alta (A ou K) + 2 baixas.
    // 50% monarca (PAR da carta alta do board, ex.: A♥A♦ no board Ah-4-2),
    // 50% trinca (par na mão de uma das cartas baixas do board).
    case "monster_dry": {
      const hand: Card[] = [];
      const highCard = board.reduce((a, b) => (rankOf(b) > rankOf(a) ? b : a));
      const lowBoard = board.filter((c) => c !== highCard);
      const wantMonarch = reservedRank === rankOf(highCard) || (reservedRank === undefined && rng() < 0.5);
      if (wantMonarch) {
        // Monarca: PAR da carta alta do board — a 3ª carta do mesmo rank
        // fecha a trinca; é o "set de monarca" do título.
        const suits = [0, 1, 2, 3]
          .map((s) => card(rankOf(highCard), s))
          .filter((c): c is Card => c !== undefined);
        take(pick(suits, rng), hand);
        take(pick(suits.filter((c) => !dead.has(c)), rng), hand);
      } else {
        // Trinca: par na mão de uma das cartas baixas do board.
        // Se a sessão reservou um rank de trinca (diferente do topo), usa ele.
        const lowOfReserved = reservedRank
          ? lowBoard.find((c) => rankOf(c) === reservedRank)
          : undefined;
        const boardRank = lowOfReserved ?? pick(lowBoard, rng);
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

  const spotNote = spotHandNote(spot, hand, board);
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

/** Nome de exibição de uma carta (ex.: "Q♠"). */
function cardLabel(c: Card): string {
  return `${"23456789TJQKA"[rankOf(c) - 2]}${"♣♦♥♠"[suitOf(c)]}`;
}

/** Ranks do board como labels (ex.: "K♥ 3♦ 7♣"). */
function boardLabel(board: Card[]): string {
  return board.map((c) => cardLabel(c)).join(" ");
}

/** Textura do board: alto/médio/baixo e seco. */
function boardTexture(board: Card[]): string {
  const ranks = board.map((c) => rankOf(c));
  const minR = Math.min(...ranks);
  let alt = minR >= 8 ? "alto" : minR >= 4 ? "médio" : "baixo";
  return `${alt} e seco`;
}

/** Uma frase específica explicando o que a mão é neste board e por quê.
 * Cita os ranks exatos, a textura do board e o motivo da ação — nada genérico. */
function spotHandNote(spot: PostflopDrillSpot, hand: Card[], board: Card[]): string {
  const [h0, h1] = hand;
  const label = `${cardLabel(h0)}${cardLabel(h1)}`;
  const brd = boardLabel(board);
  const texture = boardTexture(board);
  switch (spot.id) {
    case "flush_draw": {
      const suitNames = ["paus", "ouros", "copas", "espadas"];
      const drawSuit = suitNames[suitOf(h0)];
      return `${label}: flush draw de ${drawSuit} — 9 outs de flush (${"~36%"} até o river) no board ${brd}, ${texture}.`;
    }
    case "top_pair": {
      const topCard = board.reduce((a, b) => (rankOf(b) > rankOf(a) ? b : a));
      return `${label}: top pair com o ${cardLabel(topCard)} do board ${brd} — board ${texture}, a aposta do vilão extrai valor de pares menores.`;
    }
    case "overpair": {
      return `${label}: overpair de ${"23456789TJQKA"[rankOf(h0) - 2]}s — seu par bate qualquer carta do board ${brd}. Aposte para valor e proteção.`;
    }
    case "monster_dry": {
      const highCard = board.reduce((a, b) => (rankOf(b) > rankOf(a) ? b : a));
      const isMonarch = rankOf(h0) === rankOf(highCard);
      if (isMonarch) {
        return `${label}: monarca de ${cardLabel(highCard)} no board ${brd} — você fecha a trinca, a nuts. Aposte para construir o pote.`;
      }
      return `${label}: trinca de ${"23456789TJQKA"[rankOf(h0) - 2]}s no board ${brd} — mão monstruosa em textura ${texture}. Aposte para extrair valor.`;
    }
    case "air_facing_bet":
      return `${label}: ar puro no board ${brd} — sem par, sem draw, outs irrelevantes. Contra a aposta do vilão, foldar preserva fichas para spots melhores.`;
    case "straight_draw": {
      const boardRanks = board.map((c) => rankOf(c)).sort((a, b) => a - b);
      const all = Array.from(new Set([...boardRanks, rankOf(h0), rankOf(h1)])).sort((a, b) => a - b);
      // a janela de 5 ranks do draw
      let window: number[] = [];
      for (let w = 2; w <= 10; w++) {
        const cand = [w, w + 1, w + 2, w + 3, w + 4];
        if (cand.filter((r) => all.includes(r)).length === 4) {
          window = cand;
          break;
        }
      }
      const outs = 8;
      const pct = window.includes(2) || window.includes(3) ? "~31%" : "~31%";
      return `${label}: open-ended straight draw (${window[0]}-${window[window.length - 1]}) no board ${brd} — ${outs} outs (${pct} até o river). ${""}`;
    }
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
 * é a combinação exata das 2 cartas (rank + naipe); A♣A♦ ≠ A♥A♠.
 * Allan (16/08): a unicidade do RANK de par na percepção do jogador é
 * garantida pelo reservedRank da sessão — nenhum par de mesmo rank
 * entra duas vezes, com qualquer naipe. */
function handKey(hand: Card[]): string {
  // chave completa (rank + naipe) — cada combo é único: T♣T♦ ≠ T♣T♥.
  // A unicidade de RANK de par na sessão é garantida pelo reservedRank
  // da sessão, não pela chave.
  return [hand[0], hand[1]].sort((a, b) => a - b).join(",");
}

/**
 * Cria uma sessão de drill pós-flop SEM repetição: cada board é único
 * (pool de 30 texturas distintas = 1 por mão) e nenhuma mão repete — nem
 * mesmo um pocket pair de mesmo rank com naipes diferentes. Como num
 * torneio de verdade.
 *
 * Para evitar a sensação de "o flop muda só 1-2 cartas", os boards são
 * reordenados de forma que vizinhos nunca compartilhem 2 ou mais ranks.
 */
export function createPostflopDrillSession(
  spotId: string,
  handCount = 30,
  rng = Math.random,
): PostflopDrillSession {
  const spot = POSTFLOP_DRILL_SPOTS.find((s) => s.id === spotId) ?? POSTFLOP_DRILL_SPOTS[0];

  // Pool de boards embaralhada, garantindo que vizinhos sejam distintos
  // de verdade (não compartilham 2+ ranks).
  let boards = shuffleBoards([...spot.boards], rng);
  for (let pass = 0; pass < 64; pass++) {
    let good = true;
    for (let i = 1; i < boards.length; i++) {
      const a = new Set(boards[i - 1].map((c) => rankOf(c)));
      const shared = boards[i].filter((c) => a.has(rankOf(c))).length;
      if (shared >= 2) {
        good = false;
        // troca o board problemático com um aleatório distante
        const j = Math.floor(rng() * boards.length);
        const tmp = boards[i];
        boards[i] = boards[j];
        boards[j] = tmp;
        break;
      }
    }
    if (good) break;
  }
  // trunca (se preciso) ou repete a pool mínima — nunca repete vizinhos
  const ordered: Card[][] = [];
  const taken = new Set<number>();
  for (let i = 0; i < handCount; i++) {
    const idx = i % boards.length;
    if (i > 0 && ordered.length > 0) {
      const prev = new Set(ordered[ordered.length - 1].map((c) => rankOf(c)));
      if (boards[idx].filter((c) => prev.has(rankOf(c))).length >= 2) {
        // busca outro board da pool que não seja similar ao anterior
        let alt = -1;
        for (let k = 0; k < boards.length; k++) {
          if (!taken.has(k) && boards[k].filter((c) => prev.has(rankOf(c))).length < 2) {
            alt = k;
            break;
          }
        }
        if (alt === -1) {
          // pool esgotada em texturas distintas — aceita o mais diferente disponível
          alt = boards
            .map((b, k) => ({ k, dist: b.filter((c) => prev.has(rankOf(c))).length }))
            .filter((x) => !taken.has(x.k))
            .sort((a, b) => a.dist - b.dist)[0]?.k ?? 0;
        }
        taken.add(alt);
        ordered.push(boards[alt]);
        continue;
      }
    }
    if (!taken.has(idx)) taken.add(idx);
    ordered.push(boards[idx]);
  }

  // Allan (16/08): pocket pairs rastreiam o RANK, não os naipes — QQ♠♣ e
  // QQ♥♦ são o mesmo "par de damas" na percepção do jogador. Para garantir
  // matematicamente que o MESMO RANK de par nunca repete na sessão, a sessão
  // ATRIBUI de antemão um rank distinto a cada board (greedy: boards com
  // menos opções recebem primeiro) e a mão final é construída em cima desse
  // rank reservado. Mãos não-pares continuam com chave completa (cards).
  const isPairSpot =
    spot.id === "overpair" || spot.id === "monster_dry" || spot.id === "top_pair";
  const pairRankOfBoard = (b: Card[]): number =>
    Math.max(...b.map((c) => rankOf(c)));
  // reservedRankAssign[i] = valor reservado para a mão do board i. Semântica:
  //   - overpair:   rank do par (par > topo do board) — nunca repete na sessão
  //   - monster_dry: rank da carta do board usada no par (monarca ou trinca)
  //   - top_pair:   NAIPE da carta do top do board (o rank é o topo do board,
  //                 fixo; o naipe é o que diferencia A♠Kx de A♥Kx)
  let reservedRankAssign = new Map<number, number>();
  let reservedKickerAssign = new Map<number, number>();
  let reservedSuitAssign = new Map<number, number>();
  if (isPairSpot) {
    const boardsSorted = ordered
      .map((b, i) => ({ b, i, max: pairRankOfBoard(b) }))
      .sort((a, c) => c.max - a.max);
    // contador por board de quantas vezes cada reserva foi usada — o greedy
    // prefere sempre a opção menos usada, garantindo distribuição uniforme.
    if (spot.id === "top_pair") {
      // Reserva por board = COMBO (naipe do top + rank do kicker), único
      // globalmente na sessão. Espaçso: 4 naipes × ~12 ranks de kicker = 48
      // slots > 15 mãos, sempre cabe. Assim nenhuma mão de top pair repete
      // mesmo quando vários boards dividem o mesmo topo (ex.: 8 boards com
      // top de Ás).
      const usedComboTimes = new Map<string, number>();
      for (const { b, i } of boardsSorted) {
        const top = pairRankOfBoard(b);
        const options: string[] = [];
        for (let suit = 0; suit < 4; suit++) {
          for (let kickerRank = 2; kickerRank < top; kickerRank++) {
            options.push(`${suit},${kickerRank}`);
          }
        }
        const usedCount = new Map<string, number>();
        for (const o of options) usedCount.set(o, usedComboTimes.get(o) ?? 0);
        options.sort((a, c) => (usedCount.get(a) ?? 0) - (usedCount.get(c) ?? 0));
        const chosen = options[0];
        usedComboTimes.set(chosen, (usedComboTimes.get(chosen) ?? 0) + 1);
        reservedRankAssign.set(i, Number(chosen.split(",")[1])); // kicker rank
        reservedKickerAssign.set(i, Number(chosen.split(",")[1])); // kicker rank (top_pair)
        reservedSuitAssign.set(i, Number(chosen.split(",")[0])); // suit do top
      }
    } else {
      // Reserva de rank de par POR BOARD: o rank escolhido fica
      // INDISPONÍVEL para os próximos boards (rank único na sessão —
      // "par de rei umas 10 vezes" nunca mais). O greedy prefere o rank
      // LIVRE mais alto (overpair TT+/JJ+ de verdade; trinca da carta
      // mais alta disponível no monster). Sem fallback inválido: se um
      // board não tiver rank livre, ele não gera mão e o handCount real
      // da sessão é reduzido — melhor 6 mãos distintas que 12 com 5 pares
      // de ases repetidos.
      const usedRanks = new Set<number>();
      const unallocable: number[] = []; // boards sem rank livre
      for (const { b, i } of boardsSorted) {
        const isMonster = spot.id === "monster_dry";
        const options: number[] = isMonster
          ? b.map((c) => rankOf(c))
          : Array.from({ length: 14 - pairRankOfBoard(b) }, (_, k) => pairRankOfBoard(b) + 1 + k);
        const free = options.filter((r) => !usedRanks.has(r));
        free.sort((a, c) => c - a); // o mais alto livre primeiro
        if (free.length === 0) {
          unallocable.push(i);
          continue;
        }
        usedRanks.add(free[0]);
        reservedRankAssign.set(i, free[0]);
      }
      // boards sem rank de par disponível ficam fora da sessão
      if (unallocable.length > 0) handCount -= unallocable.length;
    }
  }

  // spots de par: boards alocados (com rank reservado) vêm primeiro —
  // assim ordered[i] sempre tem a reserva e nenhuma mão nasce "solta".
  if (isPairSpot) {
    const allocated = ordered.filter((_, idx) => reservedRankAssign.has(idx));
    const rest = ordered.filter((_, idx) => !reservedRankAssign.has(idx));
    ordered.length = 0;
    ordered.push(...allocated, ...rest);
  }

  const hands: PostflopDrillHand[] = [];
  const usedHandKeys = new Set<string>();
  for (let i = 0; i < handCount; i++) {
    const board = ordered[i];
    const reservedRank = isPairSpot ? reservedRankAssign.get(i) : undefined;
    const boardTop = pairRankOfBoard(board);
    // gera mãos até achar uma nunca vista na sessão e compatível com o
    // rank reservado (se for spot de par). handCount cabe nos ranks
    // disponíveis, então a repetição não acontece mais.
    const reservedKicker =
      spot.id === "top_pair" ? reservedKickerAssign.get(i) : undefined;
    const reservedTopSuit =
      spot.id === "top_pair" ? reservedSuitAssign.get(i) : undefined;
    let finalHand: Card[] = generateHandForSpot(
      spot,
      board,
      rng,
      reservedRank,
      reservedKicker,
      reservedTopSuit,
    );
    let found = false;
    for (let attempt = 0; attempt < 200 && !found; attempt++) {
      const candidate = generateHandForSpot(
        spot,
        board,
        rng,
        reservedRank,
        reservedKicker,
        reservedTopSuit,
      );
      const key = handKey(candidate);
      const freshInThisHand = new Set<Card>(board);
      const rankMatch =
        reservedRank === undefined
          ? true
          : // top_pair: a reserva é o NAIPE da carta do topo; overpair/monster:
            // a reserva é o rank do par
            spot.id === "top_pair"
            ? (() => {
                // a mão pode vir ordenada (kicker < top ou top < kicker); a
                // carta do topo do board precisa estar na mão com o naipe
                // reservado E o kicker com o rank reservado
                const topCard = candidate.find((c) => rankOf(c) === boardTop);
                const kicker = candidate.find((c) => c !== topCard);
                return (
                  topCard !== undefined &&
                  kicker !== undefined &&
                  suitOf(topCard) === (reservedSuitAssign.get(i) ?? -1) &&
                  rankOf(kicker) === reservedRank
                );
              })()
            : rankOf(candidate[0]) === reservedRank;
      if (
        !usedHandKeys.has(key) &&
        rankMatch &&
        candidate.filter((c) => !freshInThisHand.has(c)).length === 2
      ) {
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

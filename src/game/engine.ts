// ---------------------------------------------------------------------------
// Motor de jogo (state machine).
//
// Fluxo de uma mão:
//   startHand → posta antes/blinds e distribui → rodadas de aposta por rua →
//   flop/turn/river → showdown → distribui os potes.
//
// Aplicamos ações com `applyAction`, que sozinho avança a vez, troca de rua e
// resolve a mão quando a aposta fecha. `legalActions` (em betting.ts) diz o que
// é permitido em cada momento.
//
// Nota honesta: as regras de aposta cobrem corretamente as linhas normais e
// side pots. Um all-in que aumenta por MENOS que um aumento cheio ("raise
// parcial") não reabre o direito de re-raise no poker oficial; nesta v1 ele
// pode, em casos raros, reabrir — é uma simplificação documentada, sem impacto
// no estudo de mãos típicas.
// ---------------------------------------------------------------------------

import { fullDeck, shuffle, type Card } from "../engine/cards";
import { computePots, settlePots } from "./betting";
import {
  actingSeats,
  inHandSeats,
  nextActingSeat,
  type PlayerState,
  type Street,
  type TableConfig,
  type TableState,
} from "./state";

export interface SeatConfig {
  name: string;
  profileId?: string;
  isHero?: boolean;
  stack: number;
}

export function freshShuffledDeck(rng: () => number = Math.random): Card[] {
  return shuffle(fullDeck(), rng);
}

/** Cria a mesa (jogadores e config), com o botão em `buttonSeat`. */
export function createTable(
  config: TableConfig,
  seats: SeatConfig[],
  buttonSeat = 0,
): TableState {
  const players: PlayerState[] = seats.map((s, i) => ({
    seat: i,
    name: s.name,
    profileId: s.profileId,
    isHero: !!s.isHero,
    stack: s.stack,
    committed: 0,
    totalCommitted: 0,
    acted: false,
    status: s.stack > 0 ? "active" : "out",
    holeCards: [],
  }));

  return {
    players,
    buttonSeat,
    smallBlind: config.smallBlind,
    bigBlind: config.bigBlind,
    ante: config.ante ?? 0,
    board: [],
    street: "complete",
    currentBet: 0,
    minRaiseAmount: config.bigBlind,
    toAct: -1,
    lastAggressor: -1,
    deck: [],
    handOver: true,
    log: [],
  };
}

/** Soma de tudo que já foi para o pote nesta mão. */
export function totalPot(t: TableState): number {
  return t.players.reduce((s, p) => s + p.totalCommitted, 0);
}

function occupiedSeatsInOrder(t: TableState, from: number): number[] {
  const n = t.players.length;
  const out: number[] = [];
  for (let i = 1; i <= n; i++) {
    const s = (from + i) % n;
    if (t.players[s].status !== "out") out.push(s);
  }
  return out;
}

function postBlind(p: PlayerState, amount: number): void {
  const put = Math.min(amount, p.stack);
  p.committed += put;
  p.totalCommitted += put;
  p.stack -= put;
  if (p.stack === 0) p.status = "allin";
}

/** Inicia uma nova mão com um baralho (52 cartas) já embaralhado. */
export function startHand(t: TableState, deck: Card[]): TableState {
  // Reset por mão.
  for (const p of t.players) {
    p.committed = 0;
    p.totalCommitted = 0;
    p.acted = false;
    p.holeCards = [];
    p.status = p.stack > 0 ? "active" : "out";
  }
  t.board = [];
  t.street = "preflop";
  t.currentBet = 0;
  t.minRaiseAmount = t.bigBlind;
  t.handOver = false;
  t.result = undefined;
  t.log = [];
  t.deck = deck.slice();

  const seated = t.players.filter((p) => p.status !== "out");
  if (seated.length < 2) throw new Error("Precisa de ao menos 2 jogadores com fichas.");

  // Antes (se houver).
  if (t.ante > 0) {
    for (const p of t.players) {
      if (p.status === "active") postAnte(p, t.ante);
    }
  }

  // Blinds. `order` = assentos ocupados começando após o botão e terminando no
  // próprio botão (portanto order[0] = SB, order[1] = BB no jogo com 3+).
  const order = occupiedSeatsInOrder(t, t.buttonSeat);
  let sbSeat: number;
  let bbSeat: number;
  if (seated.length === 2) {
    // Heads-up: o botão posta o small blind.
    sbSeat = t.buttonSeat;
    bbSeat = order[0]; // o outro jogador
  } else {
    sbSeat = order[0];
    bbSeat = order[1];
  }

  postBlind(t.players[sbSeat], t.smallBlind);
  postBlind(t.players[bbSeat], t.bigBlind);
  t.currentBet = t.bigBlind;
  t.lastAggressor = -1; // o BB é forçado, não conta como "abertura"
  t.log.push(`Botão no assento ${t.buttonSeat}. SB: ${t.players[sbSeat].name}, BB: ${t.players[bbSeat].name}.`);

  // Distribui 2 cartas para cada jogador ativo, começando após o botão.
  for (let round = 0; round < 2; round++) {
    for (const s of occupiedSeatsInOrder(t, t.buttonSeat)) {
      t.players[s].holeCards.push(t.deck.pop()!);
    }
  }

  // Primeiro a agir no pré-flop: logo após o BB.
  t.toAct = nextActingSeat(t, bbSeat);
  return t;
}

function postAnte(p: PlayerState, ante: number): void {
  const put = Math.min(ante, p.stack);
  p.totalCommitted += put; // ante entra no pote, mas não no "bet" da rua
  p.stack -= put;
  if (p.stack === 0) p.status = "allin";
}

export type Action =
  | { type: "fold" }
  | { type: "check" }
  | { type: "call" }
  | { type: "raise"; to: number } // `to` = valor TOTAL comprometido na rua
  | { type: "allin" };

/** Aplica uma ação do jogador da vez e avança o estado. */
export function applyAction(t: TableState, action: Action): TableState {
  if (t.handOver) throw new Error("A mão já terminou.");
  const seat = t.toAct;
  const p = t.players[seat];
  if (!p || p.status !== "active") throw new Error(`Assento ${seat} não pode agir.`);

  const toCall = t.currentBet - p.committed;

  switch (action.type) {
    case "fold": {
      p.status = "folded";
      p.acted = true;
      t.log.push(`${p.name} desiste (fold).`);
      break;
    }
    case "check": {
      if (toCall > 0) throw new Error("Não pode dar check: há aposta para pagar.");
      p.acted = true;
      t.log.push(`${p.name} passa (check).`);
      break;
    }
    case "call": {
      const put = Math.min(toCall, p.stack);
      moveChips(p, put);
      p.acted = true;
      t.log.push(`${p.name} paga ${put}.`);
      break;
    }
    case "raise":
    case "allin": {
      const target = action.type === "allin" ? p.committed + p.stack : action.to;
      applyRaise(t, p, target);
      break;
    }
  }

  advance(t);
  return t;
}

function moveChips(p: PlayerState, amount: number): void {
  const put = Math.min(amount, p.stack);
  p.committed += put;
  p.totalCommitted += put;
  p.stack -= put;
  if (p.stack === 0) p.status = "allin";
}

function applyRaise(t: TableState, p: PlayerState, target: number): void {
  const maxTarget = p.committed + p.stack;
  if (target > maxTarget) target = maxTarget;
  if (target <= t.currentBet && target < maxTarget) {
    throw new Error("Raise precisa superar a aposta atual (ou ser all-in).");
  }
  const raiseSize = target - t.currentBet;
  const delta = target - p.committed;
  moveChips(p, delta);

  const fullRaise = raiseSize >= t.minRaiseAmount;
  if (fullRaise) {
    t.minRaiseAmount = raiseSize;
  }
  t.currentBet = Math.max(t.currentBet, target);
  t.lastAggressor = p.seat;

  // Reabre a ação: quem ainda pode agir precisa responder ao novo valor.
  for (const s of actingSeats(t)) {
    if (s !== p.seat) t.players[s].acted = false;
  }
  p.acted = true;
  t.log.push(
    `${p.name} ${raiseSize > 0 ? "aumenta para" : "vai all-in em"} ${target}${
      p.status === "allin" ? " (all-in)" : ""
    }.`,
  );
}

/** Rodada de aposta terminou? Todo mundo que pode agir já agiu e igualou. */
function bettingClosed(t: TableState): boolean {
  const acting = actingSeats(t);
  for (const s of acting) {
    const p = t.players[s];
    if (!p.acted || p.committed !== t.currentBet) return false;
  }
  return true;
}

function advance(t: TableState): void {
  // Todos menos um desistiram? A mão acaba sem showdown.
  const alive = t.players.filter((p) => p.status === "active" || p.status === "allin");
  if (alive.length <= 1) {
    endHandNoShowdown(t, alive[0]?.seat);
    return;
  }

  if (!bettingClosed(t)) {
    t.toAct = nextActingSeat(t, t.toAct);
    return;
  }

  // Aposta fechou. Se sobrou no máximo 1 que pode agir (resto all-in), corre o
  // board até o fim e vai para o showdown.
  if (actingSeats(t).length <= 1) {
    runOutBoard(t);
    showdown(t);
    return;
  }

  // Avança de rua.
  advanceStreet(t);
}

function resetForNewStreet(t: TableState): void {
  for (const p of t.players) {
    p.committed = 0;
    if (p.status === "active") p.acted = false;
  }
  t.currentBet = 0;
  t.minRaiseAmount = t.bigBlind;
  t.lastAggressor = -1;
}

function dealBoard(t: TableState, n: number): void {
  for (let i = 0; i < n; i++) t.board.push(t.deck.pop()!);
}

function advanceStreet(t: TableState): void {
  resetForNewStreet(t);
  const next: Record<Street, Street> = {
    preflop: "flop",
    flop: "turn",
    turn: "river",
    river: "showdown",
    showdown: "complete",
    complete: "complete",
  };
  const ns = next[t.street];
  t.street = ns;
  if (ns === "flop") dealBoard(t, 3);
  else if (ns === "turn") dealBoard(t, 1);
  else if (ns === "river") dealBoard(t, 1);
  else if (ns === "showdown") {
    showdown(t);
    return;
  }
  t.toAct = nextActingSeat(t, t.buttonSeat);
}

function runOutBoard(t: TableState): void {
  // Completa o board até 5 cartas sem mais apostas.
  while (t.board.length < 5) dealBoard(t, 1);
  t.street = "river";
}

function endHandNoShowdown(t: TableState, winnerSeat?: number): void {
  const pot = totalPot(t);
  const winningsBySeat: Record<number, number> = {};
  if (winnerSeat !== undefined) {
    t.players[winnerSeat].stack += pot;
    winningsBySeat[winnerSeat] = pot;
    t.log.push(`${t.players[winnerSeat].name} leva o pote de ${pot} (todos desistiram).`);
  }
  t.result = {
    winningsBySeat,
    pots: [{ amount: pot, eligible: winnerSeat !== undefined ? [winnerSeat] : [] }],
    showdown: false,
  };
  t.street = "complete";
  t.handOver = true;
  t.toAct = -1;
}

function showdown(t: TableState): void {
  const pots = computePots(t);
  const holeBySeat: Record<number, Card[]> = {};
  for (const p of t.players) {
    if (p.status === "active" || p.status === "allin") holeBySeat[p.seat] = p.holeCards;
  }
  const { winningsBySeat, handValueBySeat } = settlePots(
    pots,
    t.board,
    holeBySeat,
    t.buttonSeat,
    t.players.length,
  );
  for (const [seat, win] of Object.entries(winningsBySeat)) {
    t.players[Number(seat)].stack += win;
  }
  t.result = { winningsBySeat, pots, showdown: true, handValueBySeat };
  t.street = "complete";
  t.handOver = true;
  t.toAct = -1;
  t.log.push(`Showdown. Board: ${t.board.length} cartas. Potes: ${pots.length}.`);
}

/** Avança o botão para o próximo assento ocupado (para a próxima mão). */
export function moveButton(t: TableState): void {
  const n = t.players.length;
  for (let i = 1; i <= n; i++) {
    const s = (t.buttonSeat + i) % n;
    if (t.players[s].stack > 0) {
      t.buttonSeat = s;
      return;
    }
  }
}

// Reexport para conveniência de quem usa o motor.
export { legalActions } from "./betting";
export { inHandSeats };

// ---------------------------------------------------------------------------
// REPLAY NA MESA REAL — reconstrói o TableState (o mesmo formato que a
// PokerTable do jogo consome) a cada passo de uma mão importada (ParsedHand).
//
// Objetivo (pedido do Allan): qualquer review — do torneio do app OU importado —
// deve rodar na MESA REAL do jogo, não numa mesa desenhada à parte. Esta é a
// PARTE DO MOTOR: entregar os quadros (frames) prontos; a UI só liga a
// PokerTable em modo replay (read-only, Próximo/Anterior) sobre estes frames.
//
// Convenção dos assentos: hero no índice 0, seguindo no sentido horário (igual
// à mesa do jogo). `players[i].seat === i`; buttonSeat/toAct são índices desse
// array. Contabilidade de fichas idêntica à do replayer atual (call/bet somam
// o valor; raise soma o delta sobre o já apostado na rua; uncalled devolve).
// ---------------------------------------------------------------------------
import type { Card } from "../engine/cards";
import type { PlayerState, TableState, Street as GameStreet } from "../game/state";
import type { ParsedHand, ParsedAction, Street as ParsedStreet } from "./handHistory";
import type { HandHistory, ReplayEvent } from "../app/replay";

export interface ReplayFrame {
  /** Estado da mesa NESTE passo, no formato que a PokerTable renderiza. */
  state: TableState;
  /** Rótulo legível do passo (ex.: "Vilão 3: Call 2bb", "Flop", "Resultado"). */
  label: string;
  /** Só a AÇÃO, sem o nome ("Call 2bb"): o nome já está no assento, então a
   *  plaquinha do pod não precisa repeti-lo. */
  shortLabel?: string;
  /** Índice (assento no array) de quem agiu neste passo; -1 quando não é ação. */
  actorSeat: number;
  /** Rua deste passo. */
  street: GameStreet;
  /** Índice da ação no hand history (liga o passo ao veredito daquela decisão). */
  actionIdx?: number;
}

const BOARD_TARGET: Record<ParsedStreet, number> = { preflop: 0, flop: 3, turn: 4, river: 5 };

function fmtBB(chips: number, bb: number): string {
  const v = chips / (bb || 1);
  return `${Number.isInteger(v) ? v : v.toFixed(1)}bb`;
}

function actionLabel(a: ParsedAction, bb: number): string {
  switch (a.type) {
    case "fold": return "Fold";
    case "check": return "Check";
    case "call": return `Call ${fmtBB(a.amount, bb)}`;
    case "bet": return `Bet ${fmtBB(a.amount, bb)}`;
    case "raise": return `Raise → ${fmtBB(a.amount, bb)}`;
    case "uncalled": return `Devolvido ${fmtBB(a.amount, bb)}`;
    case "collected": return "Levou o pote";
    default: return a.type;
  }
}

/**
 * Nome que aparece NA MESA para cada jogador do hand history.
 * O hash do site ("a968e2a8") não diz nada, ocupa o pod inteiro e ainda cobre as
 * cartas. Vira "Você" e "Vilão 1..8", numerados no sentido do anel a partir do
 * herói. O nome original continua no arquivo importado.
 */
export function replayDisplayNames(hand: ParsedHand): Record<string, string> {
  const seated = [...hand.seats].sort((a, b) => a.seat - b.seat);
  const heroIdx = seated.findIndex((s) => s.isHero);
  const base = heroIdx >= 0 ? heroIdx : 0;
  const out: Record<string, string> = {};
  let villainNo = 0;
  for (let k = 0; k < seated.length; k++) {
    const s = seated[(base + k) % seated.length];
    out[s.name] = s.isHero ? "Você" : `Vilão ${++villainNo}`;
  }
  return out;
}

/**
 * Reconstrói os quadros de replay de uma mão importada como TableStates reais.
 * Antes/blinds já entram no estado inicial (o replay começa na 1ª decisão de
 * verdade). Entre as ruas, insere um quadro que abre o board (flop/turn/river).
 */
export function parsedHandToReplay(hand: ParsedHand): ReplayFrame[] {
  const bb = hand.bb || 1;

  // Ordem horária a partir do herói (índice 0), igual à mesa do jogo.
  const seated = [...hand.seats].sort((a, b) => a.seat - b.seat);
  const n = seated.length;
  const heroIdx = seated.findIndex((s) => s.isHero);
  const base = heroIdx >= 0 ? heroIdx : 0;
  const ring = Array.from({ length: n }, (_, k) => seated[(base + k) % n]);
  const idxByName = new Map<string, number>();
  ring.forEach((s, i) => idxByName.set(s.name, i));

  const buttonSeat = ring.findIndex((s) => s.isButton);

  // Cartas conhecidas por jogador (herói sempre; vilões só no showdown).
  const holeFor = (name: string, isHero: boolean): Card[] => {
    if (isHero) return hand.heroCards.slice();
    return hand.shownCards?.[name]?.slice() ?? [];
  };

  // Nome que aparece NA MESA (ver replayDisplayNames).
  const nameLabel = replayDisplayNames(hand);
  const labelByRingIdx = ring.map((s) => nameLabel[s.name] ?? s.name);

  const players: PlayerState[] = ring.map((s, i) => ({
    seat: i,
    name: labelByRingIdx[i],
    isHero: s.isHero,
    stack: s.stack,
    committed: 0,
    totalCommitted: 0,
    acted: false,
    status: "active",
    holeCards: holeFor(s.name, s.isHero),
  }));

  const commit = (name: string, delta: number) => {
    const i = idxByName.get(name);
    if (i === undefined) return;
    const p = players[i];
    const d = Math.min(delta, p.stack);
    p.stack -= d;
    p.committed += d;
    p.totalCommitted += d;
    if (p.stack <= 0) p.status = "allin";
  };

  // O ante entra direto no POTE, sem virar uma fichinha na frente de cada
  // jogador: com 9 jogadores o feltro virava um tapete de "0.1bb" e o Allan
  // tinha de atravessar isso pra chegar na mão. Blinds continuam como fichas
  // (elas contam a história do pré-flop).
  const commitAnte = (name: string, delta: number) => {
    const i = idxByName.get(name);
    if (i === undefined) return;
    const p = players[i];
    const d = Math.min(delta, p.stack);
    p.stack -= d;
    p.totalCommitted += d; // sem `committed` => não desenha ficha no assento
    if (p.stack <= 0) p.status = "allin";
  };

  // Antes + blinds: aplicados no estado inicial, sem virar passos.
  for (const a of hand.actions) {
    if (a.street !== "preflop") break;
    if (a.type === "ante") commitAnte(a.player, a.amount || hand.ante);
    else if (a.type === "sb") commit(a.player, a.amount || hand.sb);
    else if (a.type === "bb") commit(a.player, a.amount || hand.bb);
  }

  let visibleBoard = 0;
  let currentStreet: ParsedStreet = "preflop";
  const gameStreet = (s: ParsedStreet): GameStreet => s;

  const currentBet = () => Math.max(0, ...players.map((p) => p.committed));

  const snapshot = (toAct: number, street: ParsedStreet): TableState => ({
    players: players.map((p) => ({ ...p, holeCards: p.holeCards.slice() })),
    buttonSeat: buttonSeat < 0 ? 0 : buttonSeat,
    smallBlind: hand.sb,
    bigBlind: hand.bb,
    ante: hand.ante,
    board: hand.board.slice(0, visibleBoard),
    street: gameStreet(street),
    currentBet: currentBet(),
    preflopRaises: 0,
    minRaiseAmount: hand.bb,
    toAct,
    lastAggressor: -1,
    preflopAggressor: -1,
    lastStreetAggressor: -1,
    deck: [],
    handOver: false,
    log: [],
    variant: "holdem",
  });

  const frames: ReplayFrame[] = [
    { state: snapshot(-1, "preflop"), label: "Mão distribuída", actorSeat: -1, street: "preflop" },
  ];

  const openStreetIfNeeded = (street: ParsedStreet) => {
    const target = BOARD_TARGET[street];
    if (target > visibleBoard && street !== currentStreet) {
      visibleBoard = target;
      currentStreet = street;
      for (const p of players) if (p.status === "active" || p.status === "allin") p.committed = 0;
      const label = street === "flop" ? "Flop" : street === "turn" ? "Turn" : "River";
      frames.push({ state: snapshot(-1, street), label, actorSeat: -1, street: gameStreet(street) });
    }
  };

  for (let ai = 0; ai < hand.actions.length; ai++) {
    const a = hand.actions[ai];
    if (a.type === "ante" || a.type === "sb" || a.type === "bb") continue;
    openStreetIfNeeded(a.street);
    const i = idxByName.get(a.player);
    if (i === undefined) continue;
    const p = players[i];

    if (a.type === "fold") {
      p.status = "folded";
    } else if (a.type === "call" || a.type === "bet") {
      commit(a.player, a.amount);
      if (a.allIn) p.status = "allin";
    } else if (a.type === "raise") {
      commit(a.player, Math.max(0, a.amount - p.committed));
      if (a.allIn) p.status = "allin";
    } else if (a.type === "uncalled") {
      p.stack += a.amount;
      p.committed = Math.max(0, p.committed - a.amount);
      p.totalCommitted = Math.max(0, p.totalCommitted - a.amount);
    }
    p.acted = true;

    // check/collected sem chips; ainda assim viram quadro (mostram a ação).
    frames.push({
      state: snapshot(i, a.street),
      label: `${p.name}: ${actionLabel(a, bb)}`,
      shortLabel: actionLabel(a, bb),
      actionIdx: ai,
      actorSeat: i,
      street: gameStreet(a.street),
    });
  }

  // Quadro final: resultado (board completo, mão encerrada).
  visibleBoard = hand.board.length;
  const finalState = snapshot(-1, currentStreet);
  finalState.board = hand.board.slice();
  finalState.handOver = true;
  frames.push({ state: finalState, label: "Resultado", actorSeat: -1, street: finalState.street });

  return frames;
}

// ---------------------------------------------------------------------------
// Mãos do TORNEIO DO APP → mesa real. Cada evento gravado carrega um retrato de
// todos os assentos (SeatSnap) capturado ao vivo; a reconstrução é direta.
// ---------------------------------------------------------------------------

function streetFromBoard(boardLen: number): GameStreet {
  if (boardLen >= 5) return "river";
  if (boardLen === 4) return "turn";
  if (boardLen >= 3) return "flop";
  return "preflop";
}

export function handHistoryToReplay(h: HandHistory): ReplayFrame[] {
  const seatNums = Object.keys(h.names).map(Number).sort((a, b) => a - b);
  const nameOf = (seat: number) => h.names[seat] ?? `Assento ${seat}`;
  const holeOf = (seat: number, reveal: boolean): Card[] => {
    if (seat === h.heroSeat) return (h.holeCards[seat] ?? []).slice();
    return reveal ? (h.holeCards[seat] ?? []).slice() : [];
  };

  const baseState = (
    seatsData: ReplayEvent["seats"],
    board: Card[],
    toAct: number,
    reveal: boolean,
    handOver: boolean,
  ): TableState => {
    const players: PlayerState[] = seatNums.map((seat) => {
      const snap = seatsData?.[seat];
      return {
        seat,
        name: nameOf(seat),
        isHero: seat === h.heroSeat,
        stack: snap?.stack ?? h.startingStacks?.[seat] ?? 0,
        committed: snap?.committed ?? 0,
        totalCommitted: snap?.totalCommitted ?? 0,
        acted: false,
        status: snap?.status ?? "active",
        holeCards: holeOf(seat, reveal),
      };
    });
    return {
      players,
      buttonSeat: h.buttonSeat,
      smallBlind: Math.round(h.bigBlind / 2),
      bigBlind: h.bigBlind,
      ante: 0,
      board: board.slice(),
      street: streetFromBoard(board.length),
      currentBet: Math.max(0, ...players.map((p) => p.committed)),
      preflopRaises: 0,
      minRaiseAmount: h.bigBlind,
      toAct,
      lastAggressor: -1,
      preflopAggressor: -1,
      lastStreetAggressor: -1,
      deck: [],
      handOver,
      result: handOver ? h.result : undefined,
      log: [],
      variant: "holdem",
    };
  };

  const frames: ReplayFrame[] = [];

  // Estado inicial (stacks de partida, sem ação ainda).
  frames.push({
    state: baseState(undefined, [], -1, false, false),
    label: "Mão distribuída",
    actorSeat: -1,
    street: "preflop",
  });

  let lastBoardLen = 0;
  for (const ev of h.events) {
    // Abriu uma rua nova? (board cresceu) — quadro de "abre rua".
    if (ev.board.length > lastBoardLen && ev.board.length >= 3) {
      lastBoardLen = ev.board.length;
      const label = ev.board.length === 3 ? "Flop" : ev.board.length === 4 ? "Turn" : "River";
      // Usa o retrato do próprio evento pra manter os stacks coerentes.
      frames.push({
        state: baseState(ev.seats, ev.board, -1, false, false),
        label,
        actorSeat: -1,
        street: streetFromBoard(ev.board.length),
      });
    }
    frames.push({
      state: baseState(ev.seats, ev.board, ev.seat, false, false),
      label: `${ev.name}: ${ev.actionLabel}`,
      shortLabel: ev.actionLabel,
      actorSeat: ev.seat,
      street: streetFromBoard(ev.board.length),
    });
  }

  // Quadro final: board cheio, cartas reveladas, resultado.
  const lastSeats = h.events.length ? h.events[h.events.length - 1].seats : undefined;
  frames.push({
    state: baseState(lastSeats, h.finalBoard, -1, true, true),
    label: "Resultado",
    actorSeat: -1,
    street: streetFromBoard(h.finalBoard.length),
  });

  return frames;
}

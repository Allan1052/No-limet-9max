// ---------------------------------------------------------------------------
// Estado da mesa e tipos do motor de jogo.
//
// O motor é um "state machine": a mesa tem um estado, aplicamos ações (fold,
// check, call, raise) e ele avança pelas ruas (pré-flop → flop → turn → river →
// showdown). Aqui ficam os tipos e alguns utilitários de navegação entre
// assentos.
// ---------------------------------------------------------------------------

import type { Card } from "../engine/cards";

export type Street = "preflop" | "flop" | "turn" | "river" | "showdown" | "complete";

export type PlayerStatus = "active" | "folded" | "allin" | "out";

export interface PlayerState {
  seat: number;
  name: string;
  /** id do perfil de bot (undefined = herói humano). */
  profileId?: string;
  isHero: boolean;
  /** Fichas ainda na frente do jogador (atrás). */
  stack: number;
  /** Fichas apostadas NESTA rua. */
  committed: number;
  /** Fichas apostadas no total NESTA mão (para side pots). */
  totalCommitted: number;
  /** Já agiu desde a última aposta/aumento desta rua? */
  acted: boolean;
  status: PlayerStatus;
  holeCards: Card[];
}

export interface Pot {
  amount: number;
  /** Assentos elegíveis a ganhar este pote (não foldaram). */
  eligible: number[];
}

export interface HandResult {
  /** Assento → fichas ganhas nesta mão (líquido do pote). */
  winningsBySeat: Record<number, number>;
  pots: Pot[];
  /** Houve showdown? (falso quando todos menos um foldaram). */
  showdown: boolean;
  /** Assento → valor da mão avaliada (só quando houve showdown). */
  handValueBySeat?: Record<number, number>;
}

export interface TableConfig {
  smallBlind: number;
  bigBlind: number;
  ante?: number;
}

export interface TableState {
  players: PlayerState[];
  buttonSeat: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  board: Card[];
  street: Street;
  /** Maior valor apostado NESTA rua (o "bet a igualar"). */
  currentBet: number;
  /** Tamanho do último aumento cheio — o próximo raise deve ser ≥ isto. */
  minRaiseAmount: number;
  /** Assento que deve agir. -1 quando a rua/mão está resolvida. */
  toAct: number;
  /** Assento do último a apostar/aumentar nesta rua (-1 se ninguém). */
  lastAggressor: number;
  /** Assento do agressor do pré-flop (quem levou a iniciativa; -1 se ninguém). */
  preflopAggressor: number;
  /** Baralho restante (as próximas cartas a sair). */
  deck: Card[];
  handOver: boolean;
  result?: HandResult;
  /** Log de ações legível, para replayer/feedback. */
  log: string[];
}

/** Assentos "com cartas na mão" (podem ainda agir ou estão all-in). */
export function inHandSeats(t: TableState): number[] {
  return t.players.filter((p) => p.status === "active" || p.status === "allin").map((p) => p.seat);
}

/** Assentos que ainda podem tomar decisões (active, não all-in). */
export function actingSeats(t: TableState): number[] {
  return t.players.filter((p) => p.status === "active").map((p) => p.seat);
}

/** Próximo assento ocupado (não "out") no sentido horário a partir de `seat`. */
export function nextOccupiedSeat(t: TableState, seat: number): number {
  const n = t.players.length;
  for (let i = 1; i <= n; i++) {
    const s = (seat + i) % n;
    if (t.players[s].status !== "out") return s;
  }
  return seat;
}

/** Próximo assento que ainda pode AGIR (active) a partir de `seat`. */
export function nextActingSeat(t: TableState, seat: number): number {
  const n = t.players.length;
  for (let i = 1; i <= n; i++) {
    const s = (seat + i) % n;
    if (t.players[s].status === "active") return s;
  }
  return -1;
}

export function playerAt(t: TableState, seat: number): PlayerState {
  return t.players[seat];
}

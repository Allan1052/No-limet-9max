// ---------------------------------------------------------------------------
// Apostas: ações legais e cálculo de side pots.
//
// - `legalActions` diz, para o jogador da vez, o que ele pode fazer e com quais
//   valores (mínimo/máximo de raise, quanto falta para pagar).
// - `computePots` divide o total apostado em pote principal e side pots quando
//   há all-ins de tamanhos diferentes — regra clássica do poker.
// ---------------------------------------------------------------------------

import { evaluate } from "../engine/evaluator";
import type { Card } from "../engine/cards";
import type { Pot, TableState } from "./state";

export interface LegalActions {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  /** Fichas necessárias para pagar (0 se pode dar check). */
  callAmount: number;
  canRaise: boolean;
  /** Valor TOTAL comprometido em um raise mínimo (committed alvo). */
  minRaiseTo: number;
  /** Valor TOTAL comprometido em um raise máximo (all-in). */
  maxRaiseTo: number;
}

export function legalActions(t: TableState): LegalActions {
  const p = t.players[t.toAct];
  if (!p || p.status !== "active") {
    return {
      canFold: false,
      canCheck: false,
      canCall: false,
      callAmount: 0,
      canRaise: false,
      minRaiseTo: 0,
      maxRaiseTo: 0,
    };
  }
  const toCall = t.currentBet - p.committed;
  const canCheck = toCall <= 0;
  const canCall = toCall > 0 && p.stack > 0;
  const callAmount = Math.min(toCall, p.stack);

  // Raise mínimo: igualar + um aumento cheio. Se não tiver fichas para tanto,
  // ainda pode ir all-in (que pode ser um raise parcial).
  const minRaiseCommitted = t.currentBet + t.minRaiseAmount;
  const maxRaiseTo = p.committed + p.stack; // all-in
  const canRaise = p.stack > toCall; // precisa ter mais que o call para aumentar

  return {
    canFold: true,
    canCheck,
    canCall,
    callAmount,
    canRaise,
    minRaiseTo: Math.min(minRaiseCommitted, maxRaiseTo),
    maxRaiseTo,
  };
}

/**
 * Divide o total apostado na mão em pote principal + side pots.
 * Contribuições de quem foldou entram nos potes, mas o foldado não é elegível
 * a ganhar. Empilhamos "camadas" a partir do menor stack investido.
 */
export function computePots(t: TableState): Pot[] {
  const contrib = t.players.map((p) => p.totalCommitted);
  const folded = t.players.map((p) => p.status === "folded" || p.status === "out");
  const pots: Pot[] = [];

  // Enquanto houver contribuição positiva, cria uma camada do menor nível.
  while (true) {
    let min = Infinity;
    for (const c of contrib) if (c > 0 && c < min) min = c;
    if (!isFinite(min)) break;

    let amount = 0;
    const eligible: number[] = [];
    for (let i = 0; i < contrib.length; i++) {
      if (contrib[i] > 0) {
        amount += min;
        contrib[i] -= min;
        if (!folded[i]) eligible.push(i);
      }
    }

    // Junta com o pote anterior se a elegibilidade for idêntica (mesmo grupo).
    const prev = pots[pots.length - 1];
    if (prev && sameSet(prev.eligible, eligible)) {
      prev.amount += amount;
    } else {
      pots.push({ amount, eligible });
    }
  }
  return pots;
}

function sameSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  return b.every((x) => sa.has(x));
}

/**
 * Distribui os potes aos vencedores. Avalia as mãos dos elegíveis (não foldados)
 * com o board completo. Empates dividem o pote; a ficha ímpar vai ao primeiro
 * elegível no sentido horário a partir do botão.
 */
export function settlePots(
  pots: Pot[],
  board: Card[],
  holeBySeat: Record<number, Card[]>,
  buttonSeat: number,
  numSeats: number,
): { winningsBySeat: Record<number, number>; handValueBySeat: Record<number, number> } {
  const winningsBySeat: Record<number, number> = {};
  const handValueBySeat: Record<number, number> = {};

  // Avalia cada mão elegível uma vez.
  for (const pot of pots) {
    for (const seat of pot.eligible) {
      if (handValueBySeat[seat] === undefined) {
        const hole = holeBySeat[seat];
        handValueBySeat[seat] = evaluate([...hole, ...board]);
      }
    }
  }

  for (const pot of pots) {
    if (pot.eligible.length === 0) continue;
    let best = -1;
    for (const seat of pot.eligible) best = Math.max(best, handValueBySeat[seat]);
    const winners = pot.eligible.filter((s) => handValueBySeat[s] === best);

    const share = Math.floor(pot.amount / winners.length);
    let remainder = pot.amount - share * winners.length;
    // Ordena vencedores por proximidade horária ao botão para a ficha ímpar.
    const ordered = [...winners].sort(
      (a, b) => seatOrder(a, buttonSeat, numSeats) - seatOrder(b, buttonSeat, numSeats),
    );
    for (const seat of ordered) {
      let win = share;
      if (remainder > 0) {
        win += 1;
        remainder -= 1;
      }
      winningsBySeat[seat] = (winningsBySeat[seat] ?? 0) + win;
    }
  }
  return { winningsBySeat, handValueBySeat };
}

function seatOrder(seat: number, buttonSeat: number, n: number): number {
  return (seat - buttonSeat - 1 + n) % n;
}

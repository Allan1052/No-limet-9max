// ---------------------------------------------------------------------------
// Estimativa da largura do range do vilão, que ESTREITA rua a rua.
//
// No pré-flop, um pote aberto com raise dá um range mais estreito que um pote
// limpado. No V2, a largura também responde à LINHA de ações: call/check preservam
// mais combos; bet/raise comprimem mais o range restante. A implementação é
// determinística e barata para rodar no navegador.
// ---------------------------------------------------------------------------

import type { TableState, Street } from "../game/state";

export type RangeLineAction = "call" | "check" | "bet" | "raise";

export interface RangeActionLine {
  preflopRaises: number;
  street: Extract<Street, "flop" | "turn" | "river">;
  actions: RangeLineAction[];
}

/** Largura-base do range depois da agressão pré-flop. */
function baseRangePct(preflopRaises: number): number {
  const raises = Math.max(0, Math.floor(preflopRaises));
  if (raises >= 4) return 0.05; // 5-bet+: topo premium
  if (raises === 3) return 0.07; // 4-bet pot
  if (raises === 2) return 0.10; // 3-bet pot
  if (raises === 1) return 0.28; // single-raised pot
  return 0.50; // limpado / não aberto
}

/**
 * Motor V2 de propagação leve de ranges.
 *
 * Cada ação repondera a largura anterior sem Monte Carlo nem estado mutável:
 * - check preserva quase todo o range;
 * - call remove parte das mãos sem equity/realização;
 * - bet comprime mais por representar valor + blefes selecionados;
 * - raise é a ação mais seletiva.
 */
export function rangePctFromActionLine(line: RangeActionLine): number {
  let pct = baseRangePct(line.preflopRaises);

  const streetSurvival = line.street === "river" ? 0.92 : line.street === "turn" ? 0.96 : 1;
  pct *= streetSurvival;

  for (const action of line.actions) {
    if (action === "check") pct *= 0.98;
    else if (action === "call") pct *= 0.88;
    else if (action === "bet") pct *= 0.78;
    else pct *= 0.68; // raise
  }

  return Math.max(0.05, Math.min(0.60, pct));
}

/** Extrai somente as ações reconhecíveis do log legível do motor. */
function actionLineFromLog(log: string[] | undefined): RangeLineAction[] {
  if (!log || log.length === 0) return [];
  const actions: RangeLineAction[] = [];
  for (const raw of log) {
    const line = raw.toLowerCase();
    if (line.includes("passa (check)")) actions.push("check");
    else if (line.includes(" paga ")) actions.push("call");
    else if (line.includes("aumenta para") || line.includes("vai all-in em")) actions.push("raise");
  }
  return actions;
}

/**
 * Converte o estado real da mesa numa linha leve de ações.
 *
 * Quando o motor possui log, o V2 usa a história efetivamente registrada.
 * Estados sintéticos/legados sem log continuam usando os sinais de rua,
 * preservando compatibilidade com os testes e consumidores existentes.
 */
function actionLineFromTable(t: TableState, heroSeat: number): RangeActionLine {
  const street: RangeActionLine["street"] = t.board.length >= 5 ? "river" : t.board.length === 4 ? "turn" : "flop";
  const loggedActions = actionLineFromLog(t.log);
  const actions: RangeLineAction[] = loggedActions.length > 0 ? loggedActions : [];

  if (actions.length === 0) {
    if (t.board.length >= 3) actions.push("call");
    if (t.board.length >= 4) actions.push(t.lastStreetAggressor >= 0 ? "bet" : "check");
    if (t.board.length >= 5) actions.push(t.lastStreetAggressor >= 0 ? "bet" : "check");
  }

  const hero = t.players[heroSeat];
  const toCall = hero ? t.currentBet - hero.committed : 0;
  if (toCall > 0) actions.push("bet");

  return {
    preflopRaises: t.preflopRaises ?? (t.preflopAggressor >= 0 ? 1 : 0),
    street,
    actions,
  };
}

export function estimateVillainRangePct(t: TableState, heroSeat: number): number {
  return rangePctFromActionLine(actionLineFromTable(t, heroSeat));
}

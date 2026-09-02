import type { CoachV2Decision } from "../feedback/coachV2Decision";

export interface CoachV2HintView {
  actionLabel: string;
  contextLabel: string;
  reason: string;
  metrics: string[];
}

function fmtBB(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}bb`;
}

function fmtPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

// Termos PADRÃO de poker (pedido do Allan) — os mesmos usados nas mesas.
function baseActionLabel(action: string): string {
  switch (action.toLowerCase()) {
    case "fold": return "Fold";
    case "check": return "Check";
    case "call": return "Call";
    case "bet": return "Bet";
    case "raise": return "Raise";
    case "3bet": return "3-bet";
    case "jam":
    case "allin": return "All-in";
    default: return action;
  }
}

export function buildCoachV2HintView(decision: CoachV2Decision): CoachV2HintView {
  let actionLabel = baseActionLabel(decision.action);
  if (["bet", "raise", "3bet"].includes(decision.action.toLowerCase()) && decision.betSizeBB !== undefined) {
    actionLabel = `${actionLabel} ~${fmtBB(decision.betSizeBB)}`;
  }

  const metrics: string[] = [];
  if (decision.potBB !== undefined) metrics.push(`Pote ${fmtBB(decision.potBB)}`);
  if (decision.toCallBB !== undefined && decision.toCallBB > 0) metrics.push(`Pagar ${fmtBB(decision.toCallBB)}`);
  if (decision.equity !== undefined) metrics.push(`Equity ${fmtPct(decision.equity)}`);
  if (decision.requiredEquity !== undefined) metrics.push(`Precisa ${fmtPct(decision.requiredEquity)}`);
  if (decision.spr !== undefined) metrics.push(`SPR ${Math.round(decision.spr * 10) / 10}`);
  if (decision.betSizePct !== undefined) metrics.push(`${fmtPct(decision.betSizePct)} pote`);
  if (decision.evBB !== undefined) metrics.push(`EV ${decision.evBB >= 0 ? "+" : ""}${fmtBB(decision.evBB)}`);

  return {
    actionLabel,
    contextLabel: decision.contextLabel,
    reason: decision.reason,
    metrics,
  };
}

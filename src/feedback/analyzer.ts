// ---------------------------------------------------------------------------
// Feedback pós-mão.
//
// Para cada decisão SUA, comparamos o que você fez com a recomendação de linha
// de base (o perfil neutro/"quase-GTO"), usando a mesma matemática dos bots:
// equity vs range e pot odds. O resultado é uma nota e uma explicação em texto
// simples do porquê — foco em aprender, não em julgar.
// ---------------------------------------------------------------------------

export type Rating = "boa" | "ok" | "imprecisa" | "ruim";

/** Recomendação da linha de base para o spot em que o herói decidiu. */
export interface HeroAdvice {
  kind: "preflop" | "postflop";
  action: string; // fold | check | call | raise | 3bet | bet | jam
  reason: string;
  equity?: number;
  potOdds?: number;
}

export interface FeedbackItem {
  street: string;
  heroAction: string; // rótulo do que você fez
  advice: string; // rótulo do recomendado
  rating: Rating;
  text: string;
  equity?: number;
  potOdds?: number;
}

type Family = "fold" | "check" | "call" | "aggro";

function family(action: string): Family {
  switch (action) {
    case "fold":
      return "fold";
    case "check":
      return "check";
    case "call":
      return "call";
    default:
      return "aggro"; // raise, bet, 3bet, jam, allin
  }
}

const LABELS: Record<string, string> = {
  fold: "Fold",
  check: "Check",
  call: "Call",
  raise: "Raise",
  bet: "Aposta",
  "3bet": "3-bet",
  jam: "All-in",
  allin: "All-in",
};

export function actionLabel(action: string): string {
  return LABELS[action] ?? action;
}

/**
 * Avalia uma decisão do herói. `heroAction` é o tipo da ação do motor
 * (fold/check/call/raise/allin); `advice` é a recomendação da linha de base.
 */
export function gradeDecision(
  streetLabel: string,
  heroAction: string,
  advice: HeroAdvice,
): FeedbackItem {
  const hf = family(heroAction === "allin" ? "raise" : heroAction);
  const af = family(advice.action);
  const eq = advice.equity;
  const odds = advice.potOdds;

  const base: Omit<FeedbackItem, "rating" | "text"> = {
    street: streetLabel,
    heroAction: actionLabel(heroAction),
    advice: actionLabel(advice.action),
    equity: eq,
    potOdds: odds,
  };

  // Bateu com a recomendação: boa jogada.
  if (hf === af) {
    return { ...base, rating: "boa", text: `Alinhado com o padrão. ${advice.reason}` };
  }

  const hasNumbers = eq !== undefined && odds !== undefined;

  // ----- Erros de EV mensuráveis (pós-flop, com equity e odds) -----
  if (hasNumbers) {
    // Foldou com preço para continuar.
    if (hf === "fold" && (af === "call" || af === "aggro") && eq! >= odds!) {
      const surplus = eq! - odds!;
      return {
        ...base,
        rating: surplus > 0.1 ? "ruim" : "imprecisa",
        text: `Fold ${surplus > 0.1 ? "ruim" : "apertado"}: sua equity (${pc(eq!)}) pagava o preço (${pc(odds!)}). O padrão era ${actionLabel(advice.action)}.`,
      };
    }
    // Pagou sem preço.
    if (hf === "call" && af === "fold" && eq! < odds!) {
      const gap = odds! - eq!;
      return {
        ...base,
        rating: gap > 0.15 ? "ruim" : "imprecisa",
        text: `Pagou sem odds: equity (${pc(eq!)}) abaixo do preço (${pc(odds!)}). O padrão era foldar.`,
      };
    }
    // Agressivo demais.
    if (hf === "aggro" && (af === "call" || af === "check")) {
      return {
        ...base,
        rating: "ok",
        text: `Mais agressivo que o padrão (${actionLabel(advice.action)}). Jogável, mas costuma inflar o pote sem precisar.`,
      };
    }
    // Passivo com mão de valor.
    if ((hf === "call" || hf === "check") && af === "aggro") {
      return {
        ...base,
        rating: "imprecisa",
        text: `Perdeu valor/iniciativa: o padrão aqui é ${actionLabel(advice.action)} (equity ${eq !== undefined ? pc(eq) : "alta"}).`,
      };
    }
  }

  // ----- Pré-flop (sem equity/odds diretas) -----
  if (advice.kind === "preflop") {
    if ((hf === "call" || hf === "aggro") && af === "fold") {
      return {
        ...base,
        rating: "imprecisa",
        text: `Jogada solta: a mão está fora do range recomendado para a posição. O padrão era foldar.`,
      };
    }
    if (hf === "fold" && af !== "fold") {
      return {
        ...base,
        rating: "imprecisa",
        text: `Apertado demais: a mão estava no range de ${actionLabel(advice.action)} para a posição.`,
      };
    }
    if (hf === "call" && af === "aggro") {
      return {
        ...base,
        rating: "ok",
        text: `Dava para ser mais agressivo: o padrão aqui é ${actionLabel(advice.action)}.`,
      };
    }
    if (hf === "aggro" && af === "call") {
      return {
        ...base,
        rating: "ok",
        text: `Mais agressivo que o padrão (${actionLabel(advice.action)}); jogável.`,
      };
    }
  }

  // Casos restantes: diferença leve.
  return {
    ...base,
    rating: "imprecisa",
    text: `Diferente do padrão (${actionLabel(advice.action)}). ${advice.reason}`,
  };
}

function pc(x: number): string {
  return `${Math.round(x * 100)}%`;
}

/** Resumo curto da mão a partir das notas das decisões. */
export function summarize(items: FeedbackItem[]): string {
  if (items.length === 0) return "Sem decisões suas para avaliar nesta mão.";
  const counts: Record<Rating, number> = { boa: 0, ok: 0, imprecisa: 0, ruim: 0 };
  for (const it of items) counts[it.rating]++;
  if (counts.ruim > 0) return "Houve pelo menos um erro claro de EV nesta mão — veja abaixo.";
  if (counts.imprecisa > 0) return "Jogo ok, com imprecisões pontuais para ajustar.";
  return "Mão bem jogada — decisões alinhadas com o padrão.";
}

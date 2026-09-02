import type { FeedbackItem } from "../feedback/analyzer";

export type CoachV2PostHandMode = "simple" | "technical";

export interface CoachV2PostHandDecisionView {
  /**
   * A DECISÃO primeiro (regra pedagógica do Coach: decisão → motivo →
   * matemática). Traz o veredito e a jogada recomendada, sem jargão nem número.
   */
  decisionLine: string;
  /** O MOTIVO, em linguagem simples (o "porquê"). */
  reason: string;
  /** A MATEMÁTICA por último — só no modo técnico. */
  metrics: string[];
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function signedBB(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded >= 0 ? "+" : ""}${rounded}bb`;
}

/**
 * O motor de apostas representa tanto BET quanto RAISE com a ação técnica
 * "raise". No pós-flop, quando a recomendação do próprio spot é "Aposta",
 * sabemos que não havia aposta anterior para pagar; nesse caso, mostrar
 * "Raise" ao jogador é só um vazamento de implementação e vira "Aposta".
 */
export function feedbackHeroActionLabel(item: FeedbackItem): string {
  if (
    item.kind === "postflop" &&
    item.heroAction.toLowerCase() === "raise" &&
    item.advice.toLowerCase() === "aposta"
  ) {
    return "Aposta";
  }
  return item.heroAction;
}

/**
 * Monta o veredito que LIDERA o feedback: certo/errado + a jogada recomendada.
 * Sem número e sem jargão — o recreativo lê a decisão antes de qualquer conta.
 */
function decisionLineFor(item: FeedbackItem): string {
  const hero = feedbackHeroActionLabel(item);
  const rec = item.advice;
  const good = item.rating === "boa" || item.rating === "ok";
  // "Mesma jogada" é por FAMÍLIA (fold/check/call/aggro), não pelo rótulo: um
  // "Raise" e um "3-bet" são a MESMA jogada (agressão) — dizer "dá pra jogar
  // Raise, mas 3-bet é o padrão" soa contraditório. Só quando as famílias
  // diferem de verdade (ex.: Call vs Raise) é que há um "desvio".
  const same =
    item.heroFam && item.adviceFam
      ? item.heroFam === item.adviceFam
      : hero.toLowerCase() === rec.toLowerCase();

  // Quando a aposta enfrentada era um ALL-IN, deixamos isso EXPLÍCITO na
  // decisão — assim o herói entende que o fold (ou o call) foi contra um
  // all-in, e as duas linhas de "Pré-flop" da mesma mão não ficam idênticas
  // (pedido do Allan: "na segunda tinha que mostrar que o jogador veio de
  // all-in, aí justifica meu fold").
  const vsAllin = item.facingAllin ? " (vilão foi all-in)" : "";

  if (good && same) return `✔ Boa! ${hero} era o caminho${vsAllin}.`;
  if (good && !same) return `✔ Dá pra jogar ${hero} — mas ${rec} é o padrão${vsAllin}.`;
  return `✗ Melhor era ${rec}. Você fez ${hero}${vsAllin}.`;
}

export function buildCoachV2PostHandDecision(
  item: FeedbackItem,
  mode: CoachV2PostHandMode,
): CoachV2PostHandDecisionView {
  const metrics: string[] = [];

  if (mode === "technical") {
    if (item.equity !== undefined) metrics.push(`Equity ${percent(item.equity)}`);
    if (item.potOdds !== undefined) metrics.push(`Preço ${percent(item.potOdds)}`);
    if (item.evBB !== undefined) metrics.push(`EV ${signedBB(item.evBB)}`);
    if (item.betSizePct !== undefined && item.betSizeBB !== undefined) {
      metrics.push(`Sizing ~${percent(item.betSizePct)} · ${item.betSizeBB}bb`);
    }
  }

  return {
    decisionLine: decisionLineFor(item),
    reason: item.text,
    metrics,
  };
}

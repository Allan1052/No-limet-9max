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
  /**
   * A LEITURA: quão largo é o range do vilão naquele momento.
   * É a primeira frase de qualquer comentarista de poker ("ele abriu de UTG,
   * isso é range apertado") e o app já calculava o número sem nunca mostrar.
   * Indefinida quando o motor não estimou range (ex.: ninguém abriu).
   */
  leitura?: string;
  /**
   * A CONTA: sua chance de ganhar contra o preço que estava pagando.
   * No modo simples vai em português ("você ganha 22 de cada 100 vezes"); no
   * técnico, em números. Antes da auditoria de 11/09 isso só existia no modo
   * técnico — ou seja, o recreativo nunca via.
   */
  conta?: string;
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

/**
 * Rótulo da largura do range. Faixas convencionais de torneio, escritas aqui
 * para ficarem à vista em vez de espalhadas: abaixo de 20% é apertado, até 35%
 * é médio, acima disso é largo. O NÚMERO vai junto sempre — o rótulo é só
 * tradução, nunca substitui o dado.
 */
function larguraLabel(pct: number): string {
  if (pct < 0.2) return "range apertado";
  if (pct <= 0.35) return "range médio";
  return "range largo";
}

/** "22 de cada 100 vezes" — a mesma porcentagem, sem exigir saber o que é %. */
function emCada100(value: number): string {
  return `${Math.round(value * 100)} de cada 100 vezes`;
}

function buildLeitura(item: FeedbackItem, mode: CoachV2PostHandMode): string | undefined {
  const vr = item.villainRangePct;
  if (vr === undefined || vr <= 0) return undefined;
  const pct = percent(vr);
  if (mode === "technical") return `Range do vilão ~${pct} (${larguraLabel(vr)}).`;
  return `O vilão joga cerca de ${pct} das mãos nesse ponto — ${larguraLabel(vr)}.`;
}

function buildConta(item: FeedbackItem, mode: CoachV2PostHandMode): string | undefined {
  const eq = item.equity;
  const req = item.potOdds; // equity EXIGIDA pelo preço
  if (eq === undefined) return undefined;

  if (mode === "technical") {
    if (req === undefined) return `Equity ${percent(eq)}.`;
    const falta = Math.round((req - eq) * 100);
    const cauda = falta > 0 ? ` — faltam ${falta} pontos` : ` — sobram ${Math.abs(falta)} pontos`;
    return `Equity ${percent(eq)} vs preço ${percent(req)}${cauda}.`;
  }

  if (req === undefined) return `Com essa mão você ganha ${emCada100(eq)}.`;
  const falta = Math.round((req - eq) * 100);
  if (falta > 0) {
    return `Você ganha ${emCada100(eq)}. Pelo preço que estava pagando, precisaria ganhar ${Math.round(req * 100)} — faltam ${falta}.`;
  }
  return `Você ganha ${emCada100(eq)} e só precisava de ${Math.round(req * 100)} — o preço estava bom.`;
}

export function buildCoachV2PostHandDecision(
  item: FeedbackItem,
  mode: CoachV2PostHandMode,
): CoachV2PostHandDecisionView {
  const metrics: string[] = [];

  if (mode === "technical") {
    if (item.evBB !== undefined) metrics.push(`EV ${signedBB(item.evBB)}`);
    if (item.betSizePct !== undefined && item.betSizeBB !== undefined) {
      metrics.push(`Sizing ~${percent(item.betSizePct)} · ${item.betSizeBB}bb`);
    }
  }

  return {
    decisionLine: decisionLineFor(item),
    reason: item.text,
    metrics,
    leitura: buildLeitura(item, mode),
    conta: buildConta(item, mode),
  };
}

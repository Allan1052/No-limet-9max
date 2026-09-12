import type { FeedbackItem } from "../feedback/analyzer";
import { construirCamadas, type FonteCamadas } from "./coachCamadas";
import { temDadoPara } from "../feedback/coachContract";

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
  /**
   * O QUE MUDARIA: o tamanho de aposta em que a decisão vira. Sai da régua do
   * próprio motor (invertida por bisseção), então nunca contradiz o veredito.
   */
  oQueMudaria?: string;
  /**
   * CARTAS QUE TE SALVAVAM: quantas cartas colocam o herói na frente e a chance
   * de vir uma delas. Só existe quando ele estava ATRÁS e ainda havia carta por
   * vir — senão não há o que salvar.
   */
  cartasSalvadoras?: string;
  /**
   * O TOPO DO RANGE DELE: que fração do range dele forma trinca ou melhor NESTE
   * board. É o "range limitado" (capped) que o comentarista narra — e é
   * contagem, não opinião. Entrega o número e para: não conclui "logo, blefe".
   */
  topoRange?: string;
  /**
   * O PESO DA BOLHA: só existe quando o motor, rodado com e sem os prêmios na
   * conta, deu respostas DIFERENTES. É a única forma honesta de dizer "foi o
   * ICM" — sem essa diferença medida, a frase não nasce.
   */
  pesoDaBolha?: string;
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
    const fonte = item as unknown as Record<string, unknown>;
    if (temDadoPara("ev", fonte)) metrics.push(`EV ${signedBB(item.evBB!)}`);
    if (temDadoPara("sizing", fonte)) {
      metrics.push(`Sizing ~${percent(item.betSizePct!)} · ${item.betSizeBB}bb`);
    }
  }

  // As camadas vivem em coachCamadas.ts, compartilhadas com a dica AO VIVO —
  // assim a mesa e o pós-mão nunca explicam a mesma coisa de dois jeitos.
  const fonte: FonteCamadas = {
    equity: item.equity,
    requiredEquity: item.potOdds,
    villainRangePct: item.villainRangePct,
    topoRangePct: item.topoRangePct,
    icmDelta: item.icmDelta,
    breakEvenCallBB: item.breakEvenCallBB,
    adviceFam: item.adviceFam,
    outs: item.outs,
  };
  return {
    decisionLine: decisionLineFor(item),
    reason: item.text,
    metrics,
    ...construirCamadas(fonte, mode),
  };
}

import type { HeroAdvice, IcmDelta } from "./analyzer";
import { porQue } from "../ui/coachCamadas";

export type CoachV2Street = "preflop" | "flop" | "turn" | "river" | string;

export interface CoachV2Context {
  street: CoachV2Street;
  potBB?: number;
  toCallBB?: number;
  spr?: number;
  /** A mão do herói é forte o bastante pra "tentar" a pagar barato? Só quando
   *  true mostramos o "porquê" do fold-barato — pra lixo óbvio (82o) fica off. */
  heroHandTempting?: boolean;
}

export interface CoachV2Decision {
  street: CoachV2Street;
  action: string;
  reason: string;
  contextLabel: string;
  heroPosition?: string;
  effectiveBB?: number;
  potBB?: number;
  toCallBB?: number;
  spr?: number;
  equity?: number;
  requiredEquity?: number;
  evBB?: number;
  villainRangePct?: number;
  /** Fração do range dele que forma trinca ou melhor no board (0..1). */
  topoRangePct?: number;
  /** O ICM medido: a decisão sem os prêmios, quando difere da com. */
  icmDelta?: IcmDelta;
  /** O motivo REAL do motor, inteiro — para o painel que abre no ▾. */
  porQueCompleto?: string;
  betSizePct?: number;
  betSizeBB?: number;
  nBet?: string;
  betLevelFaced?: number;
  stageLabel?: string;
  /**
   * Frase CURTA de "porquê", mostrada AO VIVO só nos spots que enganam — hoje:
   * FOLD com preço barato (o clássico "tá barato, deixa eu pagar" que na verdade
   * perde no longo prazo). Vem do MOTIVO REAL do motor (nada inventado), sem
   * números, pra caber na faixa de dica. Fica indefinida nas jogadas óbvias.
   */
  trapNote?: string;
}

/**
 * A NOTA CURTA DA FAIXA — o motivo REAL do motor, para TODA recomendação.
 *
 * 12/09/2026. Antes disto a faixa só explicava um caso (o fold barato) e ficava
 * MUDA em todo o resto: "💡 Raise" e nada mais. O Allan mostrou os prints —
 * AJo e KJs pedindo raise sem uma palavra de porquê — e é a crítica certa: a
 * hora em que ele quer entender é a hora de decidir, não depois.
 *
 * E o pouco que aparecia vinha quebrado: a nota passava por `plainReason`, que
 * apagava toda porcentagem da frase. "Paga: equity 52% ≥ preço 38%" virava
 * "Paga: ≥." e o caso de ICM virava "exige (2 oponentes)", sem o número. Era
 * essa a superficialidade que ele relatou. Agora o motivo vai inteiro, com os
 * números que o sustentam; só o código da mão sai (as cartas estão na mesa).
 *
 * O gancho "Tá barato, mas ..." continua existindo — ele ataca um instinto real
 * ("tá barato, deixa eu pagar") — mas só onde a palavra "barato" é verdadeira.
 */
function buildNotaCurta(
  reason: string,
  ganchoBarato: boolean,
): string | undefined {
  const core = porQue(reason);
  if (!core) return undefined;
  // Só a primeira oração: a faixa é uma linha, o resto abre no ▾.
  let curta = core.split(/(?<=[.!?])\s/)[0].replace(/[.\s]+$/, "").trim();
  if (curta.length < 8) return undefined;
  if (ganchoBarato) {
    curta = `Tá barato, mas ${curta.charAt(0).toLowerCase()}${curta.slice(1)}`;
  }
  // Corte com reticências: a faixa corta por CSS de qualquer jeito, e cortar
  // aqui deixa claro que há mais (e o "mais" está a um toque, no ▾).
  const LIMITE = 96;
  if (curta.length > LIMITE) curta = `${curta.slice(0, LIMITE - 1).trimEnd()}…`;
  return `${curta}.`.replace(/\.\.$/, ".").replace(/…\.$/, "…");
}

function streetLabel(street: string): string {
  switch (street.toLowerCase()) {
    case "preflop": return "Pré-flop";
    case "flop": return "Flop";
    case "turn": return "Turn";
    case "river": return "River";
    default: return street;
  }
}

function facedLabel(level: number | undefined): string | undefined {
  if (level === undefined) return undefined;
  if (level >= 3) return "enfrentando 4-bet";
  if (level === 2) return "enfrentando 3-bet";
  if (level === 1) return "enfrentando raise";
  return undefined;
}

function fmtBB(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}bb`;
}

export function buildCoachV2Decision(advice: HeroAdvice, context: CoachV2Context): CoachV2Decision {
  const parts: string[] = [streetLabel(context.street)];
  if (advice.heroPosition) parts.push(advice.heroPosition);
  if (advice.effectiveBB !== undefined) parts.push(fmtBB(advice.effectiveBB));
  const faced = facedLabel(advice.betLevelFaced);
  if (faced) parts.push(faced);

  // "Spot que engana": FOLD com preço BARATO em mão que TENTA (broadway/ás/par).
  // Barato em relação ao POTE — pagar ~1/3 ou menos (2:1 ou melhor).
  //
  // ⚠️ E TAMBÉM em relação ao SEU STACK. Esta segunda trava nasceu de um print
  // do Allan: com 10,7bb, enfrentando dois all-ins, pagar 10,2bb num pote de
  // 22,9bb dava 31% do pote — "barato" pela conta antiga. Só que eram 95% do
  // stack dele: a mão inteira, o torneio inteiro. Chamar aquilo de barato era o
  // oposto da verdade. Agora "barato" exige as duas coisas.
  const toCall = context.toCallBB ?? 0;
  const pot = context.potBB ?? advice.potBB ?? 0;
  const stack = advice.effectiveBB;
  const priceFrac = toCall > 0 && pot > 0 ? toCall / (pot + toCall) : undefined;
  const fracaoDoStack = toCall > 0 && stack && stack > 0 ? toCall / stack : undefined;
  const baratoNoPote = priceFrac !== undefined && priceFrac <= 0.34;
  const baratoNoStack = fracaoDoStack === undefined || fracaoDoStack <= 0.25;
  const ganchoBarato =
    advice.action === "fold" && baratoNoPote && baratoNoStack && !!context.heroHandTempting;
  // A nota agora existe para TODA recomendação — o "porquê" não é privilégio do
  // fold barato. O gancho "Tá barato, mas" é que continua sendo exceção.
  const trapNote = buildNotaCurta(advice.reason, ganchoBarato);

  return {
    street: context.street,
    action: advice.action,
    reason: advice.reason,
    contextLabel: parts.join(" · "),
    heroPosition: advice.heroPosition,
    effectiveBB: advice.effectiveBB,
    potBB: context.potBB ?? advice.potBB,
    toCallBB: context.toCallBB,
    spr: context.spr,
    equity: advice.equity,
    requiredEquity: advice.potOdds,
    evBB: advice.evBB,
    villainRangePct: advice.villainRangePct,
    topoRangePct: advice.topoRangePct,
    icmDelta: advice.icmDelta,
    porQueCompleto: porQue(advice.reason),
    betSizePct: advice.betSizePct,
    betSizeBB: advice.betSizeBB,
    nBet: advice.nBet,
    betLevelFaced: advice.betLevelFaced,
    stageLabel: advice.stageLabel,
    trapNote,
  };
}

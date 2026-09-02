import type { HeroAdvice } from "./analyzer";
import { plainReason } from "./analyzer";

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
 * Monta a frase curta de "porquê" para o FOLD-barato. Reaproveita o motivo real
 * do motor (via plainReason), tira o prefixo do código da mão (ex.: "KJo: ") —
 * a mão já está na mesa — e mantém só a primeira oração, com um gancho que
 * conecta com a intuição do jogador ("tá barato, mas...").
 */
function buildCheapFoldNote(reason: string): string | undefined {
  const plain = plainReason(reason);
  if (!plain) return undefined;
  // Tira o prefixo "KJo: " / "A5s: " / "TT: " (código curto da mão + dois-pontos).
  let core = plain.replace(/^[AKQJT2-9]{1,2}[so]?:\s*/i, "");
  // Só a primeira oração, pra caber na faixa (o resto é detalhe pro modal).
  core = core.split(/(?<=[.!?])\s/)[0].replace(/[.\s]+$/, "").trim();
  if (core.length < 8) return undefined; // motivo genérico demais: não mostra
  // Começa em minúscula pra emendar no gancho "Tá barato, mas ...".
  const lowered = core.charAt(0).toLowerCase() + core.slice(1);
  return `Tá barato, mas ${lowered}.`;
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
  // O preço vem do que há pra pagar (toCall) sobre o pote — barato = pagar ~1/3
  // ou menos do pote (2:1 ou melhor). É o caso do KJo que o Allan pegou: o preço
  // convida, mas a mão perde no longo prazo. Lixo óbvio (82o) NÃO entra — ninguém
  // se tenta, então a nota só faria barulho.
  const toCall = context.toCallBB ?? 0;
  const pot = context.potBB ?? advice.potBB ?? 0;
  const priceFrac = toCall > 0 && pot > 0 ? toCall / (pot + toCall) : undefined;
  const isCheapFold =
    advice.action === "fold" && priceFrac !== undefined && priceFrac <= 0.34;
  const trapNote =
    isCheapFold && context.heroHandTempting ? buildCheapFoldNote(advice.reason) : undefined;

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
    betSizePct: advice.betSizePct,
    betSizeBB: advice.betSizeBB,
    nBet: advice.nBet,
    betLevelFaced: advice.betLevelFaced,
    stageLabel: advice.stageLabel,
    trapNote,
  };
}

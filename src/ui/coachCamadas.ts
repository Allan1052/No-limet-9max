// ---------------------------------------------------------------------------
// AS CAMADAS DE EXPLICAÇÃO DO COACH — um lugar só, duas telas.
//
// Estas frases nasceram no PÓS-MÃO. Em 12/09/2026 o Allan mostrou o buraco: na
// MESA, na hora de decidir, a dica dizia só "💡 Raise" e abria um painel com
// números soltos (posição, stack, pote). Nenhum PORQUÊ. Ou seja: a explicação
// que ele queria existia — e só chegava depois que a mão já tinha acabado.
//
// Então as camadas saíram do arquivo do pós-mão e vieram para cá, trabalhando
// sobre uma FONTE NORMALIZADA. Quem tem os dados monta a fonte e recebe as
// mesmas frases: o pós-mão a partir do FeedbackItem, a mesa a partir da decisão
// ao vivo. Uma frase só existe num lugar, então não tem como as duas telas
// divergirem.
//
// Toda frase continua passando pela porta do contrato (coachContract.ts): sem o
// dado, a frase não nasce.
// ---------------------------------------------------------------------------

import type { Family, IcmDelta } from "../feedback/analyzer";
import { actionLabel } from "../feedback/analyzer";
import { temDadoPara } from "../feedback/coachContract";

export type CoachModo = "simple" | "technical";

/**
 * QUANDO a frase é lida. Muda só o TEMPO VERBAL, e muda por um motivo real: na
 * mesa a decisão ainda não foi tomada ("o preço está bom"), no pós-mão ela já
 * foi ("o preço estava bom"). Sem isto, uma das duas telas fica escrita errado.
 */
export type CoachMomento = "aoVivo" | "posMao";

/** Os dados de que as camadas precisam, com nomes únicos para as duas telas. */
export interface FonteCamadas {
  /** Sua chance de ganhar (0..1). */
  equity?: number;
  /** A chance que o PREÇO exige (0..1). */
  requiredEquity?: number;
  /** Largura do range do vilão (0..1). */
  villainRangePct?: number;
  /** Fração do range dele que forma trinca ou melhor no board (0..1). */
  topoRangePct?: number;
  /** O ICM medido (motor rodado com e sem prêmios). */
  icmDelta?: IcmDelta;
  /** Tamanho de aposta que viraria a decisão (bb). */
  breakEvenCallBB?: number;
  /** Família da ação recomendada — o ponto de virada só vale sobre fold. */
  adviceFam?: Family;
  /** Cartas que colocavam o herói na frente. */
  outs?: { outs: number; chance: number };
}

export interface CamadasView {
  /** A leitura: quão largo é o range do vilão. */
  leitura?: string;
  /** O topo do range dele: quanto dele forma trinca ou melhor neste board. */
  topoRange?: string;
  /** A conta: sua chance contra a chance que o preço exige. */
  conta?: string;
  /** O peso da bolha: o ICM medido, quando mudou a decisão. */
  pesoDaBolha?: string;
  /** O que mudaria: o tamanho de aposta em que a decisão vira. */
  oQueMudaria?: string;
  /** Cartas que te salvavam. */
  cartasSalvadoras?: string;
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
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

function buildLeitura(f: FonteCamadas, mode: CoachModo): string | undefined {
  if (!temDadoPara("leituraRange", f as unknown as Record<string, unknown>)) return undefined;
  const vr = f.villainRangePct;
  if (vr === undefined || vr <= 0) return undefined;
  const pct = percent(vr);
  if (mode === "technical") return `Range do vilão ~${pct} (${larguraLabel(vr)}).`;
  return `O vilão joga cerca de ${pct} das mãos nesse ponto — ${larguraLabel(vr)}.`;
}

function buildTopoRange(f: FonteCamadas, mode: CoachModo): string | undefined {
  if (!temDadoPara("topoRange", f as unknown as Record<string, unknown>)) return undefined;
  const frac = f.topoRangePct;
  if (frac === undefined) return undefined;
  const pct = Math.round(frac * 100);
  if (mode === "technical") return `Topo do range dele: ${pct}% forma trinca ou melhor neste board.`;
  if (pct === 0) return "Nenhuma mão do range dele forma trinca ou melhor nesse board.";
  return `Do range dele, ${pct} em cada 100 mãos formam trinca ou melhor nesse board.`;
}

function buildConta(f: FonteCamadas, mode: CoachModo, momento: CoachMomento): string | undefined {
  if (!temDadoPara("equityPreco", f as unknown as Record<string, unknown>)) return undefined;
  const eq = f.equity;
  const req = f.requiredEquity; // equity EXIGIDA pelo preço
  if (eq === undefined) return undefined;

  if (mode === "technical") {
    if (req === undefined) return `Equity ${percent(eq)}.`;
    const falta = Math.round((req - eq) * 100);
    const cauda = falta > 0 ? ` — faltam ${falta} pontos` : ` — sobram ${Math.abs(falta)} pontos`;
    return `Equity ${percent(eq)} vs preço ${percent(req)}${cauda}.`;
  }

  if (req === undefined) return `Com essa mão você ganha ${emCada100(eq)}.`;
  const falta = Math.round((req - eq) * 100);
  const pagando = momento === "aoVivo" ? "está pagando" : "estava pagando";
  if (falta > 0) {
    return `Você ganha ${emCada100(eq)}. Pelo preço que ${pagando}, precisaria ganhar ${Math.round(req * 100)} — faltam ${falta}.`;
  }
  const precisa = momento === "aoVivo" ? "precisa" : "precisava";
  const esta = momento === "aoVivo" ? "está" : "estava";
  return `Você ganha ${emCada100(eq)} e só ${precisa} de ${Math.round(req * 100)} — o preço ${esta} bom.`;
}

function buildPesoDaBolha(f: FonteCamadas, mode: CoachModo): string | undefined {
  if (!temDadoPara("icmDelta", f as unknown as Record<string, unknown>)) return undefined;
  const d = f.icmDelta;
  if (!d) return undefined;
  const com = actionLabel(d.comIcm);
  const sem = actionLabel(d.semIcm);
  if (mode === "technical") return `Com prêmios na conta: ${com.toUpperCase()}. Sem: ${sem.toUpperCase()}.`;
  return `Os prêmios do torneio mudaram essa decisão: valendo só fichas o padrão seria ${sem.toUpperCase()}; com o prêmio em jogo, é ${com.toUpperCase()}.`;
}

function buildOQueMudaria(f: FonteCamadas, mode: CoachModo): string | undefined {
  if (!temDadoPara("breakEven", f as unknown as Record<string, unknown>)) return undefined;
  const virada = f.breakEvenCallBB;
  if (virada === undefined || virada <= 0) return undefined;
  // Só faz sentido quando o motor mandou FOLDAR: aí a frase responde "e se ele
  // tivesse apostado menos?". Num call aprovado, dizer o ponto de virada seria
  // ruído (a decisão já estava certa).
  if (f.adviceFam !== "fold") return undefined;
  if (mode === "technical") return `Viraria call com até ${virada}bb para pagar.`;
  return `Se ele tivesse apostado até ${virada}bb, aí valeria pagar.`;
}

function buildCartasSalvadoras(f: FonteCamadas, mode: CoachModo, momento: CoachMomento): string | undefined {
  if (!temDadoPara("outs", f as unknown as Record<string, unknown>)) return undefined;
  const o = f.outs;
  if (!o || o.outs <= 0) return undefined;
  const chance = Math.round(o.chance * 100);
  const cartas = o.outs === 1 ? "1 carta" : `${o.outs} cartas`;
  if (mode === "technical") return `${o.outs} outs · ${chance}% na próxima carta.`;
  const colocam = momento === "aoVivo" ? "te colocam" : "te colocavam";
  return `${cartas} ${colocam} na frente — ${chance}% de chance de vir na próxima.`;
}

export function construirCamadas(
  f: FonteCamadas,
  mode: CoachModo,
  momento: CoachMomento = "posMao",
): CamadasView {
  return {
    leitura: buildLeitura(f, mode),
    topoRange: buildTopoRange(f, mode),
    conta: buildConta(f, mode, momento),
    pesoDaBolha: buildPesoDaBolha(f, mode),
    oQueMudaria: buildOQueMudaria(f, mode),
    cartasSalvadoras: buildCartasSalvadoras(f, mode, momento),
  };
}

// ---------------------------------------------------------------------------
// O "POR QUÊ" — o motivo REAL do motor, inteiro.
//
// ⚠️ NÃO passa por plainReason. Aquela função existia para "limpar jargão" no
// modo simples e apagava toda porcentagem da frase — o que produzia coisas como
// "Paga: ≥." e "Folda: preço do pote + ICM (prêmio de risco) → exige (2
// oponentes)". Era essa a sensação de superficialidade que o Allan relatou: a
// frase chegava na tela sem os números que a sustentavam.
//
// Aqui a gente tira só o que é redundante com a tela — o código da mão no
// começo ("KJs: "), já que as cartas estão à vista — e mantém o resto intacto.
// ---------------------------------------------------------------------------
export function porQue(reason: string | undefined): string | undefined {
  if (!reason) return undefined;
  const core = reason.replace(/^[AKQJT2-9]{1,2}[so]?:\s*/i, "").trim();
  if (core.length < 8) return undefined; // motivo genérico demais: não mostra
  return core.charAt(0).toUpperCase() + core.slice(1);
}

// ---------------------------------------------------------------------------
// MATEMÁTICA PÓS-FLOP COMPARTILHADA — fonte ÚNICA do "quanto de equity preciso
// pra pagar".
//
// Antes existiam DUAS contas diferentes:
//   • o motor da MESA (src/bots/decision.ts) exigia pot odds + disciplina
//     (+0.11 base, penalidade de rua, ajuste de perfil, multiway);
//   • o motor do COACH/revisão (src/train/streets/dynamicRanges.ts) pagava com
//     equity apenas ~4 pontos acima do preço cru.
//
// Resultado: o coach APROVAVA calls frouxos e criticava folds bons — conselho
// que não batia com como os bots jogam contra o Allan. Este módulo centraliza a
// regra pra que a MESA e o COACH usem exatamente o mesmo critério de call.
// ---------------------------------------------------------------------------

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

export interface RequiredEquityParams {
  /** Pot total (mesmas unidades de `toCall`) ANTES de pagar. */
  potBB: number;
  /** Fichas para pagar. */
  toCall: number;
  /** 0 = flop, 1 = turn, 2 = river. */
  streetIdx: number;
  /**
   * "Aderência" do vilão/perfil (0..1). 0.5 = neutro (sem ajuste). O coach usa
   * 0.5 (não personifica ninguém); a mesa passa a stickiness do perfil do bot.
   */
  stickiness?: number;
  /** Nº de oponentes ainda na mão (default 1). */
  numOpp?: number;
  /** Pagar significa ir all-in? Aí a exigência é o preço cru (ICM à parte). */
  isAllIn?: boolean;
  /** Força do projeto (0..1) — projeto forte (>0.5) ganha crédito de implied odds. */
  drawStrength?: number;
  /** Fichas ATRÁS depois de pagar (pra escalar implied odds pelo SPR). */
  heroStackBehind?: number;
  /**
   * Largura estimada do range do vilão (0..1) DEPOIS da linha de apostas dele.
   * Anti-dupla-penalização: se a agressão do vilão já estreitou a range (e a
   * equity do herói já reflete isso), parte do "aposta = força" já foi contada —
   * então reduzimos só a parcela redundante do colchão fixo. Ausente ou range
   * largo ⇒ colchão cheio (comportamento idêntico ao anterior).
   */
  villainRangePct?: number;
}

/**
 * Equity mínima (0..1) para PAGAR uma aposta pós-flop.
 *
 * No river, sem cartas futuras e sem ICM neste módulo, a referência correta é
 * simplesmente o preço do pote. Qualquer disciplina adicional deve vir da
 * estimativa da range/equity do vilão, não de uma sobretaxa fixa que conte a
 * força da aposta duas vezes.
 *
 * Flop/turn mantêm a heurística conservadora enquanto o Motor V2 migra a
 * realização de equity e implied odds para modelos mais explícitos.
 *
 * All-in devolve o preço cru (o ICM, quando existe, é aplicado por quem chama).
 */
export function postflopRequiredEquity(p: RequiredEquityParams): number {
  const potOdds = p.toCall / (p.potBB + p.toCall);
  if (p.isAllIn || p.streetIdx === 2) return potOdds;

  const streetPenalty = [0.04, 0.12][p.streetIdx] ?? 0.12;
  const stickiness = p.stickiness ?? 0.5;
  const discipline = (0.5 - stickiness) * 0.7; // nit +, station −
  const numOpp = p.numOpp ?? 1;
  const multiwayPenalty = Math.min(0.16, 0.08 * (numOpp - 1));

  // COLCHÃO FIXO ("aposta = força" + reverse implied). Anti-dupla-penalização:
  // quando o range do vilão JÁ está estreito pela linha agressiva (a equity do
  // herói já caiu por causa disso), parte desse colchão já foi contada no cálculo
  // da equity — então reduzimos só a fração redundante (no máximo metade). Range
  // largo/ausente ⇒ colchão cheio (0.11), idêntico ao comportamento anterior.
  const vr = p.villainRangePct ?? 0.5;
  const alreadyPriced = clamp((0.45 - vr) / 0.35, 0, 1); // 0 se ≥45%; 1 se ≤10%
  const baseCushion = 0.11 * (1 - 0.5 * alreadyPriced);

  let required = clamp(potOdds + baseCushion + streetPenalty + discipline + multiwayPenalty, 0.13, 0.8);

  // IMPLIED ODDS: projeto forte no flop/turn paga com um pouco menos de equity,
  // porque ganha fichas extras quando completa. Escalado pelo stack atrás (fundo
  // = mais implied) com cap pequeno.
  if ((p.drawStrength ?? 0) > 0.5 && p.heroStackBehind !== undefined) {
    const spr = p.heroStackBehind / Math.max(1, p.potBB + p.toCall);
    const depth = clamp(spr / 4, 0, 1); // ~0 raso, 1 fundo (SPR≥4)
    const streetsLeft = p.streetIdx === 0 ? 1 : 0.6; // flop rende mais que turn
    const impliedCredit = Math.min(0.09, (p.drawStrength ?? 0) * 0.11 * depth * streetsLeft);
    required = Math.max(0.13, required - impliedCredit);
  }

  return required;
}

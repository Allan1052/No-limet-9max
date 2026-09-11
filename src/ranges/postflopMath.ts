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

/**
 * O TAMANHO DE APOSTA QUE VIRA A DECISÃO.
 *
 * Responde a pergunta que todo comentarista faz no vídeo — *"se ele tivesse
 * apostado menos, aí eu pagava"* — e responde com a régua DO PRÓPRIO MOTOR.
 *
 * Como: `postflopRequiredEquity` cresce junto com o valor a pagar (o preço
 * piora). Então existe um ponto em que a equity do herói empata com a exigida.
 * Em vez de refazer a álgebra (que erraria, porque a fórmula tem colchão,
 * penalidade de rua, disciplina e implied odds), a gente PROCURA esse ponto por
 * bisseção na função original. Assim a resposta nunca contradiz o veredito.
 *
 * Devolve o valor a pagar (em bb) no ponto de virada, ou `undefined` quando não
 * existe ponto de virada útil:
 *  - equity baixa demais: nem uma aposta minúscula tornaria o call correto;
 *  - equity alta demais: dentro de tamanhos plausíveis (até 10× o pote) o call
 *    continua certo.
 */
export function breakEvenToCallBB(
  equity: number,
  base: Omit<RequiredEquityParams, "toCall">,
): number | undefined {
  const req = (toCall: number) => postflopRequiredEquity({ ...base, toCall });

  // Piso: uma aposta simbólica. Se nem assim a equity alcança a exigida, não há
  // tamanho que salve — dizer "se ele apostasse X" seria mentira.
  const minToCall = Math.max(0.01, base.potBB * 0.01);
  if (equity < req(minToCall)) return undefined;

  // Teto: 10× o pote. Se ainda paga lá, não há ponto de virada plausível.
  const maxToCall = Math.max(minToCall * 2, base.potBB * 10);
  if (equity >= req(maxToCall)) return undefined;

  let lo = minToCall;
  let hi = maxToCall;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (equity >= req(mid)) lo = mid;
    else hi = mid;
  }
  // Arredonda PARA BAIXO: o número que a gente mostra tem que ser mesmo pagável.
  // Arredondar para cima devolvia um valor 0,3 ponto acima da virada — ou seja,
  // a dica diria "com X valeria pagar" e pagar X já estaria errado.
  const arredondado = Math.floor(lo * 10) / 10;
  return arredondado >= 0.1 ? arredondado : undefined;
}

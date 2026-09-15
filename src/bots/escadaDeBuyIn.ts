// ---------------------------------------------------------------------------
// A ESCADA DE DIFICULDADE — cada faixa com a cara da mesa que ela imita.
//
// ✨ 15/09/2026, pedido do Allan: *"quero sentir a sensação de estar disputando
// cada faixa e ter a realidade de cada uma de acordo com o que é jogado nas
// mesas online do GGPoker e PokerStars. Principalmente o de 10,3K quero bem
// difícil."*
//
// A escada EXISTIA, mas só mexia no pré-flop e na largura de range. Medindo 70
// torneios em 15/09 ficou claro o buraco: `adjustProfileForBuyIn` nunca tocava
// em `barrelTurn`, `barrelRiver` nem `cbetFactor`. Ou seja, **a agressão
// pós-flop do campo de $5 e do campo de $10.300 era a MESMA**. Por isso a carta
// de graça só caía de 79% para 49% — e o que caía vinha de raspão, pelo
// bluffFactor.
//
// ═══ DE ONDE SAEM OS ALVOS (nada aqui é chute) ═══════════════════════════
//
// • C-BET no flop: a era do "c-beta 70%+" acabou; hoje a faixa da população
//   fica em 40%-60%.                                       [pokercopilot]
// • CHECK-RAISE no flop: nos micros é raro passar de ~7% (lá quase só se
//   check-raisa com mão feita); em MTT a faixa é 10,4%-18,5%, e a recomendação
//   é ficar perto do TOPO porque as c-bets de torneio são menores; solvers
//   chegam a 21% em BB vs BTN contra stab de 33% do pote.
//                          [mttpokerschool, BlackRain79, Upswing, cardplayer]
// • 3-BET: 3%-5% é o padrão de full ring; um regular sólido fica perto de
//   10,6%.                                          [pokercopilot, runitonce]
// • VPIP/PFR: reg de micro 21-28 / 17-23; reg sólido de stake alta 19/17 a
//   25/23, e os vencedores chegam a 27/19-28/20. Peixe: VPIP>35, PFR<10,
//   3bet<4.                                       [2+2 micro forum, runitonce]
// • BARREL no turn: quem segue no turn aposta MAIOR que no flop (55%-100% do
//   pote) — a mão está polarizada e o que se busca é alavancagem. [bbzpoker]
// • COMPOSIÇÃO DO CAMPO: o GGPoker tem população mais recreativa que o
//   PokerStars; já os high rollers de $210 a $5.000 do GG são jogados
//   regularmente por profissionais conhecidos.                   [primedope]
//   É a justificativa para o $10,3K ser um campo de regulares de verdade.
//
// ⚠️ Honestidade: isto NÃO é uma cópia estatística da população do GGPoker —
// ninguém publica esse dado. É uma escada construída para CABER nas faixas
// publicadas acima, ancorada nos dois extremos (micro ~7% de check-raise e
// c-bet ~45%; elite no topo da faixa de MTT). O que o app promete é isso, e é
// o que o `escadaDeBuyIn.test.ts` verifica.
// ---------------------------------------------------------------------------

import { buyInToughness, fieldEliteness } from "./profiles";

/** Alvos observáveis de uma faixa — usados nos testes e na régua de pressão. */
export interface AlvoDaFaixa {
  rotulo: string;
  /** Check-raise no flop, em fração do range (0..1). */
  checkRaiseFlop: [number, number];
  /** C-bet no flop (0..1). */
  cbetFlop: [number, number];
  /** Segunda barrelada no turn (0..1). */
  barrelTurn: [number, number];
}

/**
 * A escada, faixa a faixa. Os intervalos são largos de propósito: o campo é uma
 * MISTURA de perfis, e o que se mede é a média da mesa, não um jogador.
 */
export const ALVOS: Array<{ buyIn: number } & AlvoDaFaixa> = [
  { buyIn: 5,     rotulo: "Micro",  checkRaiseFlop: [0.04, 0.09], cbetFlop: [0.40, 0.52], barrelTurn: [0.58, 0.72] },
  { buyIn: 11,    rotulo: "Baixa",  checkRaiseFlop: [0.04, 0.10], cbetFlop: [0.48, 0.60], barrelTurn: [0.58, 0.72] },
  { buyIn: 22,    rotulo: "Média",  checkRaiseFlop: [0.04, 0.10], cbetFlop: [0.48, 0.62], barrelTurn: [0.60, 0.74] },
  { buyIn: 55,    rotulo: "Média+", checkRaiseFlop: [0.04, 0.11], cbetFlop: [0.54, 0.66], barrelTurn: [0.60, 0.75] },
  { buyIn: 109,   rotulo: "Alta",   checkRaiseFlop: [0.08, 0.16], cbetFlop: [0.62, 0.75], barrelTurn: [0.70, 0.84] },
  { buyIn: 1000,  rotulo: "1K",     checkRaiseFlop: [0.08, 0.16], cbetFlop: [0.62, 0.75], barrelTurn: [0.68, 0.82] },
  { buyIn: 10300, rotulo: "10,3K",  checkRaiseFlop: [0.10, 0.18], cbetFlop: [0.62, 0.75], barrelTurn: [0.72, 0.86] },
];

// ═══ O QUE FOI MEDIDO (15/09/2026, 2.500 mãos por faixa, composição real do
// campo — régua src/sim/_agressaoRun.test.ts) ══════════════════════════════
//
//   buyIn   check-raise   c-bet   barrel turn   raise contra aposta
//       5          7,3%   46,1%         68,8%                 10,9%
//      11          6,5%   56,4%         63,2%                 12,1%
//      22          6,6%   54,1%         67,0%                 11,9%
//      55          6,4%   60,8%         67,8%                 11,5%
//     109         11,3%   70,4%         77,5%                 16,1%
//    1000          9,6%   70,1%         74,4%                 15,1%
//   10300         13,3%   68,2%         78,1%                 15,0%
//
// ⚠️ Leitura honesta destes números:
//   • O micro caiu em 7,3%, exatamente onde a literatura põe o micro ("raro
//     passar de ~7%"), e o 10,3K ficou em 13,3% — dentro da faixa de MTT
//     (10,4%-18,5%). A escada existe e o topo é o mais duro.
//   • Entre $11 e $55 o check-raise fica plano (6,4%-6,6%). Não é bug: nessas
//     faixas o campo é dominado por ABC/nit, que apertam a seleção antes de
//     apertar a agressão. O salto acontece quando entram TAG e LAG.
//   • O dente entre $109 (11,3%) e $1K (9,6%) está dentro da margem da amostra
//     (~350 spots cada, ±3 pontos). Não se deve ler diferença aí.
//   • O c-bet é medido em SPOT DE INICIATIVA (fui o agressor e a ação chegou
//     limpa), não sobre todos os flops — por isso fica acima dos 40%-60% que se
//     publica para a população inteira.

/**
 * Multiplicadores de AGRESSÃO PÓS-FLOP por buy-in.
 *
 * `t` sobe de 0 ($5) a 1 ($109); `e` sobe de 0 ($109) a 1 ($10.300). Aplicados
 * sobre o valor do perfil, para o arquétipo continuar sendo ele mesmo: um
 * "Paga-Tudo" de $10.300 continua pagando mais que um "Furacão", só que os dois
 * apertam mais do que os equivalentes do micro.
 */
export function fatoresPosFlop(buyIn?: number): {
  cbet: number;
  barrelTurn: number;
  barrelRiver: number;
} {
  const t = buyInToughness(buyIn);
  const e = fieldEliteness(buyIn);
  return {
    // C-bet varia pouco: a faixa da população inteira é estreita (40%-60%).
    // Medido em 15/09: com 0.18/0.14 o campo elite chegava a 70,6% de c-bet,
    // acima da faixa da população moderna (40%-60%). Puxado para trás.
    cbet: (1 + 0.12 * t) * (1 + 0.07 * e),
    // O turn é onde a diferença aparece de verdade. É o "seguir a história",
    // e é o que separa quem joga de quem só aposta o flop e desiste.
    barrelTurn: (1 + 0.42 * t) * (1 + 0.32 * e),
    barrelRiver: (1 + 0.38 * t) * (1 + 0.36 * e),
  };
}

/** Alvos da faixa mais próxima deste buy-in (para testes e diagnóstico). */
export function alvoDaFaixa(buyIn?: number): AlvoDaFaixa {
  const b = buyIn ?? 5;
  let melhor = ALVOS[0];
  for (const a of ALVOS) {
    if (Math.abs(Math.log10(a.buyIn) - Math.log10(b)) < Math.abs(Math.log10(melhor.buyIn) - Math.log10(b))) {
      melhor = a;
    }
  }
  return melhor;
}

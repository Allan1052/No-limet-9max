// ---------------------------------------------------------------------------
// "O TOPO DO RANGE DELE" — o range dele ainda tem mão fortíssima aqui?
//
// É o conceito que o comentarista de vídeo chama de range CAPPED ("limitado"):
// pelo jeito que o vilão jogou, o range que sobrou pra ele simplesmente não
// contém mais as mãos monstro. O app nunca dizia isso — e estava certo em não
// dizer, porque não media. Agora mede.
//
// COMO MEDIMOS. O motor já trabalha com um range para o vilão (o MESMO que ele
// usa para calcular a sua equity — nunca uma estimativa paralela). Pegamos cada
// combinação desse range que ainda é possível (não usa carta do board nem carta
// sua), juntamos com o board e perguntamos ao avaliador: isso forma trinca ou
// melhor? A resposta é uma CONTAGEM, não uma opinião.
//
// O que devolvemos é a FRAÇÃO do range dele que chega lá, pesada pela
// frequência de cada mão (a mão de fronteira do range entra parcial, e tem que
// contar parcial).
//
// O QUE ISTO NÃO FAZ. Não conclui nada. Saber que "só 3% do range dele forma
// trinca ou melhor" não autoriza o app a dizer "logo, blefe aqui" — a ação
// continua vindo do motor, exatamente como na regra dos bloqueadores. Aqui a
// gente entrega o número que o comentarista usaria, e para.
// ---------------------------------------------------------------------------

import type { Card } from "../engine/cards";
import { Category, categoryOf, evaluate } from "../engine/evaluator";
import { handTypeCombos, type Range } from "./types";

export interface TopoRange {
  /** Fração do range dele (0..1) que forma o limiar ou melhor neste board. */
  fracao: number;
  /** Peso de combos que chegam lá (já multiplicado pela frequência). */
  combos: number;
  /** Peso total de combos dele ainda possíveis com estas cartas na mesa. */
  total: number;
  /** Categoria-limiar usada, em português ("trinca", "dois pares"...). */
  limiarLabel: string;
}

const LABELS: Record<number, string> = {
  [Category.TwoPair]: "dois pares",
  [Category.Trips]: "trinca",
  [Category.Straight]: "sequência",
  [Category.Flush]: "flush",
};

/**
 * Mede quanto do range do vilão forma `limiar` ou melhor no board dado.
 *
 * @param villainRange o range que o MOTOR usou naquele spot.
 * @param board        3, 4 ou 5 cartas comunitárias.
 * @param heroCards    suas cartas — removem combos dele (você as bloqueia).
 * @param limiar       categoria mínima que conta como "topo" (padrão: trinca).
 *
 * Devolve `undefined` quando não há board suficiente ou quando não sobrou
 * nenhuma combinação possível: sem denominador, não há fração honesta.
 */
export function topoDoRange(
  villainRange: Range,
  board: Card[],
  heroCards: Card[] = [],
  limiar: number = Category.Trips,
): TopoRange | undefined {
  if (board.length < 3) return undefined;

  const bloqueadas = new Set<Card>([...board, ...heroCards]);
  let total = 0;
  let topo = 0;

  for (const [handType, freq] of Object.entries(villainRange)) {
    if (!freq || freq <= 0) continue;
    for (const combo of handTypeCombos(handType)) {
      if (bloqueadas.has(combo[0]) || bloqueadas.has(combo[1])) continue;
      total += freq;
      if (categoryOf(evaluate([...combo, ...board])) >= limiar) topo += freq;
    }
  }

  if (total <= 0) return undefined;
  return {
    fracao: topo / total,
    combos: Math.round(topo * 100) / 100,
    total: Math.round(total * 100) / 100,
    limiarLabel: LABELS[limiar] ?? "mão do topo",
  };
}

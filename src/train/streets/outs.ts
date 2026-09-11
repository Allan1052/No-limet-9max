// ---------------------------------------------------------------------------
// "CARTAS QUE TE SALVAVAM" — as outs, contadas de verdade.
//
// Item 6 da auditoria das dicas (11/09/2026). Era o único da lista que o app
// não sabia calcular: ele estimava equity, mas nunca perguntou "QUAIS cartas
// mudam essa mão".
//
// COMO CONTAMOS. Para cada carta que ainda pode vir (as 52 menos as suas duas e
// as do board), colocamos ela no board e medimos de novo a sua equity contra o
// range do vilão. Se você estava ATRÁS e aquela carta te coloca NA FRENTE, ela
// conta. Ou seja: "out" aqui é carta que te coloca na frente do range dele —
// não é "carta que melhora sua mão" (melhorar de 8-high para 9-high melhora a
// mão e não salva ninguém).
//
// POR QUE ISSO É HONESTO. A equity vem de simulação, então o número é uma
// ESTIMATIVA — o mesmo selo que a tela já mostra no pós-flop. Para o ruído da
// simulação não transformar carta irrelevante em out, exigimos uma folga: a
// carta precisa levar a equity a pelo menos 54%, não só encostar em 50%. E a
// semente é fixa, então o mesmo spot dá sempre a mesma resposta.
//
// QUANDO NÃO CONTAMOS. Se você já está na frente, não há o que salvar. No
// river não há carta por vir. Nesses casos devolvemos `undefined` em vez de
// inventar um número.
// ---------------------------------------------------------------------------
import { NUM_CARDS, seededRng, type Card } from "../../engine/cards";
import { equityHandVsRange } from "../../engine/equity";
import { rangeCombos, type Range } from "../../ranges/types";

export interface OutsResult {
  /** Quantas cartas colocam o herói na frente. */
  outs: number;
  /** Quantas cartas ainda podem vir (o denominador honesto). */
  cartasRestantes: number;
  /** Chance de vir uma delas na PRÓXIMA carta (outs / restantes), 0..1. */
  chanceProximaCarta: number;
  /** Os rótulos das cartas, para poder listar ("A♠, K♦, ..."). */
  labels: string[];
}

const RANK_SYM = "23456789TJQKA";
const SUIT_SYM = ["♣", "♦", "♥", "♠"];

function labelOf(card: Card): string {
  return `${RANK_SYM[(card >> 2)]}${SUIT_SYM[card & 3]}`;
}

/** Equity mínima para a carta contar como salvadora — folga contra o ruído. */
const LIMIAR_FRENTE = 0.54;
/** Acima disso o herói já está na frente: não há o que "salvar". */
const JA_NA_FRENTE = 0.5;

/**
 * Conta as cartas que tiram o herói de atrás e o colocam na frente.
 *
 * @param heroCards as DUAS cartas reais do herói (não o tipo de mão: o naipe
 *                  muda as outs de flush, então aqui precisa ser a mão mesmo).
 * @param board     cartas comunitárias atuais (3 no flop, 4 no turn).
 * @param villainRange range do vilão naquele momento.
 */
export function contarOuts(
  heroCards: Card[],
  board: Card[],
  villainRange: Range,
  iteracoes = 160,
): OutsResult | undefined {
  if (heroCards.length !== 2) return undefined;
  if (board.length !== 3 && board.length !== 4) return undefined; // só flop e turn

  const villain = rangeCombos(villainRange);
  if (villain.length === 0) return undefined;

  // Semente fixa derivada do spot: o mesmo spot responde sempre igual.
  const semente = heroCards.reduce((a, c) => a * 53 + c, 7) + board.reduce((a, c) => a * 53 + c, 11);

  const antes = equityHandVsRange(heroCards, villain, board, iteracoes * 3, seededRng(semente)).equity;
  if (antes >= JA_NA_FRENTE) return undefined; // já está na frente

  const usadas = new Set<Card>([...heroCards, ...board]);
  const labels: string[] = [];
  let restantes = 0;

  for (let c = 0; c < NUM_CARDS; c++) {
    if (usadas.has(c)) continue;
    restantes++;
    const depois = equityHandVsRange(
      heroCards,
      villain,
      [...board, c],
      iteracoes,
      seededRng(semente + c),
    ).equity;
    if (depois >= LIMIAR_FRENTE) labels.push(labelOf(c));
  }

  if (restantes === 0) return undefined;
  return {
    outs: labels.length,
    cartasRestantes: restantes,
    chanceProximaCarta: labels.length / restantes,
    labels,
  };
}

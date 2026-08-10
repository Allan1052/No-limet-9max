// ---------------------------------------------------------------------------
// PONTOS POY — adaptação fiel do sistema Player of the Year da WSOP.
//
// A WSOP calcula pontos a partir de TRÊS fatores (não um só):
//   1. posição final  — driver principal; vencer vale ~20x um min-cash
//   2. tamanho do campo — bater 2.000 pessoas vale mais que bater 200
//   3. buy-in           — evento mais caro tem multiplicador maior
//
// Em 2017 a razão vitória/min-cash da WSOP oscilava entre 3,25:1 e 8,16:1 e foi
// duramente criticada (Negreanu chamou a fórmula de "profoundly flawed"). De
// 2018 em diante ela foi travada em ~20:1. É esse formato que replicamos aqui.
//
// Curva real da WSOP 2018 (Main Event, 7.221 entradas):
//   1º = 1.694 | 2º = 847 | 9º = 424 | min-cash = 85
// Ou seja: 2º ≈ metade do 1º, 9º ≈ um quarto do 1º, min-cash ≈ 1/20 do 1º.
//
// REGRA DE ELEGIBILIDADE (decisão do projeto):
// só torneio DISPUTADO DESDE O INÍCIO conta para o ranking. Quem começa no
// Meio, na Bolha ou na Mesa Final está treinando — não pontua. Sem isso o
// placar mediria atalho, não habilidade.
//
// Como na WSOP, também:
//   - só pontua quem CHEGA AO DINHEIRO (o app paga ~15% do campo, igual à WSOP)
//   - o total é CUMULATIVO (cada torneio soma)
//   - contam apenas os N MELHORES resultados (a WSOP usa 10) — evita que quem
//     tem mais tempo livre vença por volume em vez de desempenho
//   - é preciso um MÍNIMO de resultados para valer o título (a WSOP exige 5)
//   - o buy-in é AMORTECIDO na raiz 4,5 (não na raiz quadrada): um evento 10x
//     mais caro rende ~1,7x os pontos-base, não 10x — como a WSOP faz
// ---------------------------------------------------------------------------
import type { Stage } from "./structure";
import { paidPlaces } from "./structure";

/** Único estágio que dá direito a pontos no ranking de torneios. */
export const RANKED_STAGE: Stage = "inicio";

/** Quantos resultados entram no total de cada jogador (a WSOP usa 10). */
export const BEST_RESULTS_COUNT = 10;

/** Mínimo de resultados no dinheiro para valer o título, como a WSOP (5). */
export const MIN_RESULTS_TO_QUALIFY = 5;

/** Pontos do campeão num evento neutro (100 entradas, buy-in $5). */
const CHAMPION_BASE = 1000;

/** Razão vitória : min-cash. A WSOP fixou em ~20:1 a partir de 2018. */
const WIN_TO_MINCASH_RATIO = 20;

/** Campo de referência: 100 entradas => multiplicador 1,0. */
const FIELD_BASELINE = 100;

/** Buy-in de referência: $5 (o menor da grade do app) => multiplicador 1,0. */
const BUYIN_BASELINE = 5;

/**
 * Raiz que amortece o buy-in. A WSOP usa a raiz 4,5 (não a raiz quadrada): um
 * evento 10x mais caro rende ~1,7x os pontos-base, não 10x. Assim a faixa alta
 * não domina o placar só pelo preço.
 */
const BUYIN_ROOT = 4.5;

export interface PoyResult {
  /** Torneio elegível ao ranking? */
  eligible: boolean;
  /** Motivo da inelegibilidade, quando houver. */
  reason?: "stage" | "no_cash";
  /** Pontos conquistados (0 se inelegível). */
  points: number;
  /** Lugares pagos naquele campo, para exibição. */
  paidPlaces: number;
}

/**
 * Curva de posição. Decai rápido perto da mesa final e achata na direção do
 * min-cash, exatamente como a curva real da WSOP: cada lugar mais fundo vale
 * desproporcionalmente mais.
 *
 * Ancorada em dois pontos: 1º lugar = CHAMPION_BASE e último lugar pago =
 * CHAMPION_BASE / 20. O expoente é derivado desses extremos, então a razão
 * 20:1 vale para qualquer tamanho de campo.
 */
function positionCurve(finishPosition: number, placesPaid: number): number {
  if (placesPaid <= 1) return CHAMPION_BASE;

  // Resolve CHAMPION_BASE / placesPaid^k = CHAMPION_BASE / RATIO  =>  k = ln(RATIO)/ln(placesPaid)
  const exponent = Math.log(WIN_TO_MINCASH_RATIO) / Math.log(placesPaid);
  return CHAMPION_BASE / Math.pow(finishPosition, exponent);
}

/**
 * Multiplicador de campo. Usa raiz quadrada para que campos gigantes valorizem
 * o resultado sem distorcer o placar — a mesma abordagem adotada em ligas de
 * poker ("extra points by the square root of the field size ratio").
 */
function fieldMultiplier(entrants: number): number {
  return Math.sqrt(Math.max(1, entrants) / FIELD_BASELINE);
}

/** Multiplicador de buy-in: peso de stakes amortecido na raiz 4,5, como a WSOP. */
function buyInMultiplier(buyIn: number): number {
  return Math.pow(Math.max(1, buyIn) / BUYIN_BASELINE, 1 / BUYIN_ROOT);
}

/**
 * Calcula os pontos POY de um torneio encerrado.
 *
 * @param stage          estágio em que o torneio COMEÇOU
 * @param entrants       tamanho do campo
 * @param buyIn          buy-in em dólares
 * @param finishPosition posição final do jogador (1 = campeão)
 */
export function computePoyPoints(params: {
  stage: Stage;
  entrants: number;
  buyIn: number;
  finishPosition: number;
}): PoyResult {
  const { stage, entrants, buyIn, finishPosition } = params;
  const placesPaid = paidPlaces(entrants);

  // Barreira: só vale torneio jogado desde o início.
  if (stage !== RANKED_STAGE) {
    return { eligible: false, reason: "stage", points: 0, paidPlaces: placesPaid };
  }

  // Como na WSOP, é preciso entrar no dinheiro para pontuar.
  if (finishPosition < 1 || finishPosition > placesPaid) {
    return { eligible: false, reason: "no_cash", points: 0, paidPlaces: placesPaid };
  }

  const points =
    positionCurve(finishPosition, placesPaid) *
    fieldMultiplier(entrants) *
    buyInMultiplier(buyIn);

  return {
    eligible: true,
    points: Math.max(1, Math.round(points)),
    paidPlaces: placesPaid,
  };
}

/**
 * Total de um jogador no ranking: soma apenas os melhores resultados, como faz
 * a WSOP ao considerar os 10 melhores da temporada.
 */
export function sumBestResults(
  allPoints: number[],
  bestCount = BEST_RESULTS_COUNT,
): number {
  return [...allPoints]
    .sort((a, b) => b - a)
    .slice(0, bestCount)
    .reduce((total, p) => total + p, 0);
}

/**
 * Faixa de buy-in usada nas abas do ranking (decisão aprovada do projeto):
 * micro ($5) · baixa ($11) · média ($22 e $55) · alta ($109).
 */
export function tierForBuyIn(buyIn: number): "micro" | "baixa" | "media" | "alta" {
  if (buyIn <= 5) return "micro";
  if (buyIn <= 11) return "baixa";
  if (buyIn <= 55) return "media";
  return "alta";
}

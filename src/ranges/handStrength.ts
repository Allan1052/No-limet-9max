// ---------------------------------------------------------------------------
// Força pré-flop das 169 mãos iniciais.
//
// Em vez de digitar 169 valores "na mão" (sujeito a erro e a "regras soltas"),
// derivamos a força de forma objetiva:
//
//   força = equity contra uma mão aleatória  +  bônus de jogabilidade
//
// A equity vem do nosso motor Monte Carlo (com semente fixa → determinístico).
// O bônus de jogabilidade sobe um pouco mãos suited e conectadas, que valem
// mais do que a equity crua sugere porque floppam projetos e são fáceis de
// jogar pós-flop. O resultado é uma ordenação estável e sensata, que nesta
// forma serve de esqueleto para todas as ranges (top-X% por posição).
// ---------------------------------------------------------------------------

import { seededRng } from "../engine/cards";
import { equityVsRandom } from "../engine/equity";
import { allHandTypes, gap, handTypeCombos, isPair, isSuited } from "./types";

export interface HandStrength {
  handType: string;
  equityVsRandom: number; // equity crua contra uma mão aleatória
  score: number; // força final (equity + jogabilidade)
  rank: number; // 0 = mais forte, 168 = mais fraca
}

// Ajuste de jogabilidade, em "pontos de equity". Modesto de propósito, para
// não distorcer a ordenação — só reflete o valor extra de floppar projetos.
function playabilityBonus(handType: string): number {
  if (isPair(handType)) return 0.005; // pares já pontuam alto pela equity
  const g = gap(handType);
  let bonus = 0;
  if (isSuited(handType)) bonus += 0.035; // suited: potencial de flush
  if (g === 0) bonus += 0.02; // conectada
  else if (g === 1) bonus += 0.01; // um gap
  else if (g === 2) bonus += 0.004; // dois gaps
  return bonus;
}

let cache: HandStrength[] | null = null;
let byType: Map<string, HandStrength> | null = null;

/**
 * Calcula (uma vez, com cache) a força de todas as 169 mãos, já ordenada da
 * mais forte para a mais fraca.
 */
export function handStrengthTable(): HandStrength[] {
  if (cache) return cache;

  const rng = seededRng(0xc0ffee); // semente fixa → mesma tabela sempre
  const ITER = 3000; // suficiente para ordenar; ruído << diferenças relevantes

  const rows: HandStrength[] = allHandTypes().map((handType) => {
    const combo = handTypeCombos(handType)[0]; // qualquer combo do tipo serve
    const eq = equityVsRandom(combo, [], ITER, rng).equity;
    return {
      handType,
      equityVsRandom: eq,
      score: eq + playabilityBonus(handType),
      rank: 0,
    };
  });

  rows.sort((a, b) => b.score - a.score);
  rows.forEach((row, i) => (row.rank = i));

  cache = rows;
  byType = new Map(rows.map((r) => [r.handType, r]));
  return cache;
}

/** Posição no ranking (0 = mais forte). */
export function handRank(handType: string): number {
  if (!byType) handStrengthTable();
  const r = byType!.get(handType);
  if (!r) throw new Error(`Tipo de mão desconhecido: ${handType}`);
  return r.rank;
}

/** Força final (equity + jogabilidade) de um tipo de mão. */
export function handScore(handType: string): number {
  if (!byType) handStrengthTable();
  return byType!.get(handType)!.score;
}

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

// Grupos onde a ordem de força é INEQUÍVOCA: pares (22..AA) e, para cada carta
// alta e naipe (suited/offsuit), o kicker crescente. Dentro de um grupo, a mão
// mais forte NUNCA pode pontuar menos que a mais fraca — se o ruído do Monte
// Carlo inverter (K3s > K4s etc.), a gente corrige. Isso mata as inversões de
// kicker sem mexer no resto da ordenação (nem em conectores como 54s).
const RANK_STR = "23456789TJQKA";
function monotonicGroups(): string[][] {
  const R = RANK_STR.split(""); // fraco -> forte (2..A)
  const groups: string[][] = [];
  groups.push(R.map((r) => r + r)); // pares 22..AA (fraco->forte)
  for (let hi = 0; hi < R.length; hi++) {
    // Ases baixos NÃO são monotônicos no kicker de propósito: A5s/A4s/A3s/A2s
    // (wheel + bloqueador de nut flush) jogam MELHOR que A6s-A9s. Forçar
    // "A6s ≥ A5s" seria errado — então pulamos a carta alta Ás.
    if (R[hi] === "A") continue;
    const suited: string[] = [];
    const off: string[] = [];
    for (let lo = 0; lo < hi; lo++) {
      // R[hi] é a carta alta; kicker cresce com lo (mais perto de hi = mais forte)
      suited.push(R[hi] + R[lo] + "s");
      off.push(R[hi] + R[lo] + "o");
    }
    if (suited.length > 1) groups.push(suited); // já em ordem de kicker crescente
    if (off.length > 1) groups.push(off);
  }
  return groups;
}

/**
 * Calcula (uma vez, com cache) a força de todas as 169 mãos, já ordenada da
 * mais forte para a mais fraca.
 */
export function handStrengthTable(): HandStrength[] {
  if (cache) return cache;

  const rng = seededRng(0xc0ffee); // semente fixa → mesma tabela sempre
  const ITER = 3000; // suficiente para ordenar; ruído << diferenças relevantes

  const scoreByType = new Map<string, number>();
  const rows: HandStrength[] = allHandTypes().map((handType) => {
    const combo = handTypeCombos(handType)[0]; // qualquer combo do tipo serve
    const eq = equityVsRandom(combo, [], ITER, rng).equity;
    const score = eq + playabilityBonus(handType);
    scoreByType.set(handType, score);
    return { handType, equityVsRandom: eq, score, rank: 0 };
  });

  // Correção de MONOTONICIDADE de mínima perturbação: dentro de cada grupo
  // (fraco→forte), os scores devem crescer. Em vez de inventar valores, só
  // REORDENA os scores que já existem no grupo — o maior score do grupo vai
  // pra mão mais forte, o menor pra mais fraca. Isso desfaz inversões de ruído
  // (K3s>K4s etc.) preservando o CONJUNTO de scores, então quase não mexe na
  // posição das outras mãos (nem quebra o SELO nem limiares vizinhos).
  for (const g of monotonicGroups()) {
    const sorted = g.map((h) => scoreByType.get(h)!).sort((a, b) => a - b);
    g.forEach((h, i) => scoreByType.set(h, sorted[i]));
  }
  for (const row of rows) row.score = scoreByType.get(row.handType)!;

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

import { GTO_SPOTS, runCalibration, type BenchSpot } from "./gtoBenchmark";

export type CriticalCategoryId =
  | "rfi_deep"
  | "push_fold"
  | "defend_vs_open"
  | "vs_3bet";

export interface CriticalCategoryResult {
  id: CriticalCategoryId;
  label: string;
  total: number;
  matched: number;
  score: number;
  misses: string[];
}

export interface CriticalSpotValidationReport {
  total: number;
  categories: CriticalCategoryResult[];
  coverage: "partial";
  uncovered: string[];
  disclaimer: string;
}

const CATEGORY_ORDER: Array<{ id: CriticalCategoryId; label: string }> = [
  { id: "rfi_deep", label: "RFI com stack profundo" },
  { id: "push_fold", label: "Push/fold curto" },
  { id: "defend_vs_open", label: "Defesa contra abertura" },
  { id: "vs_3bet", label: "Resposta a 3-bet" },
];

function categoryOf(spot: BenchSpot): CriticalCategoryId {
  if (spot.opts?.threeBet) return "vs_3bet";
  if (spot.opts?.raiserPosition) return "defend_vs_open";
  if (spot.effBB <= 10) return "push_fold";
  return "rfi_deep";
}

/**
 * Quebra o banco de referência existente em famílias críticas para que uma
 * regressão localizada não fique escondida atrás do placar agregado.
 *
 * Importante: este relatório NÃO cria referências novas nem altera o motor.
 * Ele deixa explícitas as áreas cobertas e as lacunas ainda sem benchmark
 * independente suficiente no projeto.
 */
export function runCriticalSpotValidation(
  spots: BenchSpot[] = GTO_SPOTS,
): CriticalSpotValidationReport {
  const categories = CATEGORY_ORDER.map(({ id, label }) => {
    const subset = spots.filter((spot) => categoryOf(spot) === id);
    const result = runCalibration(subset);
    return {
      id,
      label,
      total: result.total,
      matched: result.matched,
      score: result.score,
      misses: result.misses.map((miss) => `${miss.note}: esperado ${miss.expect}, obtido ${miss.got}`),
    };
  });

  return {
    total: spots.length,
    categories,
    coverage: "partial",
    uncovered: [
      "ICM de bolha e mesa final",
      "pós-flop com frequências mistas",
      "sizings que dependem de árvore completa",
    ],
    disclaimer:
      "Benchmark interno de regressão com referências curadas; não é certificação externa nem substitui solver.",
  };
}

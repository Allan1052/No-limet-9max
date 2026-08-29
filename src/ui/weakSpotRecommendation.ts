export interface WeakSpotCandidate {
  id: string;
  title: string;
  count: number;
  badCount: number;
  severity: number;
}

export interface WeakSpotRecommendation {
  primary: WeakSpotCandidate;
  secondary?: WeakSpotCandidate;
  label: string;
}

/**
 * Resume os vazamentos já ordenados pelo detector em no máximo dois focos.
 * Não recalcula poker nem inventa diagnóstico: só transforma o ranking que o
 * app já produz em uma recomendação curta para a camada de produto/UI.
 */
export function buildWeakSpotRecommendation(
  leaks: WeakSpotCandidate[],
): WeakSpotRecommendation | null {
  if (leaks.length === 0) return null;

  const ranked = [...leaks].sort((a, b) => {
    if (b.severity !== a.severity) return b.severity - a.severity;
    if (b.badCount !== a.badCount) return b.badCount - a.badCount;
    return b.count - a.count;
  });

  const primary = ranked[0];
  const secondary = ranked[1];
  return {
    primary,
    secondary,
    label: `Treino recomendado: ${primary.title}`,
  };
}

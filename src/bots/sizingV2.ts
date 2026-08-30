export interface SizingV2Input {
  wetness: number;
  streetIdx: 0 | 1 | 2;
  equity: number;
  spr: number;
  rangeAdvantage: number;
  nutAdvantage: number;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/**
 * Sizing heurístico V2, determinístico e leve para navegador.
 * Combina textura, polarização, SPR e vantagens de range/nuts.
 * Não é saída de solver.
 */
export function sizingV2(input: SizingV2Input): number {
  const wetness = clamp(input.wetness, 0, 1);
  const spr = Math.max(0, input.spr);
  const rangeAdv = clamp(input.rangeAdvantage, -0.4, 0.4);
  const nutAdv = clamp(input.nutAdvantage, -0.5, 0.5);

  let size = 0.33 + 0.4 * wetness;
  size += [0, 0.08, 0.2][input.streetIdx];

  const polarized = input.equity >= 0.85 || input.equity <= 0.18;
  if (input.streetIdx === 2 && polarized) size += 0.22;
  else if (input.equity >= 0.5 && input.equity < 0.68) size *= 0.82;

  // Vantagem de range aumenta pouco; vantagem de nuts pesa mais em linhas polarizadas.
  size += rangeAdv * 0.28;
  size += nutAdv * (polarized ? 0.5 : 0.25);

  // SPR baixo favorece geometrias menores: não desperdiça fichas com sizing grande
  // quando o stack restante já é pequeno em relação ao pote.
  if (spr < 2) size *= 0.72 + 0.14 * clamp(spr, 0, 2);
  else if (spr > 6) size += Math.min(0.08, (spr - 6) * 0.01);

  return clamp(Math.round(size * 100) / 100, 0.25, 1.3);
}

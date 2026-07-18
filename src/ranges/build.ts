// ---------------------------------------------------------------------------
// Construção de ranges a partir do ranking de força.
//
// A ideia central: uma range de abertura é, na prática, "as X% mãos mais
// fortes". Então, dado um alvo de X%, percorremos o ranking do topo para baixo
// somando combos até atingir o alvo. A mão que fica na fronteira recebe uma
// frequência fracionária (ex.: 0.5), o que produz ranges "mistas" realistas em
// vez de um corte seco.
//
// Isso garante ranges sempre coerentes e "aninhadas" (a range mais estreita é
// subconjunto da mais larga), evitando jogadas sem sentido.
// ---------------------------------------------------------------------------

import { handStrengthTable } from "./handStrength";
import { comboCount, type Range } from "./types";

/**
 * Monta a range com as `targetPercent` (0..1) mãos mais fortes por combos.
 * A mão de fronteira entra com frequência proporcional ao que falta para
 * fechar o alvo.
 */
export function buildTopRange(targetPercent: number): Range {
  const target = Math.max(0, Math.min(1, targetPercent)) * 1326;
  const table = handStrengthTable();
  const range: Range = {};
  let acc = 0;

  for (const row of table) {
    if (acc >= target) break;
    const combos = comboCount(row.handType);
    if (acc + combos <= target) {
      range[row.handType] = 1;
      acc += combos;
    } else {
      // fronteira: entra parcialmente
      const remaining = target - acc;
      range[row.handType] = Math.round((remaining / combos) * 100) / 100;
      acc = target;
    }
  }
  return range;
}

/** União de ranges (frequência máxima por mão) — útil para "está no range?". */
export function rangeUnion(...ranges: Range[]): Range {
  const out: Range = {};
  for (const r of ranges) {
    for (const [ht, f] of Object.entries(r)) {
      out[ht] = Math.max(out[ht] ?? 0, f);
    }
  }
  return out;
}

/** Remove de `base` as mãos presentes em `subtract` (com freq > 0). */
export function rangeSubtract(base: Range, subtract: Range): Range {
  const out: Range = { ...base };
  for (const ht of Object.keys(subtract)) {
    if ((subtract[ht] ?? 0) > 0) delete out[ht];
  }
  return out;
}

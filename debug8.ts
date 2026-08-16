// overpair: board max rank M, par precisa ser > M. Board típico: max 9 (T-J-Q-K-A).
// Se board max = 9: pares possíveis TT(6), JJ(6), QQ(6), KK(6), AA(6) = 30 combos... mas
// o board pode conter cartas desses ranks (ex.: 9h → AA ainda ok). 30 combos de par > 30 boards
// → quando os boards já consumiram muitos pares, os 200 rngs podem nunca achar um par novo.
// Solução: para overpair, usar TODOS os ranks de par > boardMax como candidatos e escolher
// o par de rank não usado (e dentro dele, naipe não usado). Determinístico + sem repetição garantida.
import { POSTFLOP_DRILL_SPOTS } from "./src/train/drillPostflop";
import { rankOf, suitOf, cardFromString } from "./src/engine/cards";

const spot = POSTFLOP_DRILL_SPOTS.find((s) => s.id === "overpair")!;
// Para cada board, quantos combos de overpair existem?
let minCombos = Infinity, maxCombos = 0;
for (const b of spot.boards) {
  const boardMax = Math.max(...b.map((c) => rankOf(c)));
  let combos = 0;
  for (let rank = boardMax + 1; rank <= 14; rank++) combos += 6; // C(4,2) por rank
  minCombos = Math.min(minCombos, combos);
  maxCombos = Math.max(maxCombos, combos);
}
console.log("overpair: combos por board entre", minCombos, "e", maxCombos);
// Com 30 boards, total de overpair-ranks únicos: se boards têm max variados,
// o total de RANKS distintos disponíveis >= ? Vamos ver os boardMax:
const maxs: number[] = spot.boards.map((b) => Math.max(...b.map((c) => rankOf(c))));
const freq = new Map<number, number>();
for (const m of maxs) freq.set(m, (freq.get(m) || 0) + 1);
console.log("boardMax distribution:", Array.from(freq.entries()).sort((a, b) => a[0] - b[0]));

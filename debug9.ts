// boardMax dist: 6×2, 7×4, 8×5, 9×8, 10×5, 11×4, 12×2.
// Ranks disponíveis > boardMax:
//   max 6: {7..14}=8 ranks
//   max 7: 7 ranks
//   max 8: 6
//   max 9: 5
//   max 10: 4
//   max 11: 3
//   max 12: 2
// Total de ranks exigidos = 30, mas só 2 boards com max=12 → precisam de 2 ranks distintos cada (AA, KK).
// Se AA e KK forem usados pelos boards max12, os boards max11 (4 boards) precisam de {12,13,14}=3 ranks, mas 12 e 13 já usados → sobra 1 rank (AA)... repete!
// PROBLEMA MATEMÁTICO: com 30 boards e ranks limitados, 30 ranks de par distintos NÃO existem (só 13 ranks).
// Cada rank pode gerar C(4,2)=6 combos, então no máximo 13 ranks × 6 = 78 combos, mas o RANK não pode repetir (pedido do Allan).
// → IMPOSSÍVEL ter 30 mãos sem repetição de rank em overpair com 30 boards distintos!
// SOLUÇÃO: reduzir handCount dos spots de par para caber nos ranks disponíveis,
// ou permitir repetição de rank APÓS esgotamento com aviso. Melhor: handCount = número de ranks
// distintos possíveis no pior caso. Calcular:
const dist: [number, number][] = [[6,2],[7,4],[8,5],[9,8],[10,5],[11,4],[12,2]];
// Greedy: atribuir ranks disponíveis (14..max+1) aos boards, reutilizando o mínimo.
const used = new Map<number, number>(); // rank → quantos boards usaram
let assignments: number[] = [];
// ordenar boards pelo menor número de opções primeiro (max alto = menos opções)
const sorted = [...dist].sort((a, b) => b[0] - a[0]);
const alloc = new Map<number, number[]>(); // boardMax → ranks alocados
for (const [max, count] of sorted) {
  const avail = [];
  for (let r = max + 1; r <= 14; r++) {
    const times = used.get(r) || 0;
    avail.push({ r, times });
  }
  avail.sort((a, b) => a.times - b.times);
  const chosen = avail.slice(0, count).map((x) => x.r);
  for (const r of chosen) used.set(r, (used.get(r) || 0) + 1);
}
console.log("ranks usados por frequência:", Array.from(used.entries()).sort((a, b) => b[1] - a[1]));
const maxReuse = Math.max(...Array.from(used.values()));
console.log("máxima reutilização de rank (com 30 boards):", maxReuse);

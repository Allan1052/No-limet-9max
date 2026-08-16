// Simulação de calibração: mil sementes por cenário — valida que os ranges
// do vilão encolhem de forma saudável em cada combinação de textura/ação.
import { preflopOpenRange, continueVillainRange, analyzeBoard, type BoardState } from "../src/train/streets/dynamicRanges";

const R = (r: number, s: number) => (r - 2) * 4 + s;

// 8 texturas representativas
const boards: [string, BoardState][] = [
  ["seco A-alto", { street: "flop", cards: [R(14, 3), R(8, 1), R(6, 0)] }],
  ["seco K-alto", { street: "flop", cards: [R(13, 2), R(9, 0), R(3, 1)] }],
  ["seco rainbow baixo", { street: "flop", cards: [R(7, 2), R(5, 0), R(2, 1)] }],
  ["moderado 1-gap", { street: "flop", cards: [R(10, 1), R(8, 2), R(3, 0)] }],
  ["conectado T98", { street: "flop", cards: [R(10, 3), R(9, 1), R(8, 0)] }],
  ["1-flush draw", { street: "flop", cards: [R(14, 2), R(7, 2), R(4, 2)] }],
  ["2-flush draw", { street: "flop", cards: [R(9, 2), R(10, 2), R(4, 0)] }],
  ["molhado duplo draw", { street: "flop", cards: [R(9, 2), R(10, 2), R(11, 2)] }],
  ["com par", { street: "flop", cards: [R(8, 3), R(8, 1), R(2, 2)] }],
  ["turn seco", { street: "turn", cards: [R(14, 3), R(8, 1), R(6, 0), R(3, 2)] }],
];

// ações do vilão × pot/faced (pote pós-open 3.8bb)
const scenarios: [string, string, number, number][] = [
  ["check", "check", 0, 3.8],
  ["call ½", "call", 1.9, 3.8],
  ["call ¾", "call", 2.85, 3.8],
  ["bet ½", "betSmall", 0, 3.8],
  ["bet ¾", "betBig", 0, 3.8],
];

const positions: [string, number][] = [
  ["UTG", 0.15],
  ["CO", 0.27],
  ["BTN", 0.42],
];

console.log("Cenário | textura | posição inicial | % médio (1000 sementes) | p10 | p90");
for (const [action, kind, faced, pot] of scenarios) {
  for (const [bName, board] of boards) {
    for (const [pos, initW] of positions) {
      const percs: number[] = [];
      for (let seed = 0; seed < 1000; seed++) {
        const init = preflopOpenRange(pos, 40);
        const ctx = { heroPosition: "UTG", villainPosition: pos, heroStackBB: 40, villainStackBB: 40, potBB: pot, facedBetBB: faced };
        const s = continueVillainRange(init, kind as never, board, ctx);
        percs.push(s.percent);
      }
      percs.sort((a, b) => a - b);
      const avg = percs.reduce((a, b) => a + b, 0) / 1000;
      console.log(`${action.padEnd(8)} | ${bName.padEnd(16)} | ${pos} (${initW}) | ${avg.toFixed(2)}% | p10 ${percs[100].toFixed(1)}% | p90 ${percs[900].toFixed(1)}%`);
    }
  }
}

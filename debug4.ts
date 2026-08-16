// O teste usa generatePostflopDrillHand (board aleatório da pool). Board seed 0 pode ser OUTRO que o meu debug2 supôs.
// debug2 com seed 13 deu board Jd6d4s — ok, mas o teste itera seeds diferentes do meu debug.
// A questão: no teste, flush_draw falha com "board lacks suit" — hand contém ♥ mas board tem ♦.
// Isso acontece se drawSuit ficar 2 (♥ default) quando flopHearts < 2. Ex.: board 8h4d9s: hearts=[8h] length 1 < 2 → drawSuit=2 (♥ default!) mas board não tem ♥→ falha.
// Verificar quantos boards da pool têm <2 cartas de algum naipe com exatamente 2 do draw...
// Na pool FLUSH_DRAW: cada board tem exatamente 2 cartas de UM naipe (o draw). flopHearts.filter(suit===2) só pega ♥. Se board draw é ♦, flopHearts (♥) tem 0-1 → drawSuit=2 default → herói gera ♥, board não tem ♥ → teste falha!
// BUG ENCONTRADO: o filtro fixo `suitOf(c) === 2` só detecta flush draw de ♥; boards ♦/♠/♣ caem no default ♥ que não está no board.
import { POSTFLOP_DRILL_SPOTS, generatePostflopDrillHand } from "./src/train/drillPostflop";
import { rankOf, suitOf, cardFromString } from "./src/engine/cards";

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const spot = POSTFLOP_DRILL_SPOTS[0];
// verificar drawsuits reais da pool
let badPool = 0;
for (const b of spot.boards) {
  const counts = [0, 0, 0, 0];
  for (const c of b) counts[suitOf(c)]++;
  const drawSuit = counts.findIndex((n) => n >= 2);
  if (drawSuit === -1) { badPool++; console.log("board sem 2 do mesmo naipe:", b.map(cardLabel).join(" ")); }
}
console.log("boards sem par de naipe:", badPool);

// agora contar falhas no teste real, mostrando o board
let fails = 0;
for (let seed = 0; seed < 100; seed++) {
  const rng = mulberry32(seed * 997 + 13);
  const h = generatePostflopDrillHand(spot, rng);
  const [c1, c2] = h.hand;
  if (suitOf(c1) !== suitOf(c2) || !h.board.map((c) => suitOf(c)).includes(suitOf(c1))) {
    fails++;
    if (fails <= 3) {
      const counts = [0, 0, 0, 0];
      for (const c of h.board) counts[suitOf(c)]++;
      console.log(`seed ${seed}: board ${h.board.map(cardLabel).join(" ")} (naipe counts ${counts.join(",")}) hand=[${c1},${c2}]`);
    }
  }
}
console.log("fails em 100:", fails);

function cardLabel(c: number): string {
  return `${"23456789TJQKA"[rankOf(c) - 2]}${"♣♦♥♠"[suitOf(c)]}`;
}

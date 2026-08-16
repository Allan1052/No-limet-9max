import {
  POSTFLOP_DRILL_SPOTS,
  generateHandForSpot,
} from "./src/train/drillPostflop";
import { rankOf, suitOf } from "./src/engine/cards";

function cardLabel(c: number): string {
  return `${"23456789TJQKA"[rankOf(c) - 2]}${"♣♦♥♠"[suitOf(c)]}`;
}
function handKey(hand: number[]): string {
  const r0 = rankOf(hand[0]);
  const r1 = rankOf(hand[1]);
  if (r0 === r1) return `${r0},${r0}`;
  return [hand[0], hand[1]].sort((a, b) => a - b).join(",");
}

const spot = POSTFLOP_DRILL_SPOTS.find((s) => s.id === "overpair")!;

// Reproduzir a lógica da sessão COM LOG:
const boards = [...spot.boards].sort(() => 0.5 - Math.random());
const usedHandKeys = new Set<string>();
const usedPairRanks = new Set<string>();
const isPairSpot = true;
for (let i = 0; i < 30; i++) {
  const board = boards[i % boards.length];
  let finalHand = generateHandForSpot(spot, board, Math.random);
  let found = false;
  for (let attempt = 0; attempt < 200 && !found; attempt++) {
    const candidate = generateHandForSpot(spot, board, Math.random);
    const key = handKey(candidate);
    const freshInThisHand = new Set<number>(board);
    const sameRankPair =
      isPairSpot &&
      rankOf(candidate[0]) === rankOf(candidate[1]) &&
      usedPairRanks.has(`${rankOf(candidate[0])}`);
    if (
      !usedHandKeys.has(key) &&
      !sameRankPair &&
      candidate.filter((c) => !freshInThisHand.has(c)).length === 2
    ) {
      finalHand = candidate;
      found = true;
    }
  }
  if (!found) {
    console.log(`[${i}] NENHUMA mão nova encontrada — aceitou a inicial ${finalHand.map(cardLabel).join(" ")} key=${handKey(finalHand)}`);
  }
  const dup = usedHandKeys.has(handKey(finalHand));
  const dupRank =
    isPairSpot &&
    rankOf(finalHand[0]) === rankOf(finalHand[1]) &&
    usedPairRanks.has(`${rankOf(finalHand[0])}`);
  if (dup || dupRank) {
    console.log(`[${i}] DUPLICADA ACEITA: ${finalHand.map(cardLabel).join(" ")} key=${handKey(finalHand)} dup=${dup} dupRank=${dupRank} found=${found}`);
  }
  usedHandKeys.add(handKey(finalHand));
  if (isPairSpot && rankOf(finalHand[0]) === rankOf(finalHand[1])) {
    usedPairRanks.add(`${rankOf(finalHand[0])}`);
  }
}
console.log("pair ranks usados:", Array.from(usedPairRanks).length, usedPairRanks.size);

import { POSTFLOP_DRILL_SPOTS, generateHandForSpot } from "./src/train/drillPostflop";
import { rankOf, suitOf, card } from "./src/engine/cards";
const suits = "♣♦♥♠";
function cardLabel(c: number): string { return `${"23456789TJQKA"[rankOf(c) - 2]}${suits[(c - 2) % 4]}`; }
const spot = POSTFLOP_DRILL_SPOTS.find(x=>x.id==="top_pair")!;
console.log("boards:", spot.boards.map(b=>b.map(cardLabel).join(" ")));
// reordenar como a sessão faz
function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const rng = (() => { let t = (2 * 997 + 13 + 0x6d2b79f5); return () => { t += 0x6d2b79f5; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
const shared = shuffle(spot.boards, rng);
// ordenação por similaridade: boards vizinhos não compartilham 2+ ranks
const ordered = [shared[0]];
const remaining = shared.slice(1);
while (remaining.length) {
  const last = ordered[ordered.length - 1];
  const nextIdx = remaining.findIndex((b) => {
    const overlap = b.filter((c) => last.includes(c)).length;
    return overlap < 2;
  });
  if (nextIdx >= 0) ordered.push(remaining.splice(nextIdx, 1)[0]);
  else ordered.push(remaining.shift()!);
}
console.log("ordered:", ordered.map(b=>b.map(cardLabel).join(" ")));
// reserved
const pairRankOfBoard = (b: any[]) => Math.max(...b.map((c: number) => rankOf(c)));
const boardsSorted = ordered.map((b, i) => ({ b, i, max: pairRankOfBoard(b) })).sort((a, c) => c.max - a.max);
const usedByTopRank = new Map<number, number[]>();
const reserved = new Map<number, number>();
for (const { b, i } of boardsSorted) {
  const top = pairRankOfBoard(b);
  let taken = usedByTopRank.get(top) ?? [];
  const free = [0, 1, 2, 3].filter((s) => !taken.includes(s));
  const suit = free.length > 0 ? free[0] : taken[0];
  taken = taken.length < 4 ? [...taken, suit] : taken;
  usedByTopRank.set(top, taken);
  reserved.set(i, suit);
}
for (let i = 0; i < ordered.length; i++) {
  const board = ordered[i];
  console.log(`i=${i} board=${board.map(cardLabel).join(" ")} reserved=${reserved.get(i)}`);
}

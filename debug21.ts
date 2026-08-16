import { POSTFLOP_DRILL_SPOTS, createPostflopDrillSession, generateHandForSpot } from "./src/train/drillPostflop";
import { rankOf, cardFromString, shuffle as engineShuffle } from "./src/engine/cards";
const rl = (c: number) => "23456789TJQKA"[rankOf(c) - 2];
// rng determinístico
const rngOf = (seed: number) => {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
for (const spotId of ["overpair", "monster_dry"]) {
  const spot = POSTFLOP_DRILL_SPOTS.find((s) => s.id === spotId)!;
  const rng = rngOf(42);
  // reconstituir a mesma ordenação da sessão
  const shared = engineShuffle(spot.boards, rng);
  const ordered = [shared[0]];
  const remaining = shared.slice(1);
  while (remaining.length) {
    const last = ordered[ordered.length - 1];
    const nextIdx = remaining.findIndex((b) => b.filter((c) => last.includes(c)).length < 2);
    if (nextIdx >= 0) ordered.push(remaining.splice(nextIdx, 1)[0]);
    else ordered.push(remaining.shift()!);
  }
  const pairRankOfBoard = (b: any[]) => Math.max(...b.map((c: number) => rankOf(c)));
  const boardsSorted = ordered.map((b, i) => ({ b, i, max: pairRankOfBoard(b) })).sort((a, c) => c.max - a.max);
  const usedRanks = new Set<number>();
  const res = [];
  for (const { b, i } of boardsSorted) {
    const options: number[] =
      spotId === "monster_dry" ? b.map((c: number) => rankOf(c)) : Array.from({ length: 14 - pairRankOfBoard(b) }, (_, k) => pairRankOfBoard(b) + 1 + k);
    const free = options.filter((r) => !usedRanks.has(r));
    free.sort((a, c) => c - a);
    const chosen = free.length > 0 ? free[0] : options.sort((a, c) => c - a)[0];
    usedRanks.add(chosen);
    res.push({ i, board: b.map((c: number) => rl(c)).join(" "), max: pairRankOfBoard(b), reserved: chosen, usedAfter: [...usedRanks].map((r) => rl(r)).join("") });
  }
  console.log(`=== ${spotId} handCount=${spot.handCount} boards=${ordered.length}`);
  for (const r of res) console.log(r);
  // mãos reais da sessão
  const session = createPostflopDrillSession(spotId, spot.handCount, rngOf(7));
  console.log("hands:", session.hands.map((h) => h.hand.map(rl).join("") + " | " + h.board.map(rl).join(" ")).join("\n   "));
}

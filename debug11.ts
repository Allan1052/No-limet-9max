import { POSTFLOP_DRILL_SPOTS, createPostflopDrillSession } from "./src/train/drillPostflop";
import { rankOf } from "./src/engine/cards";
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const suits = "♣♦♥♠";
function cardLabel(c: number): string {
  return `${"23456789TJQKA"[rankOf(c) - 2]}${suits[(c - 2) % 4]}`;
}
for (const s of POSTFLOP_DRILL_SPOTS) {
  for (const seed of [7, 42, 123, 999]) {
    const session = createPostflopDrillSession(s.id, s.handCount, mulberry32(seed));
    const seen = new Set(session.hands.map((h) => h.hand.slice().sort((a,b)=>a-b).join(",")));
    if (seen.size < s.handCount) {
      console.log(`${s.id} seed ${seed}: ${seen.size}/${s.handCount}`);
      const counts = new Map<string,number>();
      for (const h of session.hands) {
        const k = h.hand.slice().sort((a,b)=>a-b).join(",");
        counts.set(k,(counts.get(k)||0)+1);
      }
      for (const [k,n] of counts) if (n>1) {
        const hs = session.hands.filter(h=>h.hand.slice().sort((a,b)=>a-b).join(",")===k);
        console.log("  dup:", hs.map(h=>`${h.hand.map(cardLabel).join(" ")} b:${h.board.map(cardLabel).join(" ")}`).join(" || "));
      }
    }
  }
}

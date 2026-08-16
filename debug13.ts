import { POSTFLOP_DRILL_SPOTS, createPostflopDrillSession } from "./src/train/drillPostflop";
import { rankOf } from "./src/engine/cards";
const suits = "♣♦♥♠";
function cardLabel(c: number): string { return `${"23456789TJQKA"[rankOf(c) - 2]}${suits[(c - 2) % 4]}`; }
const rng = (() => { let t = (12 * 997 + 13 + 0x6d2b79f5); return () => { t += 0x6d2b79f5; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
const s = POSTFLOP_DRILL_SPOTS.find(x=>x.id==="top_pair")!;
const session = createPostflopDrillSession(s.id, s.handCount, rng);
const counts = new Map<string,number>();
for (const h of session.hands) {
  const k = h.hand.slice().sort((a,b)=>a-b).join(",");
  counts.set(k,(counts.get(k)||0)+1);
}
for (const [k,n] of counts) if (n>1) {
  const hs = session.hands.filter(h=>h.hand.slice().sort((a,b)=>a-b).join(",")===k);
  for (const h of hs) console.log(`${h.hand.map(cardLabel).join(" ")} board=${h.board.map(cardLabel).join(" ")}`);
}

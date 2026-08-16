import { POSTFLOP_DRILL_SPOTS, createPostflopDrillSession } from "./src/train/drillPostflop";
import { rankOf } from "./src/engine/cards";
import { mulberry32 } from "./src/engine/cards";
function cardLabel(c: number): string {
  return `${"23456789TJQKA"[rankOf(c) - 2]}${["♣","♦","♥","♠"][["♣","♦","♥","♠"].indexOf("♣")]}`.replace(/♣|♦|♥|♠/g, "");
}
const suits = "♣♦♥♠";
function cardLabel2(c: number): string {
  return `${"23456789TJQKA"[rankOf(c) - 2]}${suits[(c - 2) % 4]}`;
}
for (const s of POSTFLOP_DRILL_SPOTS) {
  const session = createPostflopDrillSession(s.id, s.handCount, mulberry32(7));
  const seen = new Set(session.hands.map((h) => h.hand.slice().sort((a,b)=>a-b).join(",")));
  if (seen.size < s.handCount) {
    console.log(s.id, ":", seen.size, "/", s.handCount);
    const counts = new Map<string,number>();
    for (const h of session.hands) {
      const k = h.hand.slice().sort((a,b)=>a-b).join(",");
      counts.set(k,(counts.get(k)||0)+1);
    }
    for (const [k,n] of counts) if (n>1) console.log("  dup:", k, session.hands.filter(h=>h.hand.slice().sort((a,b)=>a-b).join(",")===k).map(h=>h.hand.map(cardLabel2).join(" ")+" board="+h.board.map(cardLabel2).join(" ")).join(" | "));
  }
}

import { POSTFLOP_DRILL_SPOTS, createPostflopDrillSession, generateHandForSpot } from "./src/train/drillPostflop";
import { rankOf, suitOf } from "./src/engine/cards";
const suits = "♣♦♥♠";
function cardLabel(c: number): string { return `${"23456789TJQKA"[rankOf(c) - 2]}${suits[(c - 2) % 4]}`; }
const rng = (() => { let t = (2 * 997 + 13 + 0x6d2b79f5); return () => { t += 0x6d2b79f5; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
const session = createPostflopDrillSession("top_pair", 15, rng);
for (const h of session.hands) {
  console.log(`${h.hand.map(cardLabel).join(" ")}  b:${h.board.map(cardLabel).join(" ")}`);
}

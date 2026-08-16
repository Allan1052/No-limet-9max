import { POSTFLOP_DRILL_SPOTS, createPostflopDrillSession } from "./src/train/drillPostflop";
import { rankOf, suitOf } from "./src/engine/cards";

function cardLabel(c: number): string {
  return `${"23456789TJQKA"[rankOf(c) - 2]}${"♣♦♥♠"[suitOf(c)]}`;
}

for (const s of POSTFLOP_DRILL_SPOTS) {
  const session = createPostflopDrillSession(s.id, 30, Math.random);
  const handsSeen = new Set(session.hands.map((h) => h.hand.slice().sort((a, b) => a - b).join(",")));
  if (handsSeen.size < 30) {
    // achar as repetidas
    const counts = new Map<string, number>();
    for (const h of session.hands) {
      const k = h.hand.slice().sort((a, b) => a - b).join(",");
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    console.log(`${s.id}: ${handsSeen.size}/30 únicas`);
    for (const [k, n] of counts) {
      if (n > 1) console.log(`  REPETE ${n}x: ${k} (ranks: ${session.hands.filter(h=>h.hand.slice().sort((a,b)=>a-b).join(",")===k).map(h=>h.hand.map(cardLabel).join(" ")).join(" | ")})`);
    }
  }
}

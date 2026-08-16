import { POSTFLOP_DRILL_SPOTS, createPostflopDrillSession } from "./src/train/drillPostflop";
import { rankOf } from "./src/engine/cards";
for (const s of POSTFLOP_DRILL_SPOTS) {
  let bad = 0;
  for (let seed = 0; seed < 50; seed++) {
    const rng = (() => { let t = (seed * 997 + 13 + 0x6d2b79f5); return () => { t += 0x6d2b79f5; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
    const session = createPostflopDrillSession(s.id, s.handCount, rng);
    const seen = new Set(session.hands.map((h) => h.hand.slice().sort((a,b)=>a-b).join(",")));
    if (seen.size < s.handCount) {
      bad++;
      if (bad === 1) console.log(s.id, ":", seen.size, "/", s.handCount, "seed", seed);
    }
  }
  if (bad > 0) console.log(`${s.id}: falhou ${bad}/50 sementes`);
}

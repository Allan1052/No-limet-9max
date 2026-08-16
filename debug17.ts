import { POSTFLOP_DRILL_SPOTS, createPostflopDrillSession } from "./src/train/drillPostflop";
import { rankOf } from "./src/engine/cards";
for (const spot of POSTFLOP_DRILL_SPOTS) {
  let worst = 99;
  let worstSeed = -1;
  for (let seed = 0; seed < 30; seed++) {
    // Math.random com seed determinístico via monkey: substituir global não dá; usar rng
    let t = seed * 9973;
    const rng = () => { t += 0x6d2b79f5; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const session = createPostflopDrillSession(spot.id, spot.handCount, rng);
    const handsSeen = new Set(session.hands.map((h) => h.hand.slice().sort((a,b)=>a-b).join(",")));
    if (handsSeen.size < worst) { worst = handsSeen.size; worstSeed = seed; }
  }
  console.log(`${spot.id} handCount=${spot.handCount} worst=${worst} seed=${worstSeed}`);
}

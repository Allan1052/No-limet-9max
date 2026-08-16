import { POSTFLOP_DRILL_SPOTS, createPostflopDrillSession } from "./src/train/drillPostflop";
import { rankOf, suitOf } from "./src/engine/cards";

const rl = "23456789TJQKA";
const spot = POSTFLOP_DRILL_SPOTS.find((s) => s.id === "monster_dry")!;

// replicar seeds do debug20 (Math.random nativo, trial 24)
let seed = 0;
function runTrial(trialIdx: number) {
  // Math.random nativo sequencial — replicar avançando seed trials anteriores
  // simplificamos: criar rng determinístico mulberry32 para reproduzir trial específico
  const mulberry32 = (a: number) => () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const session = createPostflopDrillSession(spot.id, spot.handCount, mulberry32(trialIdx * 7919 + 1));
  const bStr = (b: number[]) => b.map((c) => `${rl[rankOf(c) - 2]}${["c","d","h","s"][suitOf(c)]}`).join(" ");
  console.log(`=== trial ${trialIdx}: hands ${session.hands.length}`);
  session.hands.forEach((h, idx) => {
    const b = h.board.map((c) => `${rl[rankOf(c) - 2]}${["c","d","h","s"][suitOf(c)]}`).join(" ");
    const hd = h.hand.map((c) => `${rl[rankOf(c) - 2]}${["c","d","h","s"][suitOf(c)]}`).join(" ");
    console.log(`  ${idx}: board ${b} | hand ${hd} | note ${h.explanation?.slice(0, 60)}`);
  });
}
runTrial(24);

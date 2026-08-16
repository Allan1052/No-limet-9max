import { POSTFLOP_DRILL_SPOTS, createPostflopDrillSession } from "./src/train/drillPostflop";
import { rankOf } from "./src/engine/cards";
let fails = 0;
for (let trial = 0; trial < 1000; trial++) {
  for (const spot of POSTFLOP_DRILL_SPOTS) {
    const session = createPostflopDrillSession(spot.id, spot.handCount, Math.random);
    const boardsSeen = new Set(session.hands.map((h) => h.board.map((c) => c).sort().join(",")));
    const handsSeen = new Set(session.hands.map((h) => h.hand.slice().sort((a, b) => a - b).join(",")));
    if (boardsSeen.size !== session.hands.length || handsSeen.size !== session.hands.length) {
      fails++;
      console.log(`trial ${trial} ${spot.id}: boards=${boardsSeen.size} hands=${handsSeen.size}/${session.hands.length} (spot hc ${spot.handCount})`);
      if (fails > 3) process.exit(0);
    }
    const isPairSpot = ["overpair", "monster_dry", "top_pair"].includes(spot.id);
    if (isPairSpot) {
      const pairRanks = session.hands
        .filter((h) => rankOf(h.hand[0]) === rankOf(h.hand[1]))
        .map((h) => rankOf(h.hand[0]));
      if (new Set(pairRanks).size !== pairRanks.length) {
        fails++;
        console.log(`trial ${trial} ${spot.id}: pairRanks dup ${pairRanks.length} vs ${new Set(pairRanks).size}`);
        if (fails > 3) process.exit(0);
      }
    }
  }
}
console.log("total fails:", fails);

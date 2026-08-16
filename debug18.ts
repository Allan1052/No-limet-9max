import { POSTFLOP_DRILL_SPOTS, createPostflopDrillSession } from "./src/train/drillPostflop";
let fails = 0;
for (let trial = 0; trial < 200; trial++) {
  for (const spot of POSTFLOP_DRILL_SPOTS) {
    const session = createPostflopDrillSession(spot.id, spot.handCount, Math.random);
    const handsSeen = new Set(session.hands.map((h) => h.hand.slice().sort((a,b)=>a-b).join(",")));
    if (handsSeen.size !== spot.handCount) {
      fails++;
      const counts = new Map<string,number>();
      for (const h of session.hands) {
        const k = h.hand.slice().sort((a,b)=>a-b).join(",");
        counts.set(k,(counts.get(k)||0)+1);
      }
      for (const [k,n] of counts) if (n>1) {
        const hs = session.hands.filter(h=>h.hand.slice().sort((a,b)=>a-b).join(",")===k);
        console.log(`trial ${trial} ${spot.id}: dup`, hs.map(h=>h.hand.join(",")+" board "+h.board.join(",")).join(" || "));
      }
      if (fails > 5) process.exit(0);
    }
  }
}
console.log("total fails:", fails);

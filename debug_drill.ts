import { POSTFLOP_DRILL_SPOTS, generatePostflopDrillHand } from "./src/train/drillPostflop";
import { rankOf, suitOf } from "./src/engine/cards";

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const spot = POSTFLOP_DRILL_SPOTS.find((s) => s.id === "flush_draw")!;

let fails = 0;
for (let seed = 0; seed < 200; seed++) {
  const rng = mulberry32(seed * 997 + 13);
  const h = generatePostflopDrillHand(spot, rng);
  const [c1, c2] = h.hand;
  const issues: string[] = [];
  if (suitOf(c1) !== suitOf(c2)) issues.push(`suits differ ${c1}/${c2}`);
  if (!h.board.map((c) => suitOf(c)).includes(suitOf(c1))) issues.push(`board lacks suit ${c1}`);
  if (issues.length) {
    fails++;
    if (fails <= 5) {
      console.log(`seed ${seed}: board=${h.board.map((c) => `${rankOf(c)}s${suitOf(c)}`).join(" ")} hand=[${c1},${c2}] ${issues.join(" | ")}`);
    }
  }
}
console.log(`flush_draw: ${fails} fails in 200`);

// Também testar sessão: boards únicos?
import { createPostflopDrillSession } from "./src/train/drillPostflop";
for (const s of POSTFLOP_DRILL_SPOTS) {
  const session = createPostflopDrillSession(s.id, 30, Math.random);
  const boardsSeen = new Set(session.hands.map((h) => h.board.slice().sort((a, b) => a - b).join(",")));
  const handsSeen = new Set(session.hands.map((h) => h.hand.slice().sort((a, b) => a - b).join(",")));
  const boardsDup = session.hands.filter((h, i) =>
    session.hands.slice(0, i).some((p) => p.board.slice().sort((a, b) => a - b).join(",") === h.board.slice().sort((a, b) => a - b).join(",")),
  ).length;
  console.log(`${s.id}: distinct boards ${boardsSeen.size}/30, boards duplicated ${boardsDup}, distinct hands ${handsSeen.size}/30`);
  // verificação de vizinhos similares
  let sim = 0;
  for (let i = 1; i < session.hands.length; i++) {
    const a = new Set(session.hands[i - 1].board.map((c) => rankOf(c)));
    const shared = session.hands[i].board.filter((c) => a.has(rankOf(c))).length;
    if (shared >= 2) sim++;
  }
  console.log(`  neighbor-similar boards (2+ shared ranks): ${sim}`);
}

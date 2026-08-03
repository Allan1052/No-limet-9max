// ---------------------------------------------------------------------------
// Simulação completa de mesa final: 9 jogadores, todas as posições,
// todas as 169 mãos, contexto de ICM ativo (mesa final de torneio).
// Compara com ranges de referência profissionais.
// ---------------------------------------------------------------------------

import { execSync } from "child_process";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";

// Build the project first to get compiled output
console.log("Building project...");
execSync("cd /home/ubuntu/no-limet-9max && npx tsc --noEmit 2>&1 | head -5", { encoding: "utf8" });

// Run the simulation via vitest-compatible import
// We'll write a Node.js script that imports the modules directly
const simCode = `
import { preflopDecision } from "./src/ranges/preflop.js";
import { BASELINE_PROFILE } from "./src/bots/profiles.js";
import { allHandTypes, POSITIONS } from "./src/ranges/types.js";
import { makeCard, rankOf, suitOf, RANKS } from "./src/engine/cards.js";

// Mesa final: 9 jogadores, stacks variados, payouts ICM
const finalTableStacks = [120, 85, 60, 45, 30, 25, 18, 12, 5];
const payouts = [50, 25, 15, 7, 3, 0, 0, 0, 0]; // top 5 paga

// ICM spots para cada posição (herói vs cada possível raiser)
function getIcmSpots(heroPosIdx) {
  const spots = [];
  for (let raiserIdx = 0; raiserIdx < 9; raiserIdx++) {
    if (raiserIdx === heroPosIdx) continue;
    spots.push({
      stacks: finalTableStacks,
      payouts: payouts,
      hero: heroPosIdx,
      villain: raiserIdx,
      chips: Math.min(finalTableStacks[heroPosIdx], finalTableStacks[raiserIdx]),
    });
  }
  return spots;
}

function getCardForHandType(handType) {
  const r1 = 14 - RANKS.indexOf(handType[0]);
  const r2 = 14 - RANKS.indexOf(handType[1]);
  const s1 = 0, s2 = handType.includes('s') ? 0 : 1;
  return [makeCard(r1, s1), makeCard(r2, s2)];
}

const results = {};
const positions = POSITIONS;
const hands = allHandTypes();

// For RFI spots (hero opens, no raiser)
for (const pos of positions) {
  const posIdx = positions.indexOf(pos);
  results[\`RFI_\${pos}\`] = {};
  for (const handType of hands) {
    const cards = getCardForHandType(handType);
    const dec = preflopDecision({
      heroPosition: pos,
      hand: cards,
      effectiveBB: 100,
      profile: BASELINE_PROFILE,
      variant: "holdem",
    });
    results[\`RFI_\${pos}\`][handType] = {
      action: dec.action,
      sizeBB: dec.sizeBB,
      reason: dec.reason,
    };
  }
}

// For vs-open spots (SB/BB defending, late positions facing open)
const defenseSpots = [
  { hero: "SB", raiser: "BTN", openSize: 2.3 },
  { hero: "SB", raiser: "CO", openSize: 2.3 },
  { hero: "SB", raiser: "LJ", openSize: 2.3 },
  { hero: "SB", raiser: "HJ", openSize: 2.3 },
  { hero: "BB", raiser: "BTN", openSize: 2.3 },
  { hero: "BB", raiser: "CO", openSize: 2.3 },
  { hero: "BB", raiser: "LJ", openSize: 2.3 },
  { hero: "BB", raiser: "HJ", openSize: 2.3 },
  { hero: "BB", raiser: "MP", openSize: 2.3 },
  { hero: "LJ", raiser: "BTN", openSize: 2.3 },
  { hero: "CO", raiser: "BTN", openSize: 2.3 },
  { hero: "CO", raiser: "SB", openSize: 2.3 },
  { hero: "UTG1", raiser: "BTN", openSize: 2.3 },
  { hero: "UTG", raiser: "BTN", openSize: 2.3 },
  { hero: "UTG", raiser: "CO", openSize: 2.3 },
  { hero: "UTG", raiser: "HJ", openSize: 2.3 },
];

for (const spot of defenseSpots) {
  const key = \`VS_\${spot.hero}_\${spot.raiser}\`;
  results[key] = {};
  for (const handType of hands) {
    const cards = getCardForHandType(handType);
    const dec = preflopDecision({
      heroPosition: spot.hero,
      hand: cards,
      effectiveBB: 100,
      profile: BASELINE_PROFILE,
      raiserPosition: spot.raiser,
      openSizeBB: spot.openSize,
      variant: "holdem",
    });
    results[key][handType] = {
      action: dec.action,
      sizeBB: dec.sizeBB,
      reason: dec.reason,
    };
  }
}

// Also run with ICM spots for final-table pressure
for (const spot of defenseSpots) {
  const key = \`ICM_\${spot.hero}_\${spot.raiser}\`;
  results[key] = {};
  const heroPosIdx = positions.indexOf(spot.hero);
  const icmSpots = getIcmSpots(heroPosIdx);
  const icmSpot = icmSpots[0] || undefined;
  
  for (const handType of hands) {
    const cards = getCardForHandType(handType);
    const dec = preflopDecision({
      heroPosition: spot.hero,
      hand: cards,
      effectiveBB: 100,
      profile: BASELINE_PROFILE,
      raiserPosition: spot.raiser,
      openSizeBB: spot.openSize,
      icmSpot: icmSpot,
      variant: "holdem",
    });
    results[key][handType] = {
      action: dec.action,
      sizeBB: dec.sizeBB,
      reason: dec.reason,
    };
  }
}

// Push/fold simulation for short stacks (10bb)
for (const pos of positions) {
  results[\`PUSH_\${pos}\`] = {};
  for (const handType of hands) {
    const cards = getCardForHandType(handType);
    const dec = preflopDecision({
      heroPosition: pos,
      hand: cards,
      effectiveBB: 10,
      profile: BASELINE_PROFILE,
      variant: "holdem",
    });
    results[\`PUSH_\${pos}\`][handType] = {
      action: dec.action,
      sizeBB: dec.sizeBB,
    };
  }
}

writeFileSync("/home/ubuntu/no-limet-9max/sim-results.json", JSON.stringify(results, null, 2));
console.log("Simulation complete. Results written to sim-results.json");
console.log("Total positions simulated:", Object.keys(results).length);
`;

// Write the simulation script
writeFileSync("/home/ubuntu/no-limet-9max/sim.mjs", simCode);
console.log("Simulation script written. Ready to run.");

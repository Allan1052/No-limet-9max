import { preflopOpenRange, continueVillainRange } from "../src/train/streets/dynamicRanges";

const R = (r: number, s: number) => (r - 2) * 4 + s;
const dryFlop = { street: "flop" as const, cards: [R(14, 3), R(8, 1), R(6, 0)] };
const init = preflopOpenRange("CO", 40);
const ctx = { heroPosition: "UTG", villainPosition: "CO", heroStackBB: 40, villainStackBB: 40, potBB: 3.8, facedBetBB: 1.9 };
const s = continueVillainRange(init, "call" as never, dryFlop, ctx);
const entries = Object.entries(s.range).sort((a, b) => b[1] - a[1]);
console.log("percent:", s.percent.toFixed(1));
console.log("top 20 hands do call range:");
entries.slice(0, 20).forEach(([ht, f]) => console.log(`  ${ht}: ${f.toFixed(2)}`));
const low = entries.filter(([ht, f]) => f > 0.001 && ht.match(/^[2-9]|T2|T3/));
console.log("hands 22..99 e low offsuit ainda presentes (freq>0.001):", low.slice(0, 15).map(([ht, f]) => `${ht}:${f.toFixed(2)}`).join(" "));

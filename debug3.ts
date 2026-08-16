// board Jd(37),6d(17),4s(11). drawSuit=1. candidates = [1,5,9,13,21,25,29,33,41,45,49]
// mulberry32(13): 1ª chamada → idx. Simular:
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(13);
const r1 = rng();
const r2 = rng();
console.log("r1=", r1, "r2=", r2);
// take 1: candidates[ floor(r1*11) ]
const candidates = [1,5,9,13,21,25,29,33,41,45,49];
const c1 = candidates[Math.floor(r1*11)];
console.log("carta1:", c1);
// depois dead adiciona c1. candidates.filter(!dead): remove c1 → 10 restantes
const rest = candidates.filter((c) => c !== c1);
const c2 = rest[Math.floor(r2*10)];
console.log("carta2:", c2);

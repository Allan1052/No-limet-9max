// ---------------------------------------------------------------------------
// Composição do CAMPO por buy-in. No micro ($5) a mesa é cheia de peixe
// (recreativo/station/spewy). Conforme o buy-in sobe, regulares passam a
// dominar sem transformar a dificuldade em trapaça: muda a composição do field,
// nunca as cartas vistas pelo bot ou o baralho.
// ---------------------------------------------------------------------------

import { buyInToughness, fieldEliteness, type Archetype } from "./profiles";

const NAME_POOL: Record<Archetype, string[]> = {
  recreativo: ["O Casual", "Zé do Flop", "Turista", "Domingão"],
  station: ["Paga-Tudo", "Grude", "Xerife da Call", "Não Solto"],
  spewy: ["O Doidão", "Estouro", "Fominha", "Maluco Beleza"],
  abc: ["O Cartilha", "Manual", "Sem Susto", "Bê-á-bá"],
  nit: ["Muralha", "Cadeado", "Tartaruga", "Seu Cauteloso"],
  tag: ["O Certinho", "Regularzão", "Livro Aberto", "Metódico"],
  lag: ["Furacão", "Vendaval", "Tromba", "Pressão"],
  shover: ["Tudo ou Nada", "All-in Fácil", "Zero ou Cem", "Roleta"],
};

const MICRO_HIGH: Record<Archetype, [number, number]> = {
  recreativo: [5.0, 0.8],
  station: [4.0, 0.5],
  spewy: [2.5, 1.0],
  abc: [2.0, 2.2],
  nit: [1.2, 2.2],
  tag: [1.3, 3.3],
  lag: [1.0, 3.0],
  shover: [1.0, 1.2],
};

const ARCHETYPES = Object.keys(MICRO_HIGH) as Archetype[];
const MAX_PER_ARCHETYPE = 4;

export function fieldWeights(buyIn?: number): Record<Archetype, number> {
  const t = buyInToughness(buyIn);
  const out = {} as Record<Archetype, number>;
  for (const a of ARCHETYPES) {
    const [lo, hi] = MICRO_HIGH[a];
    out[a] = lo * (1 - t) + hi * t;
  }

  // Acima de $109 usamos uma curva separada. O expoente cúbico retira rápido
  // os perfis recreativos, enquanto TAG/LAG/ABC crescem. Isso cria diferença
  // perceptível entre $109, $1k e $10.3k sem dar informação extra aos bots.
  const e = fieldEliteness(buyIn);
  if (e > 0) {
    const fishRetention = Math.pow(1 - e, 3);
    for (const a of ["recreativo", "station", "spewy"] as Archetype[]) {
      out[a] *= fishRetention;
    }
    out.tag *= 1 + 1.8 * e;
    out.lag *= 1 + 1.6 * e;
    out.abc *= 1 + 0.7 * e;
    out.nit *= 1 + 0.35 * e;
    out.shover *= 1 - 0.35 * e;
  }
  return out;
}

function weightedPick(weights: Record<Archetype, number>, rng: () => number): Archetype {
  const pool = ARCHETYPES.filter((a) => weights[a] > 0);
  const total = pool.reduce((s, a) => s + weights[a], 0);
  let r = rng() * total;
  for (const a of pool) {
    r -= weights[a];
    if (r <= 0) return a;
  }
  return pool[pool.length - 1];
}

function pickName(arch: Archetype, used: Set<string>): string {
  for (const n of NAME_POOL[arch]) if (!used.has(n)) return n;
  let k = 2;
  while (used.has(`${NAME_POOL[arch][0]} ${k}`)) k++;
  return `${NAME_POOL[arch][0]} ${k}`;
}

export function buildFieldSeats(
  buyIn: number | undefined,
  count: number,
  rng: () => number,
): { name: string; profileId: string; personalitySeed: number }[] {
  const weights = fieldWeights(buyIn);
  const counts: Partial<Record<Archetype, number>> = {};
  const used = new Set<string>();
  const out: { name: string; profileId: string; personalitySeed: number }[] = [];
  for (let i = 0; i < count; i++) {
    const w = { ...weights };
    for (const a of ARCHETYPES) if ((counts[a] ?? 0) >= MAX_PER_ARCHETYPE) w[a] = 0;
    const arch = weightedPick(w, rng);
    counts[arch] = (counts[arch] ?? 0) + 1;
    const name = pickName(arch, used);
    used.add(name);
    out.push({ name, profileId: arch, personalitySeed: 1 + Math.floor(rng() * 2_000_000_000) });
  }
  return out;
}

export function pickReplacement(
  buyIn: number | undefined,
  usedNames: Set<string>,
  rng: () => number,
): { name: string; profileId: string } {
  const arch = weightedPick(fieldWeights(buyIn), rng);
  const name = pickName(arch, usedNames);
  return { name, profileId: arch };
}

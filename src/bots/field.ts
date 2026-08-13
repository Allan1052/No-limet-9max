// ---------------------------------------------------------------------------
// Composição do CAMPO por buy-in. No micro ($5) a mesa é cheia de peixe
// (recreativo/station/spewy) — muito flop, muito limp. No alto ($109) ela é
// cheia de regular (tag/lag/nit/abc) — apertado-agressivo, pouco flop. É o que
// faz o $109 "sentir" como GG/Stars, e não uma mesa igual a do micro.
//
// Amostramos os arquétipos por peso (com repetição — uma mesa de $5 REALMENTE
// tem vários peixes), dando a cada assento um apelido distinto.
// ---------------------------------------------------------------------------

import { buyInToughness, fieldEliteness, type Archetype } from "./profiles";

/** Apelidos por arquétipo (o 1º é o nome canônico do perfil). */
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

/** Peso de cada arquétipo em [micro, alto]; interpolado pela dureza do buy-in. */
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
const MAX_PER_ARCHETYPE = 4; // evita mesa degenerada (6× o mesmo tipo)

/** Pesos do campo para um buy-in (micro = peixe, alto = regular). */
export function fieldWeights(buyIn?: number): Record<Archetype, number> {
  const t = buyInToughness(buyIn);
  const out = {} as Record<Archetype, number>;
  for (const a of ARCHETYPES) {
    const [lo, hi] = MICRO_HIGH[a];
    out[a] = lo * (1 - t) + hi * t;
  }
  // ELITE ($1.000+): os peixes somem e os regulares dominam — "só a nata".
  const e = fieldEliteness(buyIn);
  if (e > 0) {
    for (const a of ["recreativo", "station", "spewy"] as Archetype[]) {
      out[a] *= (1 - e) * (1 - e); // peixe some rápido conforme sobe o rolê
    }
    for (const a of ["tag", "lag", "nit"] as Archetype[]) {
      out[a] *= 1 + 0.8 * e; // regulares concentram o campo
    }
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

/** Monta os assentos dos bots (nome + profileId) pesados pelo buy-in. */
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
    // Semente única por bot: cada um vira um estilo próprio (Camada 1).
    out.push({ name, profileId: arch, personalitySeed: 1 + Math.floor(rng() * 2_000_000_000) });
  }
  return out;
}

/** Escolhe UM substituto (reload de assento estourado) pesado pelo buy-in. */
export function pickReplacement(
  buyIn: number | undefined,
  usedNames: Set<string>,
  rng: () => number,
): { name: string; profileId: string } {
  const arch = weightedPick(fieldWeights(buyIn), rng);
  const name = pickName(arch, usedNames);
  return { name, profileId: arch };
}

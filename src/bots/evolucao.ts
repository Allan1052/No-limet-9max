// ---------------------------------------------------------------------------
// EVOLUÇÃO DOS BOTS — eles jogam uns contra os outros e ficam melhores.
//
// ✨ 15/09/2026, ideia do Allan: *"teria como deixar os bots com evolução
// automática? Cada bot usaria o outro pra evoluir. Assim cada vez mais ficaria
// difícil enfrentar eles."*
//
// Dá. É um algoritmo genético: cada perfil vira um GENOMA (os números que
// mandam no jogo dele), eles disputam milhares de mãos entre si, quem lucra
// mais deixa descendentes com pequenas mutações, e a população melhora sozinha.
//
// ═══ AS QUATRO COLEIRAS (e por que cada uma existe) ═══════════════════════
//
// Auto-jogo solto não produz bots bons — produz bots ESTRANHOS. São armadilhas
// conhecidas, e cada uma tem aqui a sua trava:
//
// 1. DERIVA. Se os bots só jogam entre si, eles convergem para um acordo
//    esquisito: todo mundo blefa demais porque ninguém aprendeu a punir, e na
//    planilha interna todos "ganham". Contra gente de verdade, é lixo.
//    → TRAVA: o juiz não é a população. É o BASELINE quase-GTO, que NÃO evolui.
//      Um genoma só é aceito se lucra contra ele. Ver `avaliar`.
//
// 2. PERDA DE IDENTIDADE. Solto, o "Muralha" (nit) vira um LAG em vinte
//    gerações — porque agressão paga. Aí morre o valor de estudo do app, que é
//    aprender a reconhecer TIPOS de adversário.
//    → TRAVA: cada gene tem um intervalo por arquétipo. Nit continua nit.
//
// 3. DIFICULDADE SEM FIM. "Cada vez mais difícil" parece ótimo, mas um campo
//    perfeito não ensina nada: o jogador só perde e não entende por quê. Este
//    app é de ESTUDO.
//    → TRAVA: a evolução tem TETO, e o teto é por faixa. O campo de $5 quase
//      não evolui — micro tem que continuar parecendo micro. Quem evolui de
//      verdade é o 1K e o 10,3K.
//
// 4. CUSTO. Milhares de mãos não podem rodar no celular do jogador: gastaria
//    bateria e travaria o app.
//    → TRAVA: isto roda OFFLINE, aqui no repositório, e o que entra no app é o
//      resultado congelado e versionado. O app não evolui sozinho no bolso de
//      ninguém — o que ele recebe é uma calibragem nova, medida e registrada.
// ---------------------------------------------------------------------------

import type { Archetype, BotProfile } from "./profiles";

/** Os genes: só o que muda comportamento, e só o que é seguro mexer. */
export const GENES = [
  "rfiWidth",
  "threeBetFactor",
  "defendFactor",
  "coldCallFactor",
  "cbetFactor",
  "barrelTurn",
  "barrelRiver",
  "bluffFactor",
  "aggression",
  "multiwayReduction",
  "stickiness",
] as const;

export type Gene = (typeof GENES)[number];
export type Genoma = Record<Gene, number>;

/**
 * Quanto cada arquétipo pode se afastar do que ele é, por gene.
 *
 * O número é a fração máxima de mudança para cada lado. 0.25 = pode variar 25%
 * para cima ou para baixo. Zero trava o gene.
 *
 * Os limites apertados nos genes de AGRESSÃO dos perfis passivos são a coleira
 * nº 2: é o que impede o "Paga-Tudo" de virar um regular agressivo, o que
 * apagaria a razão de ele existir.
 */
const FOLGA_POR_ARQUETIPO: Record<Archetype, number> = {
  recreativo: 0.14,
  station: 0.12,
  spewy: 0.18,
  abc: 0.20,
  nit: 0.16,
  tag: 0.30,
  lag: 0.30,
  shover: 0.20,
};

/** Tetos absolutos por gene — nenhum genoma sai destes trilhos. */
const TETO: Record<Gene, [number, number]> = {
  rfiWidth: [0.3, 2.4],
  threeBetFactor: [0.2, 2.6],
  defendFactor: [0.5, 2.2],
  coldCallFactor: [0.1, 5.0],
  cbetFactor: [0.5, 1.6],
  barrelTurn: [0.08, 0.80],
  barrelRiver: [0.05, 0.60],
  bluffFactor: [0.4, 2.0],
  aggression: [0.15, 0.97],
  multiwayReduction: [0.02, 0.6],
  stickiness: [0.2, 0.9],
};

export function genomaDe(p: BotProfile): Genoma {
  const g = {} as Genoma;
  for (const k of GENES) g[k] = p[k] as number;
  return g;
}

export function aplicarGenoma(p: BotProfile, g: Genoma): BotProfile {
  return { ...p, ...g };
}

/** Prende o genoma na identidade do arquétipo e nos tetos absolutos. */
export function coleira(g: Genoma, original: Genoma, arq: Archetype): Genoma {
  const folga = FOLGA_POR_ARQUETIPO[arq];
  const out = {} as Genoma;
  for (const k of GENES) {
    const base = original[k];
    const min = Math.min(base * (1 - folga), base - 0.02);
    const max = Math.max(base * (1 + folga), base + 0.02);
    const [tmin, tmax] = TETO[k];
    out[k] = Math.max(Math.max(min, tmin), Math.min(Math.min(max, tmax), g[k]));
  }
  return out;
}

/**
 * Quanto uma faixa pode evoluir (0 = nada, 1 = tudo o que a coleira permite).
 *
 * Coleira nº 3. O micro NÃO deve ficar difícil: ele existe para o jogador
 * aprender a ganhar de um campo fraco, e um micro que evolui deixa de ser
 * micro. Quem evolui é o topo — que é exatamente onde o Allan pediu dificuldade.
 */
export function tetoDeEvolucao(buyIn?: number): number {
  if (!buyIn || buyIn <= 5) return 0;
  if (buyIn <= 22) return 0.15;
  if (buyIn <= 109) return 0.4;
  if (buyIn <= 1000) return 0.75;
  return 1;
}

/** Sorteia uma mutação pequena em alguns genes. */
export function mutar(g: Genoma, forca: number, rng: () => number): Genoma {
  const out = { ...g };
  for (const k of GENES) {
    // Nem todo gene muda a cada geração: mutação esparsa explora melhor.
    if (rng() > 0.45) continue;
    const passo = (rng() * 2 - 1) * forca;
    out[k] = g[k] * (1 + passo);
  }
  return out;
}

/** Cruza dois genomas gene a gene (uniforme). */
export function cruzar(a: Genoma, b: Genoma, rng: () => number): Genoma {
  const out = {} as Genoma;
  for (const k of GENES) out[k] = rng() < 0.5 ? a[k] : b[k];
  return out;
}

export interface Candidato {
  arq: Archetype;
  genoma: Genoma;
  /** bb/100 contra a população da geração. */
  contraPopulacao: number;
  /** bb/100 contra o BASELINE quase-GTO — o juiz de verdade. */
  contraBaseline: number;
}

/**
 * A NOTA de um candidato.
 *
 * Coleira nº 1: o desempenho contra a população vale pouco; o que decide é o
 * resultado contra o baseline, que não evolui. Um genoma que só ganha dos
 * primos mutantes é deriva, não evolução — e esta conta o rejeita.
 */
export function nota(c: Candidato): number {
  return 0.25 * c.contraPopulacao + 0.75 * c.contraBaseline;
}

/** Diferença total entre dois genomas — para medir se a identidade sobreviveu. */
export function distancia(a: Genoma, b: Genoma): number {
  let s = 0;
  for (const k of GENES) {
    const base = Math.abs(b[k]) > 1e-6 ? Math.abs(b[k]) : 1;
    s += Math.abs(a[k] - b[k]) / base;
  }
  return s / GENES.length;
}

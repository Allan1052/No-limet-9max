// ---------------------------------------------------------------------------
// Composição do CAMPO por buy-in. No micro ($5) a mesa é cheia de peixe
// (recreativo/station/spewy). Conforme o buy-in sobe, regulares passam a
// dominar sem transformar a dificuldade em trapaça: muda a composição do field,
// nunca as cartas vistas pelo bot ou o baralho.
// ---------------------------------------------------------------------------

import { buyInToughness, fieldEliteness, type Archetype } from "./profiles";

/**
 * Apelidos de mesa, por arquétipo. O nome é dica do estilo — faz parte do
 * estudo saber que "Muralha" abre pouco e "Furacão" abre muito.
 *
 * 🐞 14/09/2026. Eram 4 por arquétipo (32 no total) e o Allan viu "O Certinho",
 * "O Certinho 2" e "O Certinho 3" sentados na MESMA mesa, num torneio de 100.
 * Dezesseis por arquétipo (128 no total) cobrem um torneio inteiro sem precisar
 * do apelido numerado — que continua existindo, mas como último recurso.
 */
const NAME_POOL: Record<Archetype, string[]> = {
  recreativo: [
    "O Casual", "Zé do Flop", "Turista", "Domingão",
    "Fim de Semana", "Só Diversão", "Passatempo", "Vim Jogar",
    "Sem Pressa", "Curioso", "Boa Praça", "Tô Nessa",
    "Joga Fácil", "Primeira Vez", "Sorte Grande", "De Boa",
  ],
  station: [
    "Paga-Tudo", "Grude", "Xerife da Call", "Não Solto",
    "Quero Ver", "Pago pra Ver", "Chiclete", "Carrapato",
    "Sem Fold", "Cola Forte", "Só Call", "Duvido",
    "Teimoso", "Tô Dentro", "Caramujo", "Vou Até o Fim",
  ],
  spewy: [
    "O Doidão", "Estouro", "Fominha", "Maluco Beleza",
    "Pé na Tábua", "Sem Freio", "Descontrolado", "Vale-Tudo",
    "Chuva de Ficha", "Turbilhão", "Dedo Leve", "Solta Tudo",
    "Jogo Aberto", "Sem Noção", "Perdeu a Linha", "Rodo Solto",
  ],
  abc: [
    "O Cartilha", "Manual", "Sem Susto", "Bê-á-bá",
    "Livro-Texto", "Passo a Passo", "Receita Pronta", "Faz o Básico",
    "Sem Invenção", "Arroz com Feijão", "Segue a Linha", "Padrãozinho",
    "Certo e Simples", "Pé no Chão", "Pela Regra", "Do Começo",
  ],
  nit: [
    "Muralha", "Cadeado", "Tartaruga", "Seu Cauteloso",
    "Trincheira", "Cofre", "Blindado", "Pedra",
    "Só Premium", "Espera o Ás", "Concreto", "Fechadura",
    "Casca Grossa", "Paciência", "Fortaleza", "Pé Atrás",
  ],
  tag: [
    "O Certinho", "Regularzão", "Livro Aberto", "Metódico",
    "Afiado", "Relojoeiro", "Bisturi", "Cabeça Fria",
    "Preciso", "Linha Dura", "Calculista", "Engrenagem",
    "Bússola", "Régua", "Fio de Navalha", "No Ponto",
  ],
  lag: [
    "Furacão", "Vendaval", "Tromba", "Pressão",
    "Tempestade", "Ventania", "Raio", "Avalanche",
    "Enxurrada", "Correnteza", "Redemoinho", "Trovoada",
    "Maremoto", "Rajada", "Tufão", "Ciclone",
  ],
  shover: [
    "Tudo ou Nada", "All-in Fácil", "Zero ou Cem", "Roleta",
    "Oito ou Oitenta", "Vai ou Racha", "Tudo Dentro", "Sem Meio-Termo",
    "Cara ou Coroa", "Empurra Tudo", "Agora ou Nunca", "Aposta Tudo",
    "Dobro ou Nada", "Só Jam", "Bota Tudo", "Última Ficha",
  ],
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
/** Teto por arquétipo no campo inicial — acompanha o tamanho do pool de nomes
 *  (16 cada). Com 4, um campo de 100 esgotava os oito arquétipos em 32 e o
 *  sorteio ficava sem nenhum perfil disponível. */
const MAX_PER_ARCHETYPE = 16;

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

/**
 * Um apelido livre para este arquétipo.
 *
 * 🐞 14/09/2026 — a causa real do "O Certinho 2" na mesa do Allan. A função só
 * olhava a lista DO ARQUÉTIPO sorteado: esgotados os nomes de "tag", ela caía
 * no apelido numerado mesmo com dezenas de nomes livres nos outros arquétipos.
 * Agora, se o arquétipo sorteado esgotou, ela procura em TODOS os outros antes
 * de numerar. O numerado virou último recurso de verdade.
 *
 * Devolve também o arquétipo de onde o nome saiu, porque nome e estilo andam
 * juntos: quem se chama "Muralha" tem de jogar como nit.
 */
function pickName(arch: Archetype, used: Set<string>): { name: string; arch: Archetype } {
  for (const n of NAME_POOL[arch]) if (!used.has(n)) return { name: n, arch };
  for (const outro of ARCHETYPES) {
    if (outro === arch) continue;
    for (const n of NAME_POOL[outro]) if (!used.has(n)) return { name: n, arch: outro };
  }
  let k = 2;
  while (used.has(`${NAME_POOL[arch][0]} ${k}`)) k++;
  return { name: `${NAME_POOL[arch][0]} ${k}`, arch };
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
    const sorteado = weightedPick(w, rng);
    const { name, arch } = pickName(sorteado, used);
    counts[arch] = (counts[arch] ?? 0) + 1;
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
  const sorteado = weightedPick(fieldWeights(buyIn), rng);
  const { name, arch } = pickName(sorteado, usedNames);
  return { name, profileId: arch };
}

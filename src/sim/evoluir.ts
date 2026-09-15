// ---------------------------------------------------------------------------
// O LAÇO EVOLUTIVO — gerações de bots, cada uma melhor que a anterior.
//
// Junta as peças: arena.ts disputa, evolucao.ts define genoma/coleira/nota.
// Aqui roda o ciclo — mutar, disputar, julgar, manter o melhor — e devolve os
// genomas vencedores para serem CONGELADOS no app.
//
// ⚠️ Roda offline, no repositório. O app do jogador nunca evolui sozinho: ele
// recebe o resultado já medido e versionado (coleira nº 4 da evolucao.ts).
// ---------------------------------------------------------------------------

import { seededRng } from "../engine/cards";
import { PROFILES, profileById, type BotProfile } from "../bots/profiles";
import {
  aplicarGenoma, coleira, cruzar, distancia, genomaDe, mutar, nota,
  tetoDeEvolucao, type Candidato, type Genoma,
} from "../bots/evolucao";
import { ganhoPareado, disputar, type Elenco } from "./arena";

export interface OpcoesDeEvolucao {
  /** Faixa para a qual estamos evoluindo (define o teto — ver tetoDeEvolucao). */
  buyIn: number;
  geracoes: number;
  /** Indivíduos por arquétipo em cada geração. */
  populacao: number;
  /** Mãos por disputa. Menos mãos = mais ruído = evolução que persegue sorte. */
  maosPorDisputa: number;
  semente?: number;
  /** Chamado a cada geração, para acompanhar. */
  aoFimDaGeracao?: (g: number, melhores: Candidato[]) => void;
}

export interface ResultadoDaEvolucao {
  buyIn: number;
  geracoes: number;
  /** O melhor genoma de cada arquétipo, já com a coleira aplicada. */
  campeoes: Candidato[];
  /** bb/100 contra o baseline: antes e depois, por arquétipo. */
  ganho: Array<{ arq: string; antes: number; depois: number; deriva: number }>;
}

export function evoluir(opts: OpcoesDeEvolucao): ResultadoDaEvolucao {
  const rng = seededRng(opts.semente ?? 20260915);
  const teto = tetoDeEvolucao(opts.buyIn);
  const originais = new Map<string, Genoma>();
  for (const p of PROFILES) originais.set(p.id, genomaDe(p));

  // Nota de partida: cada perfil ORIGINAL contra o baseline.
  const antes = new Map<string, number>();
  for (const p of PROFILES) {
    antes.set(p.id, ganhoPareado(p, opts.maosPorDisputa, 101));
  }

  // População inicial: o original + mutantes dele.
  let pop = new Map<string, Genoma[]>();
  for (const p of PROFILES) {
    const base = originais.get(p.id)!;
    const lista = [base];
    for (let i = 1; i < opts.populacao; i++) {
      lista.push(coleira(mutar(base, 0.12 * teto, rng), base, p.archetype));
    }
    pop.set(p.id, lista);
  }

  let campeoes: Candidato[] = [];

  for (let g = 0; g < opts.geracoes; g++) {
    // Força de mutação cai com as gerações: explora no começo, refina no fim.
    const forca = 0.14 * teto * (1 - (g / Math.max(1, opts.geracoes)) * 0.6);
    const avaliados = new Map<string, Candidato[]>();

    for (const p of PROFILES) {
      const lista = pop.get(p.id)!;
      const cands: Candidato[] = [];
      for (let i = 0; i < lista.length; i++) {
        const genoma = lista[i];
        const perfil = aplicarGenoma(p, genoma);

        // 1) contra a população da geração (os outros arquétipos, no melhor
        //    genoma que cada um tem agora).
        const elenco: Elenco = [perfil];
        for (const outro of PROFILES) {
          if (outro.id === p.id) continue;
          const dele = pop.get(outro.id)![0];
          elenco.push(aplicarGenoma(outro, dele));
        }
        elenco.push(null); // uma cadeira do baseline sempre na mesa
        const contraPopulacao = disputar(elenco, opts.maosPorDisputa, 5000 + g * 31 + i)[0];

        // 2) contra o juiz que NÃO evolui — em DUPLICATE, com a sorte
        //    descontada (ver arena.ganhoPareado). Sem isso a seleção premia
        //    quem recebeu carta boa e a evolução anda para trás.
        const contraBaseline = ganhoPareado(perfil, opts.maosPorDisputa, 900 + g * 17 + i);

        cands.push({ arq: p.archetype, genoma, contraPopulacao, contraBaseline });
      }
      cands.sort((a, b) => nota(b) - nota(a));
      avaliados.set(p.id, cands);
    }

    // Nova geração: os dois melhores sobrevivem; o resto vem de cruzamento +
    // mutação entre os quatro melhores.
    const proxima = new Map<string, Genoma[]>();
    for (const p of PROFILES) {
      const cands = avaliados.get(p.id)!;
      const base = originais.get(p.id)!;
      const elite = cands.slice(0, Math.max(2, Math.floor(cands.length / 3)));
      const lista: Genoma[] = elite.slice(0, 2).map((c) => c.genoma);
      while (lista.length < opts.populacao) {
        const a = elite[Math.floor(rng() * elite.length)].genoma;
        const b = elite[Math.floor(rng() * elite.length)].genoma;
        lista.push(coleira(mutar(cruzar(a, b, rng), forca, rng), base, p.archetype));
      }
      proxima.set(p.id, lista);
    }
    pop = proxima;

    campeoes = PROFILES.map((p) => avaliados.get(p.id)![0]);
    opts.aoFimDaGeracao?.(g + 1, campeoes);
  }

  const ganho = PROFILES.map((p, i) => {
    const c = campeoes[i];
    return {
      arq: p.id,
      antes: Math.round((antes.get(p.id) ?? 0) * 10) / 10,
      depois: Math.round(c.contraBaseline * 10) / 10,
      deriva: Math.round(distancia(c.genoma, originais.get(p.id)!) * 1000) / 1000,
    };
  });

  return { buyIn: opts.buyIn, geracoes: opts.geracoes, campeoes, ganho };
}

/** Serializa os campeões no formato que vai congelado para o app. */
export function paraTabela(r: ResultadoDaEvolucao): string {
  const linhas: string[] = [];
  for (let i = 0; i < PROFILES.length; i++) {
    const p = PROFILES[i];
    const c = r.campeoes[i];
    const pares = Object.entries(c.genoma)
      .map(([k, v]) => `${k}: ${Math.round((v as number) * 1000) / 1000}`)
      .join(", ");
    linhas.push(`  ${p.id}: { ${pares} },`);
  }
  return linhas.join("\n");
}

export { profileById, type BotProfile };

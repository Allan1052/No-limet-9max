// ---------------------------------------------------------------------------
// ARENA — onde os genomas disputam e são julgados.
//
// Parte do motor de evolução (ver bots/evolucao.ts). A arena roda mãos soltas
// (estilo cash, stacks recompostos) com uma mesa montada sob medida e devolve
// o bb/100 de cada assento.
//
// ⚠️ Duas mesas, de propósito:
//   • CONTRA A POPULAÇÃO: o candidato contra os outros perfis da geração. Diz
//     se ele se vira no campo em que vai jogar.
//   • CONTRA O BASELINE: o candidato contra oito cópias do perfil quase-GTO,
//     que NÃO evolui. É o juiz honesto — ganhar aqui é ganhar de verdade, não
//     ganhar de um acordo maluco que a população inventou entre si.
// ---------------------------------------------------------------------------

import { seededRng, type Card } from "../engine/cards";
import { createTable, startHand, applyAction, moveButton, freshShuffledDeck } from "../game/engine";
import { botPreflopAction } from "../bots/preflopBot";
import { botPostflopAction } from "../bots/postflopBot";
import { BASELINE_PROFILE, type BotProfile } from "../bots/profiles";

/** Perfis a sentar, na ordem dos assentos. `null` = BASELINE. */
export type Elenco = Array<BotProfile | null>;

/**
 * Roda `maos` mãos com este elenco e devolve bb/100 por assento.
 *
 * Os perfis são passados por injeção (`perfisPorAssento`) para a arena poder
 * testar genomas que ainda não existem no app.
 */
export function disputar(
  elenco: Elenco,
  maos: number,
  semente: number,
  equityIterations = 160,
): number[] {
  const bb = 50;
  const stack = 120 * bb;
  // ⚠️ DOIS geradores, e isto é o que faz o duplicate funcionar.
  // Com um gerador só, a primeira decisão diferente do candidato consumia um
  // número diferente e TODOS os baralhos seguintes divergiam — as duas
  // execuções deixavam de jogar as mesmas mãos e o pareamento virava enfeite.
  // Medido em 15/09: com gerador único o "pareado" tinha desvio MAIOR que o
  // solto (115,9 contra 79,4 bb/100). Separando, as cartas passam a ser
  // idênticas nas duas rodadas.
  const rngCartas = seededRng(semente);
  const rng = seededRng(semente * 31 + 7);
  const seats = elenco.map((p, i) => ({
    name: p ? `${p.id}-${i}` : `base-${i}`,
    stack,
    profileId: p ? p.id : undefined,
  }));
  const t = createTable({ smallBlind: 25, bigBlind: bb }, seats, 0);

  // Injeta os perfis reais (inclusive genomas novos) por assento.
  const porAssento = new Map<number, BotProfile>();
  elenco.forEach((p, i) => porAssento.set(i, p ?? BASELINE_PROFILE));

  const net = new Array(elenco.length).fill(0);
  let contadas = 0;

  for (let h = 0; h < maos; h++) {
    for (const p of t.players) p.stack = stack;
    const deck: Card[] = freshShuffledDeck(rngCartas);
    startHand(t, deck);

    let guard = 0;
    while (!t.handOver) {
      if (guard++ > 2000) break;
      const seat = t.toAct;
      const perfil = porAssento.get(seat)!;
      const action =
        t.street === "preflop"
          ? botPreflopAction(t, seat, { perfilForcado: perfil })
          : botPostflopAction(t, seat, rng, equityIterations, undefined, undefined, undefined, undefined, perfil);
      applyAction(t, action);
    }
    for (let i = 0; i < elenco.length; i++) net[i] += t.players[i].stack - stack;
    contadas++;
    moveButton(t);
  }

  return net.map((v) => (contadas > 0 ? (v / contadas / bb) * 100 : 0));
}

/** bb/100 do candidato contra 8 cópias do baseline quase-GTO. */
export function contraOBaseline(candidato: BotProfile, maos: number, semente: number): number {
  const elenco: Elenco = [candidato, null, null, null, null, null, null, null, null];
  return disputar(elenco, maos, semente)[0];
}

/**
 * DUPLICATE — a mesma medição, com a sorte descontada.
 *
 * 🐞 15/09/2026. A primeira evolução rodou e devolveu números impossíveis: o
 * "O Cartilha" saiu de −1 para +149,9 bb/100 em três gerações, e o "Paga-Tudo"
 * de +167 para +15,9. Ninguém ganha 150 bb/100 de ninguém — aquilo era SORTE,
 * não habilidade. Com 350 mãos por disputa, o desvio do bb/100 é maior que
 * qualquer diferença real de jogo, e a seleção passa a premiar quem recebeu
 * cartas boas. Uma evolução assim piora os bots com cara de melhorá-los.
 *
 * A saída é a mesma do bridge duplicado: jogar AS MESMAS MÃOS duas vezes. Na
 * primeira, o candidato senta no assento 0; na segunda, o baseline senta no
 * mesmo assento com o MESMO baralho. A diferença entre os dois resultados não
 * tem sorte dentro — o que sobra é a mão de quem jogou.
 */
export function ganhoPareado(candidato: BotProfile, maos: number, semente: number): number {
  const comCandidato: Elenco = [candidato, null, null, null, null, null, null, null, null];
  const soBaseline: Elenco = [null, null, null, null, null, null, null, null, null];
  const a = disputar(comCandidato, maos, semente)[0];
  const b = disputar(soBaseline, maos, semente)[0];
  return a - b;
}

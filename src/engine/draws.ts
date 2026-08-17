// ---------------------------------------------------------------------------
// Detecção de PROJETO (draw) da mão do herói no board — base do crédito de
// implied odds (Frente #3). Um projeto vale, na prática, mais do que a equity
// crua diz: quando COMPLETA, costuma ganhar fichas EXTRAS nas ruas seguintes.
// Para dar esse crédito com segurança, primeiro é preciso saber que a mão TEM
// um projeto de verdade (flush draw, sequência aberta, gutshot) e não já é uma
// mão feita forte.
//
// Módulo de engine, PURO e isolado (só cartas). Reutilizável em qualquer lugar
// que precise saber o projeto — não depende de ranges nem de perfil.
// ---------------------------------------------------------------------------

import { rankOf, suitOf, type Card } from "./cards";

export interface DrawInfo {
  /** Flush draw: 4 cartas do mesmo naipe (falta 1). */
  flushDraw: boolean;
  /** Sequência aberta (open-ended): 4 seguidas, completa dos dois lados. */
  openEnded: boolean;
  /** Gutshot: falta 1 carta no MEIO para a sequência. */
  gutshot: boolean;
  /**
   * Força do projeto em 0..1, para escalar o crédito de implied odds:
   *   ~0.9 flush draw · ~0.8 open-ended · +combo · ~0.35 gutshot · 0 sem projeto.
   * Combo draw (flush + reta) vale mais que qualquer um sozinho.
   */
  strength: number;
}

const NONE: DrawInfo = { flushDraw: false, openEnded: false, gutshot: false, strength: 0 };

/** Detecta o projeto do herói (2 cartas) no board (3-4 cartas). No river (5)
 *  não há projeto — não sobra carta. Considera só as 7 cartas herói+board. */
export function detectDraw(hand: Card[], board: Card[]): DrawInfo {
  // Sem carta por vir (river completo) ou board insuficiente: não há projeto.
  if (board.length < 3 || board.length >= 5) return NONE;
  if (hand.length < 2) return NONE;

  const cards = [...hand, ...board];

  // ---- Flush draw: naipe com exatamente 4 cartas (5+ já é flush feito) ----
  const suitCount = [0, 0, 0, 0];
  for (const c of cards) suitCount[suitOf(c)]++;
  const flushDraw = suitCount.some((n) => n === 4);

  // ---- Projetos de sequência ----
  // Conjunto de ranks presentes (Ás conta como 14 e como 1 para a roda A-2-3-4-5).
  const present = new Set<number>();
  for (const c of cards) {
    const r = rankOf(c);
    present.add(r);
    if (r === 14) present.add(1); // Ás baixo
  }

  let openEnded = false;
  let gutshot = false;
  // Varre janelas de 5 ranks consecutivos (do topo A..10 até A-2-3-4-5). Uma mão
  // feita (5 seguidas) não é projeto; 4-em-5 é projeto. Distingue aberta×gutshot
  // pela POSIÇÃO do buraco: buraco nas pontas com carta viva fora = aberta.
  for (let low = 10; low >= 1; low--) {
    const window = [low, low + 1, low + 2, low + 3, low + 4];
    const have = window.filter((r) => present.has(r)).length;
    if (have === 4) {
      // É aberta se as 4 são consecutivas E dá pra estender dos dois lados
      // (nenhuma das 4 nas extremidades absolutas). Senão, é gutshot.
      const miss = window.find((r) => !present.has(r))!;
      const isInnerMiss = miss !== window[0] && miss !== window[4];
      if (isInnerMiss) {
        gutshot = true;
      } else {
        // buraco numa ponta: as outras 4 são seguidas — checa se a run de 4 tem
        // as duas extremidades "vivas" (2..K de um lado ou outro) para ser aberta.
        const run = window.filter((r) => present.has(r)).sort((a, b) => a - b);
        const bottom = run[0];
        const top = run[run.length - 1];
        // aberta de verdade: 4 seguidas com carta possível dos DOIS lados (não A-alto puro nem 2-baixo puro)
        if (top - bottom === 3 && bottom > 1 && top < 14) openEnded = true;
        else gutshot = true;
      }
    }
  }

  if (!flushDraw && !openEnded && !gutshot) return NONE;

  // Força combinada (com bônus de combo). Escala calibrada para o crédito de
  // implied odds ser modesto e nunca dominar a decisão.
  let strength = 0;
  if (flushDraw) strength += 0.9;
  if (openEnded) strength += 0.8;
  else if (gutshot) strength += 0.35;
  strength = Math.min(1, strength); // combo (flush+reta) satura no teto

  return { flushDraw, openEnded, gutshot, strength };
}

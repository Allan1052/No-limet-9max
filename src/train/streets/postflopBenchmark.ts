// ---------------------------------------------------------------------------
// BANCO DE REFERÊNCIA DO PÓS-FLOP — a trava que faltava.
//
// Por que existe: o pré-flop tem 615 spots de referência (SELO GTO + banco
// externo). O PÓS-FLOP — que é o que move o veredito por decisão na tela de
// Review, o diferencial do app — tinha 5 casos de teste, todos no MESMO flop
// (A♠8♦6♣). Uma regressão em qualquer outra textura passaria batido.
//
// O que este banco NÃO é: não é solver, não é gabarito de GTO e não decide
// fronteira. Ele cobre de propósito só o que é INDISCUTÍVEL — o equivalente
// pós-flop de "o BB não pode foldar AK em pote não aberto". São as quatro
// situações em que qualquer jogador, livro ou solver concordam:
//
//   1. lixo enfrentando aposta grande            -> FOLD
//   2. mão muito forte enfrentando aposta        -> NUNCA folda
//   3. ninguém apostou e o herói não tem nada    -> CHECK
//   4. ninguém apostou e o herói tem mão enorme  -> APOSTA
//
// Fronteira (par médio, projeto marginal, blefe por frequência) fica FORA:
// afirmar "certo" onde a teoria mistura seria inventar referência.
// ---------------------------------------------------------------------------
import { cardsFromString, seededRng } from "../../engine/cards";
import {
  analyzeBoard,
  heroBestAction,
  villainCallingRange,
  type BoardState,
  type StreetName,
} from "./dynamicRanges";

/** Família da decisão — mesma ideia do benchmark de pré-flop. */
export type PostflopFamily = "fold" | "aggro" | "naoFolda" | "check";

export interface PostflopSpot {
  /** Tipo de mão ("88", "AKs", "J3o"). */
  hand: string;
  /** Cartas comunitárias em texto ("As8d6c"). */
  board: string;
  street: StreetName;
  /** Aposta que o herói está enfrentando, em bb. 0 = ninguém apostou. */
  facingBB: number;
  potBB: number;
  /** Posição de quem abriu no pré-flop (define o range do vilão). */
  villainPos: string;
  effBB: number;
  expect: PostflopFamily;
  /** Categoria — serve para o relatório de cobertura. */
  categoria: "lixo_vs_aposta" | "monstro_vs_aposta" | "nada_sem_aposta" | "monstro_sem_aposta";
  note: string;
}

/** Traduz a ação do motor para a família. */
export function postflopFamily(action: string): "fold" | "aggro" | "passivo" {
  if (action === "fold") return "fold";
  if (action === "raise" || action.startsWith("bet")) return "aggro";
  return "passivo"; // call, check
}

export function postflopMatches(expect: PostflopFamily, action: string): boolean {
  const fam = postflopFamily(action);
  if (expect === "fold") return fam === "fold";
  if (expect === "aggro") return fam === "aggro";
  if (expect === "check") return action === "check";
  return fam !== "fold"; // "naoFolda": qualquer coisa menos jogar a mão fora
}

// ---------------------------------------------------------------------------
// AS TEXTURAS. Seis boards que cobrem os tipos que o jogador encontra, mais
// duas continuações (turn e river) para o motor não ser testado só no flop.
// ---------------------------------------------------------------------------
const B = {
  secoAlto: "As8d6c", // Ás alto, três naipes — o board mais comum
  conectado: "9s8s7d", // molhado: projetos de sequência e de flush
  monotone: "Kh9h4h", // três do mesmo naipe
  pareado: "QcQd5s", // board pareado
  baixoSeco: "7d4c2s", // baixo, sem nada
  broadway: "KsQdJc", // três cartas altas conectadas
  turnSeco: "As8d6c2h", // turn do board seco
  riverSeco: "As8d6c2h9s", // river do board seco
} as const;

/**
 * O BANCO.
 *
 * As mãos "lixo" foram escolhidas para NÃO formarem par nem projeto naquele
 * board específico — senão o teste testaria outra coisa. As mãos "monstro" são
 * trinca, sequência fechada ou full house, que não dependem de naipe (o motor
 * trabalha com tipo de mão, então mão de flush não é assertível aqui).
 */
export const POSTFLOP_SPOTS: PostflopSpot[] = [
  // ---- 1. LIXO ENFRENTANDO APOSTA GRANDE -> FOLD -------------------------
  { hand: "J3o", board: B.secoAlto, street: "flop", facingBB: 5, potBB: 5.1, villainPos: "BTN", effBB: 40, expect: "fold", categoria: "lixo_vs_aposta", note: "J3o sem nada no A-8-6 vs aposta de pote" },
  { hand: "T2o", board: B.secoAlto, street: "flop", facingBB: 5, potBB: 5.1, villainPos: "CO", effBB: 40, expect: "fold", categoria: "lixo_vs_aposta", note: "T2o sem nada no A-8-6 vs aposta de pote" },
  { hand: "K2o", board: B.conectado, street: "flop", facingBB: 6, potBB: 6.0, villainPos: "BTN", effBB: 40, expect: "fold", categoria: "lixo_vs_aposta", note: "K2o no 9-8-7 vs aposta de pote" },
  { hand: "J3o", board: B.monotone, street: "flop", facingBB: 6, potBB: 6.0, villainPos: "CO", effBB: 40, expect: "fold", categoria: "lixo_vs_aposta", note: "J3o no K-9-4 monotone vs aposta de pote" },
  { hand: "J3o", board: B.pareado, street: "flop", facingBB: 5, potBB: 5.0, villainPos: "BTN", effBB: 40, expect: "fold", categoria: "lixo_vs_aposta", note: "J3o no Q-Q-5 vs aposta de pote" },
  { hand: "J8o", board: B.baixoSeco, street: "flop", facingBB: 5, potBB: 5.0, villainPos: "UTG", effBB: 40, expect: "fold", categoria: "lixo_vs_aposta", note: "J8o no 7-4-2 vs aposta de pote de UTG" },
  { hand: "63o", board: B.broadway, street: "flop", facingBB: 6, potBB: 6.0, villainPos: "CO", effBB: 40, expect: "fold", categoria: "lixo_vs_aposta", note: "63o no K-Q-J vs aposta de pote" },
  { hand: "J3o", board: B.turnSeco, street: "turn", facingBB: 8, potBB: 8.0, villainPos: "BTN", effBB: 40, expect: "fold", categoria: "lixo_vs_aposta", note: "J3o no turn A-8-6-2 vs aposta de pote" },
  { hand: "J3o", board: B.riverSeco, street: "river", facingBB: 12, potBB: 12.0, villainPos: "BTN", effBB: 40, expect: "fold", categoria: "lixo_vs_aposta", note: "J3o no river sem nada vs aposta de pote" },
  { hand: "T2o", board: B.riverSeco, street: "river", facingBB: 12, potBB: 12.0, villainPos: "CO", effBB: 40, expect: "fold", categoria: "lixo_vs_aposta", note: "T2o no river sem nada vs aposta de pote" },

  // ---- 2. MÃO MUITO FORTE ENFRENTANDO APOSTA -> NUNCA FOLDA --------------
  { hand: "88", board: B.secoAlto, street: "flop", facingBB: 1.5, potBB: 5.1, villainPos: "BTN", effBB: 40, expect: "naoFolda", categoria: "monstro_vs_aposta", note: "trinca de 8 no A-8-6 vs aposta" },
  { hand: "66", board: B.secoAlto, street: "flop", facingBB: 3, potBB: 5.1, villainPos: "CO", effBB: 40, expect: "naoFolda", categoria: "monstro_vs_aposta", note: "trinca de 6 no A-8-6 vs aposta" },
  { hand: "AA", board: B.secoAlto, street: "flop", facingBB: 3, potBB: 5.1, villainPos: "BTN", effBB: 40, expect: "naoFolda", categoria: "monstro_vs_aposta", note: "trinca máxima (AA) no A-8-6 vs aposta" },
  { hand: "99", board: B.conectado, street: "flop", facingBB: 4, potBB: 6.0, villainPos: "BTN", effBB: 40, expect: "naoFolda", categoria: "monstro_vs_aposta", note: "trinca de 9 no 9-8-7 vs aposta" },
  { hand: "65s", board: B.conectado, street: "flop", facingBB: 4, potBB: 6.0, villainPos: "CO", effBB: 40, expect: "naoFolda", categoria: "monstro_vs_aposta", note: "sequência fechada (6-5) no 9-8-7 vs aposta" },
  { hand: "KK", board: B.monotone, street: "flop", facingBB: 4, potBB: 6.0, villainPos: "CO", effBB: 40, expect: "naoFolda", categoria: "monstro_vs_aposta", note: "trinca de K no K-9-4 monotone vs aposta" },
  { hand: "55", board: B.pareado, street: "flop", facingBB: 4, potBB: 5.0, villainPos: "BTN", effBB: 40, expect: "naoFolda", categoria: "monstro_vs_aposta", note: "full house (5 no Q-Q-5) vs aposta" },
  { hand: "77", board: B.baixoSeco, street: "flop", facingBB: 4, potBB: 5.0, villainPos: "UTG", effBB: 40, expect: "naoFolda", categoria: "monstro_vs_aposta", note: "trinca de 7 no 7-4-2 vs aposta" },
  { hand: "ATo", board: B.broadway, street: "flop", facingBB: 4, potBB: 6.0, villainPos: "CO", effBB: 40, expect: "naoFolda", categoria: "monstro_vs_aposta", note: "sequência máxima (A-T) no K-Q-J vs aposta" },
  { hand: "88", board: B.turnSeco, street: "turn", facingBB: 6, potBB: 8.0, villainPos: "BTN", effBB: 40, expect: "naoFolda", categoria: "monstro_vs_aposta", note: "trinca de 8 no turn A-8-6-2 vs aposta" },
  { hand: "66", board: B.riverSeco, street: "river", facingBB: 8, potBB: 12.0, villainPos: "BTN", effBB: 40, expect: "naoFolda", categoria: "monstro_vs_aposta", note: "trinca de 6 no river vs aposta" },

  // ---- 3. NINGUÉM APOSTOU E O HERÓI NÃO TEM NADA -> CHECK ----------------
  { hand: "J3o", board: B.secoAlto, street: "flop", facingBB: 0, potBB: 5.1, villainPos: "BTN", effBB: 40, expect: "check", categoria: "nada_sem_aposta", note: "J3o sem nada no A-8-6, mesa limpa" },
  // Atenção ao escolher o "lixo": T2o NÃO serve aqui — o T forma T-9-8-7,
  // projeto de sequência aberto, e o motor semi-blefa com razão. Trocado por
  // K2o, que no 9-8-7 não faz par nem projeto.
  { hand: "K2o", board: B.conectado, street: "flop", facingBB: 0, potBB: 6.0, villainPos: "CO", effBB: 40, expect: "check", categoria: "nada_sem_aposta", note: "K2o no 9-8-7 (sem par, sem projeto), mesa limpa" },
  { hand: "J3o", board: B.monotone, street: "flop", facingBB: 0, potBB: 6.0, villainPos: "CO", effBB: 40, expect: "check", categoria: "nada_sem_aposta", note: "J3o no K-9-4 monotone, mesa limpa" },
  { hand: "J3o", board: B.pareado, street: "flop", facingBB: 0, potBB: 5.0, villainPos: "BTN", effBB: 40, expect: "check", categoria: "nada_sem_aposta", note: "J3o no Q-Q-5, mesa limpa" },
  { hand: "J8o", board: B.baixoSeco, street: "flop", facingBB: 0, potBB: 5.0, villainPos: "UTG", effBB: 40, expect: "check", categoria: "nada_sem_aposta", note: "J8o no 7-4-2, mesa limpa" },
  { hand: "63o", board: B.broadway, street: "flop", facingBB: 0, potBB: 6.0, villainPos: "CO", effBB: 40, expect: "check", categoria: "nada_sem_aposta", note: "63o no K-Q-J, mesa limpa" },
  { hand: "J3o", board: B.turnSeco, street: "turn", facingBB: 0, potBB: 8.0, villainPos: "BTN", effBB: 40, expect: "check", categoria: "nada_sem_aposta", note: "J3o no turn sem nada, mesa limpa" },
  { hand: "J3o", board: B.riverSeco, street: "river", facingBB: 0, potBB: 12.0, villainPos: "BTN", effBB: 40, expect: "check", categoria: "nada_sem_aposta", note: "J3o no river sem nada, mesa limpa" },

  // ---- 4. NINGUÉM APOSTOU E O HERÓI TEM MÃO ENORME -> APOSTA -------------
  { hand: "88", board: B.secoAlto, street: "flop", facingBB: 0, potBB: 5.1, villainPos: "BTN", effBB: 40, expect: "aggro", categoria: "monstro_sem_aposta", note: "trinca de 8 no A-8-6, mesa limpa" },
  { hand: "AA", board: B.secoAlto, street: "flop", facingBB: 0, potBB: 5.1, villainPos: "CO", effBB: 40, expect: "aggro", categoria: "monstro_sem_aposta", note: "trinca máxima no A-8-6, mesa limpa" },
  { hand: "99", board: B.conectado, street: "flop", facingBB: 0, potBB: 6.0, villainPos: "BTN", effBB: 40, expect: "aggro", categoria: "monstro_sem_aposta", note: "trinca de 9 no 9-8-7, mesa limpa" },
  { hand: "65s", board: B.conectado, street: "flop", facingBB: 0, potBB: 6.0, villainPos: "CO", effBB: 40, expect: "aggro", categoria: "monstro_sem_aposta", note: "sequência fechada no 9-8-7, mesa limpa" },
  { hand: "KK", board: B.monotone, street: "flop", facingBB: 0, potBB: 6.0, villainPos: "CO", effBB: 40, expect: "aggro", categoria: "monstro_sem_aposta", note: "trinca de K no monotone, mesa limpa" },
  { hand: "55", board: B.pareado, street: "flop", facingBB: 0, potBB: 5.0, villainPos: "BTN", effBB: 40, expect: "aggro", categoria: "monstro_sem_aposta", note: "full house no Q-Q-5, mesa limpa" },
  { hand: "77", board: B.baixoSeco, street: "flop", facingBB: 0, potBB: 5.0, villainPos: "UTG", effBB: 40, expect: "aggro", categoria: "monstro_sem_aposta", note: "trinca de 7 no 7-4-2, mesa limpa" },
  { hand: "ATo", board: B.broadway, street: "flop", facingBB: 0, potBB: 6.0, villainPos: "CO", effBB: 40, expect: "aggro", categoria: "monstro_sem_aposta", note: "sequência máxima no K-Q-J, mesa limpa" },
  { hand: "88", board: B.turnSeco, street: "turn", facingBB: 0, potBB: 8.0, villainPos: "BTN", effBB: 40, expect: "aggro", categoria: "monstro_sem_aposta", note: "trinca de 8 no turn, mesa limpa" },
  { hand: "66", board: B.riverSeco, street: "river", facingBB: 0, potBB: 12.0, villainPos: "BTN", effBB: 40, expect: "aggro", categoria: "monstro_sem_aposta", note: "trinca de 6 no river, mesa limpa" },
];

export interface PostflopBenchResult {
  total: number;
  matched: number;
  score: number;
  misses: Array<{ note: string; expect: PostflopFamily; got: string; equity: number }>;
  porCategoria: Record<string, { total: number; matched: number }>;
  texturas: string[];
  ruas: string[];
}

/**
 * Roda o banco. `seed` fixo porque a equity é calculada por Monte Carlo: sem
 * semente o mesmo spot poderia dar resultados diferentes entre execuções e o
 * teste ficaria instável (e um teste instável acaba sendo ignorado).
 */
export function runPostflopBenchmark(
  spots: PostflopSpot[] = POSTFLOP_SPOTS,
  seed = 20260911,
): PostflopBenchResult {
  const misses: PostflopBenchResult["misses"] = [];
  const porCategoria: PostflopBenchResult["porCategoria"] = {};
  let matched = 0;

  for (const spot of spots) {
    const board: BoardState = { street: spot.street, cards: cardsFromString(spot.board) };
    const textura = analyzeBoard(board);
    const range = villainCallingRange(spot.villainPos, spot.effBB);
    const d = heroBestAction(
      spot.hand,
      board,
      spot.facingBB,
      spot.potBB,
      textura,
      range,
      3000, // iterações altas: o banco roda uma vez, precisão vale mais que tempo
      seededRng(seed),
    );
    const ok = postflopMatches(spot.expect, d.action);
    if (ok) matched++;
    else misses.push({ note: spot.note, expect: spot.expect, got: d.action, equity: Math.round(d.equity * 100) / 100 });

    const c = (porCategoria[spot.categoria] ??= { total: 0, matched: 0 });
    c.total++;
    if (ok) c.matched++;
  }

  return {
    total: spots.length,
    matched,
    score: spots.length ? matched / spots.length : 0,
    misses,
    porCategoria,
    texturas: Array.from(new Set(spots.map((s) => s.board))),
    ruas: Array.from(new Set(spots.map((s) => s.street))),
  };
}

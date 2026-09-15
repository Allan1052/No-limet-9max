// ---------------------------------------------------------------------------
// PLANO DE MÃO — o bot deixa de decidir cada rua do zero.
//
// ✨ 15/09/2026. Foi a segunda coisa que a medição dos 70 torneios mostrou: o
// jogador via a carta de graça em 72% a 79% das ruas nas faixas baixas. Os bots
// apostavam o flop e sumiam no turn.
//
// A causa é de arquitetura: cada rua era uma decisão independente, sorteada
// contra uma frequência fixa do perfil (`barrelTurn`). Um jogador de verdade
// não joga assim. Quando ele aposta o flop com um blefe, ele já sabe em que
// turn vai seguir e em que turn vai desistir. É essa intenção que falta.
//
// Aqui o plano não é um estado guardado (que complicaria o motor e o replay):
// é uma LEITURA DA CARTA QUE VEIO. A pergunta que o reg faz no turn é sempre a
// mesma — "essa carta ajuda a história que eu estou contando?" — e ela pode ser
// respondida olhando o board.
//
// Referência de tamanho: em MTT, quando se segue no turn, a aposta costuma ser
// MAIOR que a do flop (55%-100% do pote), porque o range está mais polarizado e
// o que se quer é alavancagem.                                   [bbzpoker]
// ---------------------------------------------------------------------------

import { rankOf, suitOf, type Card } from "../engine/cards";

export interface LeituraDaCarta {
  /** Multiplicador do barrel de BLEFE nesta rua (1 = neutro). */
  blefe: number;
  /** Multiplicador do barrel de VALOR nesta rua. */
  valor: number;
  /** O que a carta fez — para a narração e para os testes. */
  motivo:
    | "carta alta a meu favor"
    | "completou naipe"
    | "completou sequência"
    | "pareou o board"
    | "carta neutra"
    | "sem leitura";
}

const NEUTRA: LeituraDaCarta = { blefe: 1, valor: 1, motivo: "carta neutra" };

/**
 * Como a carta nova (turn ou river) muda a vontade de seguir apostando.
 *
 * `board` é o board COMPLETO da rua atual; a carta nova é a última.
 */
export function lerCartaNova(board: Card[]): LeituraDaCarta {
  if (board.length < 4) return { ...NEUTRA, motivo: "sem leitura" };
  const nova = board[board.length - 1];
  const antes = board.slice(0, board.length - 1);
  const rNova = rankOf(nova);
  const ranksAntes = antes.map(rankOf);

  // 1) Pareou o board. Mata projetos e assusta quem tinha par: bom para blefar,
  //    e quem já tinha mão feita perde valor (o adversário larga mais).
  if (ranksAntes.includes(rNova)) {
    return { blefe: 1.25, valor: 0.85, motivo: "pareou o board" };
  }

  // 2) Completou naipe (3+ do mesmo naipe no board). A história fica FÁCIL de
  //    contar — mas quem paga costuma ter o naipe, então o valor cai.
  const naipes = board.map(suitOf);
  const contagem = [0, 0, 0, 0];
  for (const n of naipes) contagem[n]++;
  const temFlushNoBoard = contagem.some((c) => c >= 3);
  const naipeNovoFecha = contagem[suitOf(nova)] >= 3;
  if (temFlushNoBoard && naipeNovoFecha) {
    return { blefe: 1.4, valor: 0.7, motivo: "completou naipe" };
  }

  // 3) Completou sequência óbvia (4 cartas dentro de uma janela de 5 ranks).
  const unicos = [...new Set(board.map(rankOf))].sort((a, b) => a - b);
  let sequencial = false;
  for (let i = 0; i + 3 < unicos.length; i++) {
    if (unicos[i + 3] - unicos[i] <= 4) { sequencial = true; break; }
  }
  if (sequencial) {
    return { blefe: 1.15, valor: 0.75, motivo: "completou sequência" };
  }

  // 4) Carta ALTA que não estava no flop: favorece quem abriu o pote (o range
  //    do agressor tem mais A/K/Q). É o turn clássico de segunda barrelada.
  if (rNova >= 12 && rNova > Math.max(...ranksAntes)) {
    return { blefe: 1.45, valor: 1.1, motivo: "carta alta a meu favor" };
  }

  return NEUTRA;
}

/**
 * Tamanho da aposta de continuação, como fração do pote.
 *
 * Em torneio, seguir no turn pede aposta MAIOR que a do flop — o range já está
 * polarizado e o objetivo é alavancagem (55%-100% do pote). Antes o tamanho não
 * crescia rua a rua, e uma segunda barrelada barata é fácil demais de pagar.
 */
export function tamanhoDeContinuacao(streetIdx: number, base: number, polarizado: boolean): number {
  if (streetIdx === 0) return base;
  const piso = streetIdx === 1 ? 0.55 : 0.6;
  const teto = polarizado ? 1.0 : 0.8;
  return Math.max(piso, Math.min(teto, base * (streetIdx === 1 ? 1.25 : 1.35)));
}

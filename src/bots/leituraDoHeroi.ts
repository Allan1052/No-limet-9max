// ---------------------------------------------------------------------------
// "ELE TE LEU" — a leitura que o bot faz de você, dita em voz alta.
//
// ✨ 15/09/2026, do pedido do Allan: *"pense em algo para inovar os bots"*.
//
// A adaptação já existia (bots/adapt.ts): o bot lê o seu VPIP/PFR/3-bet e passa
// a roubar mais, blefar menos, abrir mais largo. O problema é que ela é
// INVISÍVEL. O jogador não faz ideia de que está sendo estudado — e por isso a
// mesa parece um cenário, não um adversário.
//
// Aqui a leitura ganha duas coisas que faltavam:
//
//   1. PÓS-FLOP. Antes o bot só olhava o pré-flop. Quem folda 8 de cada 10
//      flops é o alvo mais explorável de uma mesa, e nenhum bot percebia.
//
//   2. VOZ. A leitura vira uma frase curta, exibida ao fim da mão: "o Furacão
//      reparou que você larga quase todo flop — ele vai apostar mais em você".
//      É o que transforma o campo em gente. E é honesto: a frase só sai quando
//      a adaptação REALMENTE mudou o comportamento dele, e com amostra.
//
// ⚠️ Regra de ouro: o bot lê o HISTÓRICO do jogador, nunca as cartas dele. Isso
// continua valendo — nada aqui espia mão fechada.
// ---------------------------------------------------------------------------

import type { BotProfile } from "./profiles";

/** O que o app observou do jogador nesta sessão. */
export interface DossieDoHeroi {
  /** Mãos observadas. */
  maos: number;
  vpip: number;
  pfr: number;
  threeBet: number;
  /** Vezes que ele enfrentou aposta no flop. */
  flopsComAposta: number;
  /** Dessas, quantas ele largou. */
  flopsLargados: number;
  /** Vezes que ele passou e enfrentou aposta pós-flop. */
  passouEEnfrentou: number;
  /** Dessas, quantas ele aumentou (check-raise dele). */
  checkRaisesDele: number;
}

export function dossieVazio(): DossieDoHeroi {
  return {
    maos: 0, vpip: 0, pfr: 0, threeBet: 0,
    flopsComAposta: 0, flopsLargados: 0,
    passouEEnfrentou: 0, checkRaisesDele: 0,
  };
}

export interface LeituraFalada {
  /** Chave estável da leitura (para não repetir a mesma frase toda hora). */
  id: string;
  /** A frase, do jeito que vai para a tela. */
  texto: string;
  /** O que muda no jogo dele a partir de agora. */
  consequencia: string;
}

/** Amostra mínima por tipo de leitura: abaixo disso é coincidência. */
const MIN_MAOS = 25;
const MIN_FLOPS = 8;

/**
 * A leitura mais forte que este bot tem sobre o jogador, ou `null`.
 *
 * Só fala quem tem cabeça para ler: `skill` baixo devolve null — peixe não
 * estuda ninguém, e fazer o peixe falar como reg quebraria a mesa.
 */
export function lerOHeroi(
  p: BotProfile,
  d: DossieDoHeroi,
  nomeDoBot: string,
): LeituraFalada | null {
  if (p.skill < 0.6 || d.maos < MIN_MAOS) return null;

  const foldFlop = d.flopsComAposta >= MIN_FLOPS ? d.flopsLargados / d.flopsComAposta : null;

  // 1) Larga flop demais — a leitura mais lucrativa que existe numa mesa.
  if (foldFlop !== null && foldFlop >= 0.68) {
    return {
      id: "folda-flop",
      texto: `${nomeDoBot} reparou que você larga ${Math.round(foldFlop * 100)}% dos flops em que leva aposta.`,
      consequencia: "Ele vai apostar mais em você — inclusive sem mão.",
    };
  }

  // 2) Nunca aumenta depois de passar: dá para apostar sem medo contra ele.
  if (d.passouEEnfrentou >= MIN_FLOPS && d.checkRaisesDele === 0) {
    return {
      id: "nunca-check-raise",
      texto: `${nomeDoBot} viu que você nunca aumenta depois de passar.`,
      consequencia: "Quando você passar, ele aposta — sabe que não vai levar aumento.",
    };
  }

  // 3) Apertado demais: rouba os blinds dele.
  if (d.vpip < 0.16) {
    return {
      id: "muito-apertado",
      texto: `${nomeDoBot} percebeu que você só joga ${Math.round(d.vpip * 100)}% das mãos.`,
      consequencia: "Ele vai abrir mais largo quando você estiver nos blinds.",
    };
  }

  // 4) Solto e passivo: ele para de blefar e passa a apostar valor fino.
  if (d.vpip > 0.34 && d.vpip - d.pfr > 0.16) {
    return {
      id: "solto-passivo",
      texto: `${nomeDoBot} notou que você entra em muita mão e raramente aumenta.`,
      consequencia: "Ele vai parar de blefar em você e apostar mais mão média por valor.",
    };
  }

  // 5) Não defende com 3-bet: abre mais largo.
  if (d.maos >= 40 && d.threeBet < 0.03) {
    return {
      id: "nao-3beta",
      texto: `${nomeDoBot} viu que você quase não re-aumenta no pré-flop.`,
      consequencia: "Ele vai abrir mãos piores sabendo que sai barato.",
    };
  }

  return null;
}

/** Atualiza o dossiê com o que aconteceu numa ação do herói. */
export function anotar(
  d: DossieDoHeroi,
  evento:
    | { tipo: "flopComAposta"; largou: boolean }
    | { tipo: "passouEEnfrentou"; aumentou: boolean },
): DossieDoHeroi {
  if (evento.tipo === "flopComAposta") {
    return {
      ...d,
      flopsComAposta: d.flopsComAposta + 1,
      flopsLargados: d.flopsLargados + (evento.largou ? 1 : 0),
    };
  }
  return {
    ...d,
    passouEEnfrentou: d.passouEEnfrentou + 1,
    checkRaisesDele: d.checkRaisesDele + (evento.aumentou ? 1 : 0),
  };
}

// ---------------------------------------------------------------------------
// Modelo do CAMPO do torneio (o mundo além da mesa do herói).
//
// O herói joga numa mesa de 9, mas o torneio tem centenas/milhares de inscritos.
// Aqui simulamos, de forma transparente, o campo global encolhendo à medida que
// as mãos passam (gente bustando em todas as mesas), estimamos a CLASSIFICAÇÃO
// do herói pelo tamanho do stack, e sabemos quando estoura a BOLHA (entrar no
// dinheiro) e quanto ele receberia (ITM) se parasse agora.
//
// Tudo é puro e testável. As fórmulas são heurísticas realistas, não solver.
// ---------------------------------------------------------------------------

import type { Stage } from "./structure";

export interface FieldStatus {
  entrants: number;
  remaining: number; // jogadores ainda vivos no torneio inteiro
  paidPlaces: number; // lugares pagos (ITM)
  inMoney: boolean; // o herói já garantiu premiação?
  toBubble: number; // quantos precisam bustar até o dinheiro (0 se já ITM)
  heroRank: number; // classificação estimada (1 = chip leader)
  currentCash: number; // prêmio garantido se bustar agora (0 se fora do dinheiro)
}

/** Nº de vivos ao ENTRAR no estágio escolhido (ponto de partida do campo). */
export function initialFieldRemaining(entrants: number, stage: Stage, paidPlaces: number): number {
  switch (stage) {
    case "inicio":
      return entrants;
    case "meio":
      return Math.max(paidPlaces + 2, Math.round(entrants * 0.4));
    case "bolha":
      // Logo ACIMA do dinheiro (a tensão da bolha).
      return Math.max(2, paidPlaces + Math.max(1, Math.round(paidPlaces * 0.06)));
    case "mesa_final":
      return Math.min(entrants, 9);
  }
}

/**
 * Fração do campo que busta por mão do herói. Cresce com o nível de blind
 * (mais gente all-in, torneio acelera). Zera perto da mesa final — daí as
 * eliminações passam a vir da própria mesa do herói.
 */
export function attritionPerHand(remaining: number, levelIndex: number): number {
  if (remaining <= 9) return 0;
  const rate = 0.008 + 0.006 * levelIndex;
  return remaining * rate;
}

/**
 * Classificação estimada do herói: fração do campo com MAIS fichas que ele,
 * assumindo stacks distribuídos exponencialmente em torno da média (modelo
 * simples e intuitivo). Stack grande → perto do 1º; stack curto → perto do fim.
 */
export function estimateHeroRank(remaining: number, heroStack: number, avgStack: number): number {
  if (remaining <= 1) return 1;
  if (avgStack <= 0 || heroStack <= 0) return remaining;
  const fracAhead = Math.exp(-heroStack / avgStack);
  return Math.min(remaining, Math.max(1, Math.round(remaining * fracAhead)));
}

export function fieldStatus(args: {
  entrants: number;
  remaining: number;
  heroStack: number;
  avgStack: number;
  ladder: number[];
}): FieldStatus {
  const remaining = Math.max(1, Math.round(args.remaining));
  const paid = args.ladder.length; // lugares realmente pagos pela escada
  const inMoney = remaining <= paid;
  const heroRank = estimateHeroRank(remaining, args.heroStack, args.avgStack);
  let currentCash = 0;
  if (inMoney) {
    const idx = Math.min(args.ladder.length - 1, remaining - 1);
    currentCash = args.ladder[idx] ?? 0;
  }
  return {
    entrants: args.entrants,
    remaining,
    paidPlaces: paid,
    inMoney,
    toBubble: inMoney ? 0 : remaining - paid,
    heroRank,
    currentCash,
  };
}

/** Prêmio ($) por posição final (1-indexada). 0 se fora do dinheiro. */
export function cashForPlace(place: number, ladder: number[]): number {
  if (place < 1 || place > ladder.length) return 0;
  return ladder[place - 1] ?? 0;
}

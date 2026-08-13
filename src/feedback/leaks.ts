// ---------------------------------------------------------------------------
// TREINO DIRIGIDO (parte 1) — Detector de VAZAMENTOS (leaks).
//
// A cada decisão sua, o coach já grava um FeedbackItem (o que você fez × o
// recomendado + nota). Aqui a gente OLHA o conjunto dessas decisões e encontra
// os ERROS RECORRENTES — não uma jogada isolada, mas o padrão ("você paga
// 3-bet largo demais", "blefa demais no pós-flop"). É o insumo pro professor
// pessoal: primeiro descobrir a fraqueza, depois treinar só ela.
//
// Módulo PURO (sem estado do jogo, sem UI): recebe FeedbackItems, devolve os
// vazamentos rankeados. A ligação com histórico/UI/drills vem depois.
// ---------------------------------------------------------------------------

import type { FeedbackItem, Family } from "./analyzer";

export interface Leak {
  id: string;
  /** Título curto do vazamento, pro jogador reconhecer. */
  title: string;
  /** Dica de correção — o que fazer diferente. */
  tip: string;
  /** Quantas vezes esse erro apareceu. */
  count: number;
  /** Quantos foram erro CLARO ("ruim", não só "imprecisa"). */
  badCount: number;
  /** Peso pro ranking: erro claro conta dobrado. */
  severity: number;
}

interface LeakDef {
  id: string;
  title: string;
  tip: string;
  /** Casa o vazamento pelo tipo de spot e pelas famílias de ação (o que você
   *  fez × o recomendado) — sem depender de texto/rótulo. */
  match: (kind: string | undefined, hero: Family, advice: Family) => boolean;
}

const LEAK_DEFS: LeakDef[] = [
  // ---- Pré-flop ----
  {
    id: "loose_preflop",
    title: "Entra com mão fraca (pré-flop)",
    tip: "Contra agressão, a maioria das mãos folda. Aperte o range de entrada — só continue com mãos que aguentam pressão.",
    match: (k, h, a) => k === "preflop" && (h === "call" || h === "aggro") && a === "fold",
  },
  {
    id: "tight_preflop",
    title: "Folda mão jogável (pré-flop)",
    tip: "Você desiste de mãos que valiam continuar. Nas posições certas, amplie o range em vez de foldar.",
    match: (k, h, a) => k === "preflop" && h === "fold" && (a === "call" || a === "aggro"),
  },
  {
    id: "passive_preflop",
    title: "Passivo no pré-flop (paga quando era aumentar)",
    tip: "Com mãos fortes, aumentar ganha valor e iniciativa. Só pagar deixa o pote pequeno e o vilão barato.",
    match: (k, h, a) => k === "preflop" && h === "call" && a === "aggro",
  },
  {
    id: "overaggro_preflop",
    title: "Agressivo demais no pré-flop",
    tip: "Aumentar mãos marginais infla o pote, muitas vezes fora de posição. Prefira pagar ou foldar essas mãos.",
    match: (k, h, a) => k === "preflop" && h === "aggro" && a === "call",
  },
  // ---- Pós-flop ----
  {
    id: "loose_call_postflop",
    title: "Paga apostas sem equity (pós-flop)",
    tip: "Sua chance de ganhar não paga o preço. Sem par forte ou projeto grande, foldar é o certo.",
    match: (k, h, a) => k === "postflop" && h === "call" && a === "fold",
  },
  {
    id: "overfold_postflop",
    title: "Desiste cedo demais (pós-flop)",
    tip: "Você tinha equity e preço pra continuar. Não largue mão com chance real de ganhar.",
    match: (k, h, a) => k === "postflop" && h === "fold" && (a === "call" || a === "aggro"),
  },
  {
    id: "overbet_bluff_postflop",
    title: "Aposta/blefa demais (pós-flop)",
    tip: "Nem toda mão quer apostar. Sem valor claro nem blefe rentável, o check é a jogada.",
    match: (k, h, a) => k === "postflop" && h === "aggro" && (a === "check" || a === "call"),
  },
  {
    id: "missed_value_postflop",
    title: "Perde valor com mão forte (pós-flop)",
    tip: "Com mão de valor, apostar/aumentar extrai fichas. Check/call deixa dinheiro na mesa.",
    match: (k, h, a) => k === "postflop" && (h === "call" || h === "check") && a === "aggro",
  },
];

/**
 * Encontra os vazamentos no conjunto de decisões (só ERROS — imprecisa/ruim —
 * em que a família da sua ação difere da recomendada), rankeados por gravidade.
 */
export function detectLeaks(items: FeedbackItem[]): Leak[] {
  const acc = new Map<string, Leak>();
  for (const it of items) {
    if (it.rating !== "imprecisa" && it.rating !== "ruim") continue; // só erros
    if (it.heroFam === undefined || it.adviceFam === undefined) continue; // sem dados
    if (it.heroFam === it.adviceFam) continue; // mesma família não é vazamento direcional
    const def = LEAK_DEFS.find((d) => d.match(it.kind, it.heroFam!, it.adviceFam!));
    if (!def) continue;
    const cur =
      acc.get(def.id) ?? { id: def.id, title: def.title, tip: def.tip, count: 0, badCount: 0, severity: 0 };
    cur.count += 1;
    if (it.rating === "ruim") cur.badCount += 1;
    cur.severity = cur.badCount * 2 + (cur.count - cur.badCount);
    acc.set(def.id, cur);
  }
  return [...acc.values()].sort((a, b) => b.severity - a.severity || b.count - a.count);
}

/** Os N maiores vazamentos (pro painel "Seus pontos fracos"). */
export function topLeaks(items: FeedbackItem[], n = 3): Leak[] {
  return detectLeaks(items).slice(0, n);
}

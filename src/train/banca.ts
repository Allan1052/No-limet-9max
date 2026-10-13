// ---------------------------------------------------------------------------
// A BANCA — a regra de gestão que o app PASSA A IMPOR.
//
// 13/10/2026. Pedido do Allan: *"colocar lá como se eu tivesse 300 de ficha.
// Esse 300 vai representar minha banca lá no PokerStars. E através desse 300 eu
// segui a regra, o app vai impor que eu seguisse a regra certinho. Eles
// estipulam 100 buy-ins. Então eu podia me inscrever no torneio de 3 dólares no
// máximo. Gradativamente, conforme eu fosse subindo, eu podia ir para os
// torneios mais caros."*
//
// É a terceira peça da mesma história: o histórico mostrou que ele sobrevive
// bem e acumula mal. Acumular não é só dentro da mão — é também não devolver a
// banca inteira num buy-in que ela não aguenta.
//
// ---------------------------------------------------------------------------
// A REGRA, E O QUE O HISTÓRICO DELE DIZ SOBRE ELA
//
// A regra pedida é a de bolso do MTT: 100 buy-ins de reserva. É a que ele vai
// usar na vida real, então é a que o app impõe.
//
// ⚠️ Mas o número MEDIDO no histórico dele é outro, e é maior: o SharkScope
// aponta banca necessária de **834 buy-ins** para o Allan1052 e **510** para o
// bbru156 (que tem ROI 7,6× maior — ROI alto reduz risco de ruína). 100 é
// confortável para um app de estudo, onde não há dinheiro real e o que importa
// é o HÁBITO; não é a margem que a variância dele exigiria com dinheiro de
// verdade. A tela diz isso em vez de esconder.
//
// ---------------------------------------------------------------------------
// POR QUE OS BUY-INS PEQUENOS PRECISARAM EXISTIR
//
// Com $300 e 100 buy-ins, o teto é $3 — e o menor torneio do app era $5. A
// regra tornaria o app INJOGÁVEL no dia 1. Por isso entraram $1, $2 e $3 em
// `tournament/structure.ts`, que são buy-ins reais de micro online.
// ---------------------------------------------------------------------------

import { BUY_INS } from "../tournament/structure";

/** O que o Allan pediu: começar com $300. */
export const BANCA_INICIAL = 300;

/** A regra: quantos buy-ins a banca precisa cobrir para liberar a inscrição. */
export const BUYINS_DE_RESERVA = 100;

/**
 * O que a variância MEDIDA dos dois históricos exige, para a tela poder ser
 * honesta sobre a diferença entre a regra de bolso e o número real.
 */
export const RESERVA_MEDIDA_ALLAN = 834;
export const RESERVA_MEDIDA_IRMAO = 510;

const KEY = "cof-banca-v1";

export interface Banca {
  versao: 1;
  saldo: number;
  /** O maior saldo já alcançado — a marca que ele persegue. */
  pico: number;
  /** Com quanto começou, para medir o crescimento. */
  inicio: number;
  criadaEm: string;
  /** Inscrições feitas, total investido e total recebido. */
  inscricoes: number;
  investido: number;
  premios: number;
}

function agora(): string {
  return new Date().toISOString();
}

/** O menor buy-in que existe no app. Abaixo dele, a banca não joga nada. */
export function menorBuyIn(): number {
  return BUY_INS.reduce((min, b) => Math.min(min, b.value), Infinity);
}

/** O teto da banca: o buy-in mais caro que a regra libera. */
export function tetoDaBanca(saldo: number): number {
  return saldo / BUYINS_DE_RESERVA;
}

/** A regra, no singular: este buy-in está liberado para este saldo? */
export function liberado(buyIn: number, saldo: number): boolean {
  return buyIn <= tetoDaBanca(saldo) + 1e-9;
}

/** Quanto falta de banca para liberar este buy-in. 0 quando já está liberado. */
export function faltaParaLiberar(buyIn: number, saldo: number): number {
  return Math.max(0, buyIn * BUYINS_DE_RESERVA - saldo);
}

/** O buy-in mais caro liberado agora, ou `undefined` se a banca quebrou. */
export function melhorBuyInLiberado(saldo: number): number | undefined {
  const liberados = BUY_INS.map((b) => b.value).filter((v) => liberado(v, saldo));
  return liberados.length ? Math.max(...liberados) : undefined;
}

/**
 * QUEBROU: a banca não cobre nem o menor torneio do app.
 * Não é game over — é o momento de recomeçar e, de preferência, entender por quê.
 */
export function quebrou(saldo: number): boolean {
  return !liberado(menorBuyIn(), saldo);
}

export function bancaNova(inicio = BANCA_INICIAL): Banca {
  return {
    versao: 1,
    saldo: inicio,
    pico: inicio,
    inicio,
    criadaEm: agora(),
    inscricoes: 0,
    investido: 0,
    premios: 0,
  };
}

export function carregarBanca(): Banca | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const b = JSON.parse(raw) as Banca;
    if (!b || b.versao !== 1 || typeof b.saldo !== "number") return null;
    return b;
  } catch {
    return null;
  }
}

export function salvarBanca(b: Banca): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(b));
  } catch {
    /* sem storage a banca não persiste — o app continua funcionando */
  }
}

/** Abre (ou reabre) a banca. Só por ação explícita do jogador. */
export function comecarBanca(inicio = BANCA_INICIAL): Banca {
  const b = bancaNova(inicio);
  salvarBanca(b);
  return b;
}

/** Desliga a regra: sem banca, o app volta a liberar tudo (como antes). */
export function desligarBanca(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* idem */
  }
}

/**
 * Debita a inscrição. Devolve `null` quando a regra NÃO permite — e aí o
 * torneio não deve começar. É aqui que o app "impõe", em vez de só avisar.
 */
export function debitarInscricao(buyIn: number): Banca | null {
  const b = carregarBanca();
  if (!b) return null; // sem banca ligada, não há nada a impor
  if (!liberado(buyIn, b.saldo)) return null;
  const nova: Banca = {
    ...b,
    saldo: b.saldo - buyIn,
    inscricoes: b.inscricoes + 1,
    investido: b.investido + buyIn,
  };
  salvarBanca(nova);
  return nova;
}

/**
 * Credita o prêmio no fim do torneio. `premio` 0 é chamada válida e esperada —
 * a maioria dos torneios termina sem prêmio, e a inscrição já foi debitada.
 */
export function creditarPremio(premio: number): Banca | null {
  const b = carregarBanca();
  if (!b) return null;
  const saldo = b.saldo + Math.max(0, premio);
  const nova: Banca = {
    ...b,
    saldo,
    pico: Math.max(b.pico, saldo),
    premios: b.premios + Math.max(0, premio),
  };
  salvarBanca(nova);
  return nova;
}

export interface RetratoDaBanca {
  saldo: number;
  pico: number;
  inicio: number;
  /** Crescimento sobre o início, em fração (0,25 = +25%). */
  crescimento: number;
  /** O buy-in mais caro liberado, e o próximo degrau da escada. */
  teto?: number;
  proximo?: { buyIn: number; falta: number };
  quebrou: boolean;
  inscricoes: number;
  /** Resultado acumulado: prêmios − investido. */
  liquido: number;
}

export function retratoDaBanca(b: Banca): RetratoDaBanca {
  const teto = melhorBuyInLiberado(b.saldo);
  const acima = BUY_INS.map((x) => x.value)
    .filter((v) => !liberado(v, b.saldo))
    .sort((a, c) => a - c);
  const proximoBuyIn = acima[0];
  return {
    saldo: b.saldo,
    pico: b.pico,
    inicio: b.inicio,
    crescimento: b.inicio > 0 ? (b.saldo - b.inicio) / b.inicio : 0,
    teto,
    proximo:
      proximoBuyIn !== undefined
        ? { buyIn: proximoBuyIn, falta: faltaParaLiberar(proximoBuyIn, b.saldo) }
        : undefined,
    quebrou: quebrou(b.saldo),
    inscricoes: b.inscricoes,
    liquido: b.premios - b.investido,
  };
}

// ---------------------------------------------------------------------------
// SALDO DA MÃO — quanto você realmente ganhou ou perdeu nela.
//
// 🐞 15/09/2026, relato do Allan: *"no histórico de mãos até as mãos que foldo,
// mostra que perdi"*.
//
// A tela olhava só `winningsBySeat`: se o herói não levou fichas, escrevia
// "Perdeu". Só que foldar no pré-flop sem pôr uma ficha não é perder — é não
// disputar. E `winningsBySeat` sozinho também engana do outro lado: ele é
// BRUTO, então quem paga 10 e leva 10 aparece com "+10" tendo empatado.
//
// O saldo honesto é: o que você LEVOU menos o que você PÔS.
// ---------------------------------------------------------------------------

import type { HandHistory } from "./replay";

export interface SaldoDaMao {
  /** Saldo em big blinds. Positivo = ganhou, negativo = perdeu. */
  bb: number;
  /** Ele chegou a pôr alguma ficha nesta mão? */
  investiu: boolean;
  /** Saldo pequeno demais para valer uma linha na tela (|bb| < 0.05). */
  neutro: boolean;
}

/** Quanto o herói investiu nesta mão, em fichas. */
function investidoPeloHeroi(h: HandHistory): number {
  let maior = 0;
  for (const ev of h.events) {
    const snap = ev.seats?.[h.heroSeat];
    if (snap && snap.totalCommitted > maior) maior = snap.totalCommitted;
  }
  return maior;
}

export function saldoDaMao(h: HandHistory): SaldoDaMao {
  const bbFichas = h.bigBlind || 1;
  const levou = h.result?.winningsBySeat[h.heroSeat] ?? 0;
  const investiu = investidoPeloHeroi(h);
  const bb = (levou - investiu) / bbFichas;
  return {
    bb: Math.round(bb * 10) / 10,
    investiu: investiu > 0,
    neutro: Math.abs(bb) < 0.05,
  };
}

/** O rótulo que vai para a tela — ou `null` quando não há resultado a contar. */
export function rotuloDoSaldo(h: HandHistory): { texto: string; ganhou: boolean } | null {
  const s = saldoDaMao(h);
  if (s.neutro) {
    // Nem ganhou nem perdeu. Se não pôs ficha nenhuma, a mão nem foi disputada.
    return s.investiu ? null : { texto: "não disputou", ganhou: false };
  }
  return {
    texto: `${s.bb > 0 ? "+" : "−"}${Math.abs(s.bb)}bb`,
    ganhou: s.bb > 0,
  };
}

// ---------------------------------------------------------------------------
// O TAMANHO DA MESA — 8 ou 9 cadeiras, por escolha.
//
// 17/10/2026. O Allan notou jogando que as mesas estavam vindo com 8 lugares e
// pediu para padronizar o app em 8. Antes de mexer, fui medir — e a conclusão
// foi outra:
//
//   - GGPoker: 8-max é mesmo comum nos MTTs (confirmado em cobertura de evento);
//   - PokerStars (onde ele joga): os MTTs REGULARES seguem 9-max; 8-max aparece
//     em Turbo e PKO;
//   - e o SharkScope dele diz que **50,3% do volume dele é turbo**.
//
// Ou seja: ele vê 8 cadeiras em metade dos torneios que joga, sem que nada
// tenha "padronizado". Fixar o app em 8 trocaria um erro por outro — ficaria
// errado justamente nos regulares. Por isso virou ESCOLHA, não constante.
//
// ⚠️ O que torna isto barato: `ranges/positions.ts` já atribui as posições a
// partir do botão, pelo número de jogadores presentes. Com 8 na mesa ele
// simplesmente não usa a posição mais early (UTG) e começa em UTG1 — sozinho.
// E o SELO GTO valida RANGE POR POSIÇÃO, não por cadeira: os 61/61 valem nos
// dois tamanhos.
// ---------------------------------------------------------------------------

export type TamanhoDaMesa = 8 | 9;

export const TAMANHOS: TamanhoDaMesa[] = [8, 9];
export const TAMANHO_PADRAO: TamanhoDaMesa = 9;

const KEY = "cof-mesa-tamanho-v1";

export function ehTamanhoValido(n: unknown): n is TamanhoDaMesa {
  return n === 8 || n === 9;
}

/** O tamanho que o jogador escolheu da última vez. */
export function tamanhoPreferido(): TamanhoDaMesa {
  try {
    const raw = localStorage.getItem(KEY);
    const n = raw ? Number(raw) : NaN;
    return ehTamanhoValido(n) ? n : TAMANHO_PADRAO;
  } catch {
    return TAMANHO_PADRAO;
  }
}

export function salvarTamanhoPreferido(n: TamanhoDaMesa): void {
  try {
    localStorage.setItem(KEY, String(n));
  } catch {
    /* sem storage: vale só para esta sessão */
  }
}

/** Quantos BOTS entram na mesa — o herói é sempre o assento que sobra. */
export function botsNaMesa(tamanho: TamanhoDaMesa): number {
  return tamanho - 1;
}

/**
 * Como o app descreve o formato, para a tela e para os cards.
 * O rótulo é o que o jogador reconhece do lobby.
 */
export function rotuloDoTamanho(n: TamanhoDaMesa): string {
  return `${n}-max`;
}

/**
 * Onde cada tamanho é a realidade, medido/pesquisado em 17/10/2026. A tela usa
 * isto para o jogador escolher com contexto em vez de adivinhar.
 */
export function ondeSeUsa(n: TamanhoDaMesa): string {
  return n === 8
    ? "Como no GGPoker e nos Turbo/PKO do PokerStars"
    : "Como nos MTTs regulares do PokerStars";
}

// ---------------------------------------------------------------------------
// ICM (Independent Chip Model) — real.
//
// Em torneio, fichas não valem dinheiro linearmente: dobrar seu stack não
// dobra seu valor em $, porque só os primeiros lugares pagam. O ICM estima
// quanto de PRÊMIO ($) cada stack vale, a partir da distribuição de lugares.
//
// Usamos o modelo clássico Malmuth-Harville:
//   P(jogador i termina em 1º entre um conjunto) = stack_i / soma dos stacks
// e recursivamente para 2º, 3º, ... O valor $ de i é a soma, sobre cada lugar,
// de P(i termina naquele lugar) × prêmio do lugar.
//
// A recursão é memoizada por subconjunto (bitmask), então roda rápido até ~9
// jogadores. A partir daqui derivamos a "pressão de ICM": perto da bolha,
// arriscar o stack custa mais valor do que ganha, o que aperta as ranges.
// ---------------------------------------------------------------------------

/**
 * Distribuição de lugares: devolve, para cada jogador, a probabilidade de
 * terminar em cada lugar relativo (0 = 1º). Memoizado por subconjunto.
 */
function finishDistribution(stacks: number[]): number[][] {
  const n = stacks.length;
  const full = (1 << n) - 1;
  const memo = new Map<number, number[][]>();

  function h(setMask: number): number[][] {
    const cached = memo.get(setMask);
    if (cached) return cached;

    const members: number[] = [];
    let sum = 0;
    for (let i = 0; i < n; i++) {
      if (setMask & (1 << i)) {
        members.push(i);
        sum += stacks[i];
      }
    }
    const size = members.length;
    const res: number[][] = Array.from({ length: n }, () => new Array(size).fill(0));

    if (size === 1) {
      res[members[0]][0] = 1;
      memo.set(setMask, res);
      return res;
    }
    if (sum <= 0) {
      for (const i of members) res[i].fill(1 / size);
      memo.set(setMask, res);
      return res;
    }

    for (const i of members) {
      const pi = stacks[i] / sum;
      res[i][0] += pi;
      const sub = h(setMask & ~(1 << i));
      for (const j of members) {
        if (j === i) continue;
        for (let r = 0; r < size - 1; r++) {
          res[j][r + 1] += pi * sub[j][r];
        }
      }
    }
    memo.set(setMask, res);
    return res;
  }

  return h(full);
}

/** Valor em prêmio ($) de cada stack. */
export function icmEquity(stacks: number[], payouts: number[]): number[] {
  const n = stacks.length;
  const dist = finishDistribution(stacks);
  const values = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let place = 0; place < n; place++) {
      const prize = payouts[place] ?? 0;
      values[i] += dist[i][place] * prize;
    }
  }
  return values;
}

function icmAfterAllIn(
  stacks: number[],
  payouts: number[],
  hero: number,
  villain: number,
  chips: number,
): { win: number; lose: number } {
  const win = stacks.slice();
  win[hero] += chips;
  win[villain] -= chips;

  const lose = stacks.slice();
  lose[hero] -= chips;
  lose[villain] += chips;

  const winVals = icmEquity(win.map((s) => Math.max(0, s)), payouts);
  const loseVals = icmEquity(lose.map((s) => Math.max(0, s)), payouts);
  return { win: winVals[hero], lose: loseVals[hero] };
}

export interface IcmSpot {
  stacks: number[];
  payouts: number[];
  hero: number;
  villain: number;
  /** Fichas em jogo no confronto (stack efetivo). */
  chips: number;
}

/**
 * Estados já reconstruídos da decisão. `foldStacks` representa o instante em
 * que o Hero desiste: fichas já comprometidas permanecem perdidas e não voltam
 * para o stack. `winStacks` e `loseStacks` representam os dois showdowns.
 */
export interface IcmDecisionStates {
  foldStacks: number[];
  winStacks: number[];
  loseStacks: number[];
  payouts: number[];
  hero: number;
}

/**
 * Equity mínima para tornar call indiferente a fold em valor de ICM:
 *   fold = q * win + (1-q) * lose
 *   q = (fold - lose) / (win - lose)
 *
 * A reconstrução dos três estados fica no chamador, permitindo usar o risco
 * Hero-vilão real sem recorrer ao menor stack global da mesa.
 */
export function requiredEquityForDecision(spot: IcmDecisionStates): number {
  const n = spot.foldStacks.length;
  if (
    n === 0 ||
    spot.winStacks.length !== n ||
    spot.loseStacks.length !== n ||
    spot.hero < 0 ||
    spot.hero >= n
  ) {
    return 0.5;
  }

  const clean = (stacks: number[]) => stacks.map((s) => Math.max(0, Number.isFinite(s) ? s : 0));
  const foldValue = icmEquity(clean(spot.foldStacks), spot.payouts)[spot.hero];
  const winValue = icmEquity(clean(spot.winStacks), spot.payouts)[spot.hero];
  const loseValue = icmEquity(clean(spot.loseStacks), spot.payouts)[spot.hero];
  const denom = winValue - loseValue;

  if (!Number.isFinite(foldValue) || !Number.isFinite(denom) || denom <= 0) return 0.5;
  const required = (foldValue - loseValue) / denom;
  return Math.max(0, Math.min(1, required));
}

/** Equity de ICM necessária para pagar um all-in no modelo legado. */
export function requiredEquityToCall(spot: IcmSpot): number {
  const now = icmEquity(spot.stacks, spot.payouts)[spot.hero];
  const { win, lose } = icmAfterAllIn(
    spot.stacks,
    spot.payouts,
    spot.hero,
    spot.villain,
    spot.chips,
  );
  const risk = now - lose;
  const reward = win - now;
  if (risk + reward <= 0) return 0.5;
  return risk / (risk + reward);
}

/** Bubble factor: custo em ICM de perder dividido pelo ganho de vencer. */
export function bubbleFactor(spot: IcmSpot): number {
  const now = icmEquity(spot.stacks, spot.payouts)[spot.hero];
  const { win, lose } = icmAfterAllIn(
    spot.stacks,
    spot.payouts,
    spot.hero,
    spot.villain,
    spot.chips,
  );
  const risk = now - lose;
  const reward = win - now;
  if (reward <= 0) return 1;
  return risk / reward;
}

/** Fator de aperto de range por ICM, em [minFactor..1]. */
export function icmTightenFactor(
  spot: IcmSpot,
  icmSensitivity: number,
  minFactor = 0.4,
): number {
  const bf = bubbleFactor(spot);
  if (bf <= 1) return 1;
  const excess = (bf - 1) * icmSensitivity;
  const factor = 1 / (1 + excess);
  return Math.max(minFactor, Math.min(1, factor));
}

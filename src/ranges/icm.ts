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
    // res[jogador][lugarRelativo]
    const res: number[][] = Array.from({ length: n }, () => new Array(size).fill(0));

    if (size === 1) {
      res[members[0]][0] = 1;
      memo.set(setMask, res);
      return res;
    }
    if (sum <= 0) {
      // Stacks zerados: reparte igualmente (caso degenerado).
      for (const i of members) res[i].fill(1 / size);
      memo.set(setMask, res);
      return res;
    }

    for (const i of members) {
      const pi = stacks[i] / sum; // prob. de i ficar em 1º entre os restantes
      res[i][0] += pi;
      const sub = h(setMask & ~(1 << i)); // subconjunto sem i, tamanho size-1
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

/**
 * Valor em prêmio ($) de cada stack. `payouts[0]` é o 1º lugar, etc. Lugares
 * sem prêmio recebem 0.
 */
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

/**
 * Equity de ICM se o herói VENCER ou PERDER um all-in contra um vilão, movendo
 * `chips` fichas de um para o outro. Devolve o valor $ do herói em cada caso.
 */
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

  // Se algum stack zera, ele "termina" — o modelo já lida com stack 0 (fica em
  // último entre iguais); para fidelidade, mantemos todos no cálculo.
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
 * Equity de ICM necessária para pagar um all-in neste spot.
 *
 * Em fichas puras, você paga se sua equity ≥ pot odds. Com ICM, o risco de
 * quebrar vale mais que a recompensa de dobrar perto da bolha, então a equity
 * exigida sobe. Calculamos:
 *   Risco     = ICM agora − ICM se perder
 *   Ganho     = ICM se vencer − ICM agora
 *   equityReq = Risco / (Risco + Ganho)
 * Comparar a equity real com esse número já embute todo o efeito do ICM.
 */
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
  if (risk + reward <= 0) return 0.5; // caso degenerado
  return risk / (risk + reward);
}

/**
 * "Bubble factor": razão entre o que se arrisca e o que se ganha, em $ de ICM.
 * 1.0 = fichas valem linearmente (sem pressão). >1 = perto da bolha, arriscar
 * custa mais — quanto maior, mais apertado se deve jogar.
 */
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

/**
 * Fator de aperto de range por ICM, em [minFactor..1], para multiplicar o alvo
 * de abertura/defesa. Deriva do bubble factor e da sensibilidade do perfil:
 * quanto maior a pressão e maior a `icmSensitivity`, mais aperta.
 */
export function icmTightenFactor(
  spot: IcmSpot,
  icmSensitivity: number,
  minFactor = 0.4,
): number {
  const bf = bubbleFactor(spot);
  if (bf <= 1) return 1; // sem pressão (ou até prêmio de risco negativo)
  // Excesso de risco sobre o neutro, amortecido pela sensibilidade do perfil.
  const excess = (bf - 1) * icmSensitivity;
  const factor = 1 / (1 + excess);
  return Math.max(minFactor, Math.min(1, factor));
}

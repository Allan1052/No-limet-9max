// ---------------------------------------------------------------------------
// Estrutura de torneio: buy-ins, premiação, níveis de blind, estágios e stacks.
//
// Tudo aqui é puro e testável. A ideia é traduzir uma configuração simples
// (buy-in, nº de inscritos, estágio) em tudo que o jogo precisa:
//   - blinds do nível atual;
//   - stack médio (em bb) do estágio → mais fundo no início, mais raso no fim;
//   - stacks DESIGUAIS entre os 9 (como no torneio real);
//   - premiação total e a escada de prêmios;
//   - os prêmios que valem para o ICM da mesa (perto da bolha / mesa final).
//
// Nada disso é regra fixa de solver — é um modelo transparente e realista o
// suficiente para estudo. A premiação é bruta (sem descontar a taxa da sala).
// ---------------------------------------------------------------------------

export interface BuyIn {
  label: string;
  value: number; // em dólares
}

// Grade de buy-ins inspirada na do GGPoker.
export const BUY_INS: BuyIn[] = [
  { label: "$5", value: 5 },
  { label: "$11", value: 11 },
  { label: "$22", value: 22 },
  { label: "$55", value: 55 },
  { label: "$109", value: 109 },
];

export interface BlindLevel {
  level: number;
  sb: number;
  bb: number;
  ante: number;
}

// Níveis de blind (em fichas). Sobem ao longo do torneio.
export const BLIND_LEVELS: BlindLevel[] = [
  { level: 1, sb: 25, bb: 50, ante: 0 },
  { level: 2, sb: 50, bb: 100, ante: 0 },
  { level: 3, sb: 100, bb: 200, ante: 0 },
  { level: 4, sb: 150, bb: 300, ante: 0 },
  { level: 5, sb: 200, bb: 400, ante: 0 },
  { level: 6, sb: 300, bb: 600, ante: 0 },
  { level: 7, sb: 400, bb: 800, ante: 0 },
  { level: 8, sb: 600, bb: 1200, ante: 0 },
];

export type Stage = "inicio" | "meio" | "bolha" | "mesa_final";

export interface StageInfo {
  id: Stage;
  label: string;
  /** Índice em BLIND_LEVELS. */
  levelIndex: number;
  /** Stack médio da mesa, em big blinds. */
  avgBB: number;
  /** Variabilidade dos stacks (0 = todos iguais; maior = mais desigual). */
  spread: number;
  /** O estágio ativa a pressão de ICM? */
  icm: "none" | "bubble" | "final";
}

export const STAGES: Record<Stage, StageInfo> = {
  inicio: { id: "inicio", label: "Início", levelIndex: 0, avgBB: 100, spread: 0.18, icm: "none" },
  meio: { id: "meio", label: "Meio", levelIndex: 2, avgBB: 45, spread: 0.3, icm: "none" },
  bolha: { id: "bolha", label: "Bolha", levelIndex: 4, avgBB: 22, spread: 0.5, icm: "bubble" },
  mesa_final: { id: "mesa_final", label: "Mesa final", levelIndex: 5, avgBB: 20, spread: 0.62, icm: "final" },
};

/** Premiação total (bruta): buy-in × inscritos. */
export function prizePool(buyIn: number, entrants: number): number {
  return buyIn * Math.max(1, Math.floor(entrants));
}

/** Nº de lugares pagos (~15% do campo, no mínimo 1). */
export function paidPlaces(entrants: number): number {
  return Math.max(1, Math.round(entrants * 0.15));
}

/**
 * Escada de prêmios: valor ($) para cada lugar pago (1º..N). Soma = premiação.
 *
 * Modelo: todo lugar pago recebe pelo menos a mínima premiação (min-cash ≈ 1,5×
 * o buy-in), e o restante da premiação é distribuído de forma bem "top-heavy"
 * (curva de potência) — como nos torneios reais. Assim o 1º leva a maior fatia
 * e ninguém que entra no dinheiro recebe $0.
 */
export function payoutLadder(entrants: number, pool: number): number[] {
  const buyIn = pool / Math.max(1, entrants);
  let paid = paidPlaces(entrants);
  const minCash = Math.max(1, Math.round(1.5 * buyIn));

  // Segurança: se a base de min-cash for grande demais para o bolo, paga menos.
  while (paid > 1 && paid * minCash > pool * 0.5) paid--;

  const baseline = paid * minCash;
  const remaining = Math.max(0, pool - baseline);

  // Pesos decrescentes (lei de potência) para o "prêmio extra" acima do min-cash.
  const p = 1.05;
  const weights: number[] = [];
  for (let i = 1; i <= paid; i++) weights.push(1 / Math.pow(i, p));
  const totalW = weights.reduce((a, b) => a + b, 0);

  const ladder = weights.map((w) => minCash + Math.round((w / totalW) * remaining));
  // Ajusta o arredondamento no 1º lugar para a soma bater com a premiação.
  const diff = pool - ladder.reduce((a, b) => a + b, 0);
  ladder[0] += diff;
  return ladder;
}

/**
 * Prêmios que valem para o ICM dos 9 jogadores na mesa, por estágio:
 *  - "none"   → sem ICM (undefined).
 *  - "final"  → os 9 maiores prêmios (mesa final).
 *  - "bubble" → os menores prêmios pagáveis + zeros: 3 dos 9 bustam sem pagar
 *    (pressão de bolha).
 */
export function tablePayouts(icm: StageInfo["icm"], ladder: number[]): number[] | undefined {
  if (icm === "none") return undefined;
  if (icm === "final") {
    const out = ladder.slice(0, 9);
    while (out.length < 9) out.push(0);
    return out;
  }
  // bubble: pega os 6 menores prêmios pagáveis e adiciona 3 zeros.
  const paid = ladder.length;
  const start = Math.max(0, paid - 6);
  const smallest = ladder.slice(start); // até 6 valores
  const out = smallest.slice(-6);
  while (out.length < 6) out.unshift(out[0] ?? 0);
  out.push(0, 0, 0);
  return out.slice(0, 9);
}

/** Aproximação de uma gaussiana padrão a partir do RNG (soma de 3 uniformes). */
function gauss(rng: () => number): number {
  return rng() + rng() + rng() - 1.5;
}

/**
 * Gera `n` stacks DESIGUAIS em torno de uma média (em fichas), com variação
 * controlada por `spread`. Normaliza para a soma ≈ n × média e impõe um piso.
 */
export function unevenStacks(
  avgChips: number,
  n: number,
  spread: number,
  rng: () => number,
  minChips = 0,
): number[] {
  const raw: number[] = [];
  for (let i = 0; i < n; i++) raw.push(Math.exp(spread * gauss(rng)));
  const sum = raw.reduce((a, b) => a + b, 0);
  const floor = Math.max(minChips, avgChips * 0.12);
  const stacks = raw.map((m) => {
    const chips = (m / sum) * (avgChips * n);
    return Math.max(floor, Math.round(chips / 25) * 25); // arredonda a 25 fichas
  });
  return stacks;
}

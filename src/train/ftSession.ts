// ---------------------------------------------------------------------------
// Sessão de ESTUDO de MESA FINAL — treino dedicado do estágio mais difícil.
//
// O problema que este módulo resolve: no torneio normal, quando a mesa final
// se forma, os stacks são herdados do que sobrou (geralmente 4–8bb) e o
// jogador não tem opção de TREINAR uma FT com stacks realistas de 15–25bb,
// que é o que acontece em torneios presenciais.
//
// Este módulo é PURO (sem UI, sem DOM) e só LE os módulos existentes:
// tournament/structure (BLIND_LEVELS, tablePayouts, payoutLadder, prizePool),
// tournament/field (fieldStatus, cashForPlace) e ranges/icm (icmEquity etc.).
// ---------------------------------------------------------------------------
import {
  BLIND_LEVELS,
  payoutLadder,
  prizePool,
  tablePayouts,
} from "../tournament/structure";
import { cashForPlace, fieldStatus } from "../tournament/field";
import { bubbleFactor, icmEquity, requiredEquityToCall } from "../ranges/icm";

export type FtPressure = "baixa" | "media" | "alta";

export interface FtConfig {
  /** Stack do herói em big blinds (10–30). */
  heroStackBb: number;
  /** Nº de jogadores na mesa (2–9). */
  nPlayers: number;
  /** Stack médio dos oponentes, em bb (10–30). */
  avgOppBb: number;
  /** Desigualdade dos stacks dos oponentes (0 = iguais; maior = mais variado). */
  oppSpread: number;
  /** Intensidade da pressão ICM simulada (afeta a narrativa do coach). */
  pressure: FtPressure;
  /** Buy-in simbólico para a premiação (sem dinheiro real — só simulação). */
  buyIn: number;
  /** Nº de inscritos simulado no torneio (define a escada de prêmios). */
  entrants: number;
  /** Gerador aleatório. */
  rng: () => number;
}

/** Aproximação gaussiana simples (soma de 3 uniformes). */
function gauss(rng: () => number): number {
  return rng() + rng() + rng() - 1.5;
}

export interface FtSeat {
  name: string;
  stack: number; // em fichas
  isHero: boolean;
}

export interface FtSession {
  /** Seats da mesa (herói + oponentes). */
  seats: FtSeat[];
  /** Big blind atual do nível de mesa final. */
  bigBlind: number;
  /** Premiação por posição na mesa final (0 para os que bustam sem pagar). */
  payouts: number[];
  /** Escada completa do torneio (para referência). */
  ladder: number[];
  /** Premiação total simulada. */
  prizePool: number;
  /** Stacks em big blinds (para exibição). */
  stacksBb: number[];
  /** Valor ICM ($) de cada stack na mesa. */
  icmValues: number[];
  /** Índice do herói nos arrays. */
  heroIndex: number;
}

const FT_NAMES = [
  "Você",
  "Chip Leader",
  "Regular",
  "Peixe Agressivo",
  "Conservador",
  "Maníaco",
  "Curto 1",
  "Curto 2",
  "Curto 3",
];

/**
 * Monta a sessão de estudo: mesa final completa com stacks controláveis,
 * ICM real (payouts da FT) e valores em $ de cada stack.
 */
export function makeFinalTableSession(cfg: FtConfig): FtSession {
  const n = Math.min(9, Math.max(2, cfg.nPlayers));
  const level = BLIND_LEVELS[8]; // nível clássico de FT: 600/1200 + 150
  const bb = level.bb;
  const entrants = Math.max(9, Math.round(cfg.entrants));
  const pool = prizePool(cfg.buyIn, entrants);
  const ladder = payoutLadder(entrants, pool);
  const payouts = tablePayouts("final", ladder)!;

  // Stacks dos oponentes em torno de avgOppBb com spread controlado.
  const oppCount = n - 1;
  const raw: number[] = [];
  for (let i = 0; i < oppCount; i++) raw.push(Math.exp(cfg.oppSpread * gauss(cfg.rng)));
  const sum = raw.reduce((a, b) => a + b, 0);
  const oppStacks = raw.map((m) => {
    const chips = (m / sum) * (cfg.avgOppBb * bb * oppCount);
    return Math.max(bb * 3, Math.round(chips / 25) * 25);
  });

  const heroStack = Math.max(10, Math.min(30, cfg.heroStackBb)) * bb;
  const seats: FtSeat[] = [
    { name: FT_NAMES[0], stack: heroStack, isHero: true },
    ...oppStacks.map((s, i) => ({ name: FT_NAMES[i + 1] ?? `J${i + 2}`, stack: s, isHero: false })),
  ];
  const stacksBb = seats.map((s) => Math.round(s.stack / bb));
  const icmValues = icmEquity(
    seats.map((s) => s.stack),
    payouts,
  );

  return {
    seats,
    bigBlind: bb,
    payouts,
    ladder,
    prizePool: pool,
    stacksBb,
    icmValues,
    heroIndex: 0,
  };
}

export interface FtContext {
  /** Prêmio garantido se o herói bustar agora (0 se fora do dinheiro). */
  currentCash: number;
  /** Colocação estimada do herói (1 = chip leader). */
  heroRank: number;
  /** Fator de bolha: >1 = pressão ICM, <=1 = sem pressão. */
  bubble: number;
  /** Equity mínima para pagar um all-in contra o oponente que cobre o herói. */
  requiredEq: number | null;
  /** Oponente que cobre o herói (índice) — null se ninguém cobre. */
  coverIndex: number | null;
  /** Valor ICM do stack do herói. */
  heroIcm: number;
  /** Fichas do herói. */
  heroStack: number;
}

/**
 * Contexto ICM atual do herói: quanto vale cada decisão em $.
 */
export function ftHeroContext(s: FtSession): FtContext {
  const stacks = s.seats.map((x) => x.stack);
  const heroStack = stacks[s.heroIndex];
  // Colocação exata: conta quantos têm mais fichas (todos na mesma mesa).
  const exactRank = 1 + stacks.filter((x, i) => i !== s.heroIndex && x > heroStack).length;
  const fs = fieldStatus({
    entrants: s.seats.length,
    remaining: s.seats.length,
    heroStack,
    avgStack: stacks.reduce((a, b) => a + b, 0) / stacks.length,
    ladder: s.ladder,
    exactRank,
  });
  // O oponente que mais cobre o herói:
  let bestCover: number | null = null;
  let bestAmount = -1;
  for (let i = 0; i < stacks.length; i++) {
    if (i === s.heroIndex) continue;
    if (stacks[i] >= heroStack && stacks[i] > bestAmount) {
      bestAmount = stacks[i];
      bestCover = i;
    }
  }
  const requiredEq =
    bestCover !== null
      ? requiredEquityToCall({
          stacks,
          payouts: s.payouts,
          hero: s.heroIndex,
          villain: bestCover,
          chips: heroStack,
        })
      : null;
  return {
    currentCash: cashForPlace(fs.heroRank, s.ladder),
    heroRank: fs.heroRank,
    bubble: bestCover !== null ? bubbleFactor({
      stacks,
      payouts: s.payouts,
      hero: s.heroIndex,
      villain: bestCover,
      chips: heroStack,
    }) : 1,
    requiredEq,
    coverIndex: bestCover,
    heroIcm: s.icmValues[s.heroIndex],
    heroStack,
  };
}

/** Faixa de stack do herói em bb — usada pelo coach para escolher a mensagem. */
export type FtStackBand = "muito_curto" | "curto" | "medio" | "folgado";

export function ftStackBand(heroStackChips: number, bigBlind: number): FtStackBand {
  const bb = Math.round(heroStackChips / bigBlind);
  if (bb <= 8) return "muito_curto";
  if (bb <= 15) return "curto";
  if (bb <= 25) return "medio";
  return "folgado";
}

/**
 * Narrativa do coach de mesa final: contextualiza a decisão com o stack,
 * o prêmio em jogo e a pressão ICM — em vez do feedback genérico.
 */
export function ftCoachLine(
  band: FtStackBand,
  ctx: FtContext,
  pressure: FtPressure,
): string {
  // O band já carrega a faixa do stack; usamos os $ para o contexto.
  const cash = ctx.currentCash > 0 ? `· você já garantiu $${Math.round(ctx.currentCash)}` : "";
  const icm = ctx.bubble > 1.15 ? " · pressão de ICM alta" : "";
  const pressureNote =
    pressure === "alta" ? " · prêmios encurtados, cada decisão pesa mais" : "";
  if (band === "muito_curto") {
    return `Você tem MUITO poucas fichas${cash}${icm}${pressureNote}. Com menos de 8bb o jogo é shove ou fold: espere um A, um par ou suited forte e empurre antes de o blind te comer.`;
  }
  if (band === "curto") {
    return `Stack curto${cash}${icm}${pressureNote}. Entre 8–15bb você ainda pode jogar pós-flop com mãos premium, mas contra raises largos o shove é a linha de maior valor — não deixe o blind sangrar.`;
  }
  if (band === "medio") {
    return `Stack médio${cash}${icm}${pressureNote}. Entre 15–25bb é a zona de ouro da mesa final: dá pra abrir largo, 3-betar e jogar flop — use posição e ataque os curtos.`;
  }
  return `Stack folgado${cash}${icm}${pressureNote}. Você é o chip leader (ou quase): cubra os curtos, pressione com raises largos e deixe o ICM trabalhar a seu favor.`;
}

/** Texto resumo do contexto FT para o painel lateral durante o jogo. */
export function ftContextSummary(s: FtSession, ctx: FtContext): {
  lines: string[];
  icmPercent: number;
} {
  const bb = Math.round(ctx.heroStack / s.bigBlind);
  const lines: string[] = [
    `Blinds: ${Math.round(s.bigBlind / 2)}/${s.bigBlind} + 150`,
    `Seu stack: ${bb}bb · lugar ${ctx.heroRank}º`,
    `Se cair agora: $${Math.round(ctx.currentCash)}`,
  ];
  if (ctx.requiredEq !== null && ctx.coverIndex !== null) {
    lines.push(
      `Contra ${s.seats[ctx.coverIndex].name}: precisa de ${Math.round(ctx.requiredEq * 100)}% de equity`,
    );
  }
  return {
    lines,
    // Sensação de pressão: 1 = neutro; 1.5 = forte ICM.
    icmPercent: Math.min(100, Math.max(0, Math.round((ctx.bubble - 1) * 100))),
  };
}

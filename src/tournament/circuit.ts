// ---------------------------------------------------------------------------
// CIRCUITO — 10 etapas fixas, no estilo de um circuito da WSOP.
//
// COMO FUNCIONA
//   - São 10 etapas com número de inscritos FIXO (30 até 2.000).
//   - Só torneio começado no estágio "início" pontua (regra do ranking).
//   - CRAVOU a etapa (venceu) => ela sai da sua lista e não volta mais no mês.
//   - PERDEU => pode repetir quantas vezes quiser.
//   - O jogador vê ~3 etapas por vez, então sempre existe um próximo degrau.
//   - Tudo zera no dia 1º de cada mês (temporada nova).
//
// O MODO TREINO LIVRE NÃO É AFETADO POR NADA DISSO. Lá o jogador escolhe
// qualquer quantidade de inscritos, qualquer buy-in e qualquer estágio, quantas
// vezes quiser — só não pontua. Os dois modos convivem: dá pra estar no meio do
// circuito e treinar do mesmo jeito.
// ---------------------------------------------------------------------------
import { computePoyPoints } from "./poyPoints";
import { paidPlaces } from "./structure";

/** Quantas etapas o circuito tem. */
export const CIRCUIT_STAGE_COUNT = 10;

/** Quantas etapas aparecem por vez na tela de seleção. */
export const VISIBLE_STAGES = 3;

export interface CircuitStage {
  /** 1 a 10. */
  index: number;
  /** Nome exibido. */
  name: string;
  /** Número FIXO de inscritos da etapa. */
  entrants: number;
  /** Lugares pagos (15% do campo, igual ao resto do app). */
  paid: number;
  /** É a etapa final (Main Event)? */
  isMainEvent: boolean;
}

/**
 * As 10 etapas. A progressão de inscritos foi calibrada para que:
 *   - cravar só o Main Event valha ~1/5 do circuito completo (mata o farm)
 *   - as etapas pequenas continuem valendo a pena (5 menores = 5.397 pts)
 *   - vencer valha 20x o min-cash em qualquer etapa (padrão WSOP pós-2018)
 */
const RAW_STAGES: Array<{ name: string; entrants: number }> = [
  { name: "Etapa 1 · Abertura", entrants: 30 },
  { name: "Etapa 2 · Regional", entrants: 60 },
  { name: "Etapa 3 · Nacional", entrants: 100 },
  { name: "Etapa 4 · Desafio", entrants: 180 },
  { name: "Etapa 5 · Elite", entrants: 300 },
  { name: "Etapa 6 · Milhar", entrants: 500 },
  { name: "Etapa 7 · Continental", entrants: 800 },
  { name: "Etapa 8 · Mundial", entrants: 1200 },
  { name: "Etapa 9 · Championship", entrants: 1600 },
  { name: "Etapa 10 · Main Event", entrants: 2000 },
];

export const CIRCUIT_STAGES: CircuitStage[] = RAW_STAGES.map((s, i) => ({
  index: i + 1,
  name: s.name,
  entrants: s.entrants,
  paid: paidPlaces(s.entrants),
  isMainEvent: i + 1 === CIRCUIT_STAGE_COUNT,
}));

/** Busca uma etapa pelo índice (1-based). */
export function circuitStage(index: number): CircuitStage | undefined {
  return CIRCUIT_STAGES.find((s) => s.index === index);
}

/** Descobre a etapa a partir do número de inscritos (para gravar o resultado). */
export function circuitStageByEntrants(entrants: number): CircuitStage | undefined {
  return CIRCUIT_STAGES.find((s) => s.entrants === entrants);
}

/**
 * Quanto vale CRAVAR (vencer) uma etapa, no buy-in informado.
 * Usado na tela de seleção: o jogador vê o prêmio antes de entrar.
 */
export function stageWinValue(stageIndex: number, buyIn: number): number {
  const stage = circuitStage(stageIndex);
  if (!stage) return 0;
  return computePoyPoints({
    stage: "inicio",
    entrants: stage.entrants,
    buyIn,
    finishPosition: 1,
  }).points;
}

/** Soma de todas as etapas cravadas — o valor do circuito completo. */
export function fullCircuitValue(buyIn: number): number {
  return CIRCUIT_STAGES.reduce(
    (total, s) => total + stageWinValue(s.index, buyIn),
    0,
  );
}

// ---------------------------------------------------------------------------
// PROGRESSO — quais etapas o jogador já cravou nesta temporada e faixa
// ---------------------------------------------------------------------------

/** Identificador da temporada atual: "2026-08". Zera no dia 1º. */
export function currentSeason(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Ano da temporada, para o ranking anual. */
export function currentSeasonYear(date = new Date()): number {
  return date.getFullYear();
}

/** Chave do localStorage do progresso (por faixa e temporada). */
function progressKey(tier: string, season: string): string {
  return `cof-circuit-${tier}-${season}`;
}

/** Etapas já cravadas nesta faixa/temporada (cache local). */
export function getClearedStages(tier: string, season = currentSeason()): number[] {
  try {
    const raw = localStorage.getItem(progressKey(tier, season));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

/** Marca uma etapa como cravada. Retorna a lista atualizada. */
export function markStageCleared(
  stageIndex: number,
  tier: string,
  season = currentSeason(),
): number[] {
  const cleared = getClearedStages(tier, season);
  if (cleared.includes(stageIndex)) return cleared;
  const next = [...cleared, stageIndex].sort((a, b) => a - b);
  try {
    localStorage.setItem(progressKey(tier, season), JSON.stringify(next));
  } catch {
    /* localStorage cheio ou indisponível — o banco continua sendo a fonte da verdade */
  }
  return next;
}

/** Sincroniza o cache local com o que veio do banco (fonte da verdade). */
export function syncClearedStages(
  stages: number[],
  tier: string,
  season = currentSeason(),
): void {
  try {
    const unique = Array.from(new Set(stages)).sort((a, b) => a - b);
    localStorage.setItem(progressKey(tier, season), JSON.stringify(unique));
  } catch {
    /* ignora */
  }
}

export function isStageCleared(
  stageIndex: number,
  tier: string,
  season = currentSeason(),
): boolean {
  return getClearedStages(tier, season).includes(stageIndex);
}

/**
 * Quais etapas o jogador pode disputar agora.
 *
 * Regra: mostra as VISIBLE_STAGES primeiras etapas ainda NÃO cravadas, em
 * ordem. Ou seja, cravar a Etapa 1 faz a Etapa 4 aparecer — sempre existe um
 * próximo degrau, e o jogador nunca vê as 10 de uma vez (o que viraria uma
 * lista intimidante).
 */
export function getAvailableStages(
  tier: string,
  season = currentSeason(),
): CircuitStage[] {
  const cleared = getClearedStages(tier, season);
  return CIRCUIT_STAGES.filter((s) => !cleared.includes(s.index)).slice(
    0,
    VISIBLE_STAGES,
  );
}

/** Progresso do circuito nesta faixa: cravadas, restantes e se completou. */
export function circuitProgress(
  tier: string,
  season = currentSeason(),
): {
  cleared: number[];
  clearedCount: number;
  total: number;
  remaining: number;
  complete: boolean;
  percent: number;
} {
  const cleared = getClearedStages(tier, season);
  const clearedCount = cleared.length;
  return {
    cleared,
    clearedCount,
    total: CIRCUIT_STAGE_COUNT,
    remaining: CIRCUIT_STAGE_COUNT - clearedCount,
    complete: clearedCount >= CIRCUIT_STAGE_COUNT,
    percent: Math.round((clearedCount / CIRCUIT_STAGE_COUNT) * 100),
  };
}

/** Nome do mês em português, para exibir o selo ("Ago/2026"). */
export function seasonLabel(season = currentSeason()): string {
  const months = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];
  const [year, month] = season.split("-");
  const idx = Number(month) - 1;
  const name = months[idx] || month;
  return `${name}/${year}`;
}

/** Rótulo da faixa de buy-in, para exibição. */
export function tierLabel(tier: string): string {
  switch (tier) {
    case "micro":
      return "Micro";
    case "baixa":
      return "Baixa";
    case "media":
      return "Média";
    case "alta":
      return "Alta";
    case "elite":
      return "Elite";
    default:
      return tier;
  }
}

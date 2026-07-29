// ---------------------------------------------------------------------------
// MISSÃO 1×1 — campanha de posições.
//
// O jogador começa no BOTÃO e, estágio a estágio, domina cada posição da mesa,
// enfrentando quem abriu antes dele. Passa de estágio com um CRITÉRIO de
// aprovação (não precisa acertar tudo — poker tem jogada mista) e vai subindo:
// poucas rodadas no começo, mais conforme avança. Ao concluir, pode marcar os
// amigos. Reaproveita o mesmo motor de cenários do Ultra 1×1.
// ---------------------------------------------------------------------------

import { POSITIONS, type Position } from "../ranges/types";

export interface Stage {
  id: string;
  heroPosition: Position;
  /** Posições que podem ter aberto ANTES do herói (vazio = herói abre / RFI). */
  villainPool: Position[];
  rounds: number;
  /** Quantas decisões certas (boa/ok) são necessárias para passar. */
  passNeeded: number;
  stacks: number[];
}

function before(pos: Position): Position[] {
  return POSITIONS.slice(0, POSITIONS.indexOf(pos)) as Position[];
}

// Ordem da campanha: do botão às blinds e fecha na abertura de UTG.
const ORDER: Position[] = ["BTN", "CO", "HJ", "LJ", "MP", "UTG1", "SB", "BB", "UTG"];

export const STAGES: Stage[] = ORDER.map((pos, i) => {
  const rounds = i < 3 ? 6 : i < 6 ? 8 : 10; // estágios crescentes
  return {
    id: `s${i + 1}-${pos}`,
    heroPosition: pos,
    villainPool: before(pos),
    rounds,
    passNeeded: Math.ceil(rounds * 0.75),
    stacks: [20, 40, 60, 100],
  };
});

export interface CampaignProgress {
  cleared: string[];
  best: Record<string, number>; // stageId -> melhor nº de acertos
}

const KEY = "cof-campaign-v1";

export function loadCampaign(): CampaignProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (Array.isArray(p.cleared) && p.best) return { cleared: p.cleared, best: p.best };
    }
  } catch {
    /* ignore */
  }
  return { cleared: [], best: {} };
}

export function saveCampaign(p: CampaignProgress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

/** Estágio liberado? O primeiro sempre; os demais exigem o anterior concluído. */
export function isStageUnlocked(p: CampaignProgress, index: number): boolean {
  if (index <= 0) return true;
  const prev = STAGES[index - 1];
  return !!prev && p.cleared.includes(prev.id);
}

/** Registra o resultado de um estágio; devolve se passou e o novo progresso. */
export function recordStage(
  p: CampaignProgress,
  stageId: string,
  correct: number,
): { passed: boolean; progress: CampaignProgress } {
  const stage = STAGES.find((s) => s.id === stageId);
  const passed = !!stage && correct >= stage.passNeeded;
  const best = Math.max(p.best[stageId] ?? 0, correct);
  const cleared =
    passed && !p.cleared.includes(stageId) ? [...p.cleared, stageId] : p.cleared;
  return { passed, progress: { cleared, best: { ...p.best, [stageId]: best } } };
}

export function campaignStats(p: CampaignProgress): { done: number; total: number } {
  return { done: p.cleared.filter((id) => STAGES.some((s) => s.id === id)).length, total: STAGES.length };
}

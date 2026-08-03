// ---------------------------------------------------------------------------
// MISSÃO 1×1 — campanha de posições.
//
// Estágios ordenados por DIFICULDADE REAL de poker pré-flop:
//   1. BTN  (fácil — abre de botão, range largo)
//   2. CO   (fácil — abre de CO, range largo)
//   3. HJ   (médio — abre de HJ, range moderado)
//   4. LJ   (médio — abre de LJ, range mais tight)
//   5. MP   (médio — abre de MP, range tight)
//   6. BB   (difícil — defender de BB é complexo, decisões de call/3bet/fold)
//   7. SB   (muito difícil — posição mais difícil do poker, decisões OOP)
//   8. UTG1 (difícil — abre de UTG1, range muito tight)
//   9. UTG  (difícil — abre de UTG, range mais tight do jogo)
//
// CRITÉRIO DE APROVAÇÃO: no máximo 1 erro por estágio.
// O jogador precisa de rounds - 1 acertos para passar.
// Isso cria disputa real — cada mão importa.
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

// Ordem por dificuldade real de poker pré-flop (mais fácil → mais difícil).
// RFI é mais fácil que defender, e dentro de RFI, posições laterais são mais
// fáceis que posições iniciais. SB/BB são as mais difíceis por serem OOP.
const ORDER: Position[] = ["BTN", "CO", "HJ", "LJ", "MP", "BB", "SB", "UTG1", "UTG"];

export const STAGES: Stage[] = ORDER.map((pos, i) => {
  const rounds = i < 3 ? 6 : i < 6 ? 8 : 10; // estágios crescentes
  // CRITÉRIO DE 1 ERRO MÁXIMO: precisa de (rounds - 1) acertos.
  // Ex: 6 rodadas → precisa de 5 certas. 8 rodadas → 7 certas. 10 rodadas → 9 certas.
  return {
    id: `s${i + 1}-${pos}`,
    heroPosition: pos,
    villainPool: before(pos),
    rounds,
    passNeeded: rounds - 1,
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

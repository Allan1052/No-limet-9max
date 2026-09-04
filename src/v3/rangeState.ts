import { comboCount } from "../ranges/types";
import type { EvidenceSource } from "./evidence";

export interface RangeHistoryItem {
  action: string;
}

export interface PlayerRangeState {
  playerId: string;
  handFreq: Record<string, number>;
  evidence: EvidenceSource;
  history: RangeHistoryItem[];
}

function assertFrequency(hand: string, freq: number): void {
  if (!Number.isFinite(freq) || freq < 0 || freq > 1) {
    throw new Error(`Invalid frequency for ${hand}: ${freq}`);
  }
}

export function createRangeState(
  playerId: string,
  handFreq: Record<string, number>,
  evidence: EvidenceSource,
): PlayerRangeState {
  for (const [hand, freq] of Object.entries(handFreq)) {
    assertFrequency(hand, freq);
  }

  return {
    playerId,
    handFreq: { ...handFreq },
    evidence: { ...evidence },
    history: [],
  };
}

export function rangePercent(state: PlayerRangeState): number {
  let weightedCombos = 0;
  for (const [hand, freq] of Object.entries(state.handFreq)) {
    weightedCombos += comboCount(hand) * freq;
  }
  return weightedCombos / 1326;
}

export function applyActionWeights(
  state: PlayerRangeState,
  action: string,
  weights: Record<string, number>,
): PlayerRangeState {
  const handFreq: Record<string, number> = {};

  for (const [hand, priorFreq] of Object.entries(state.handFreq)) {
    const actionWeight = weights[hand] ?? 0;
    assertFrequency(hand, actionWeight);
    handFreq[hand] = priorFreq * actionWeight;
  }

  return {
    ...state,
    handFreq,
    evidence: { ...state.evidence },
    history: [...state.history, { action }],
  };
}

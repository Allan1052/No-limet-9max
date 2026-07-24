// Hook React que embrulha o GameController e cuida do tempo dos bots.
import { useEffect, useReducer, useRef } from "react";
import { GameController, type GameOptions, type TournamentConfig } from "./gameController";
import type { Action } from "../game/engine";
import {
  loadProgress,
  recordDecision,
  recordHand,
  saveProgress,
  resetProgress,
  summarize,
  type ProgressState,
} from "./progress";

export function useGame(opts?: GameOptions) {
  const progressRef = useRef<ProgressState>(loadProgress());
  const ref = useRef<GameController | null>(null);
  if (!ref.current) {
    ref.current = new GameController({
      ...opts,
      onGrade: (rating) => {
        recordDecision(progressRef.current, rating);
        saveProgress(progressRef.current);
      },
      onHeroHand: () => {
        recordHand(progressRef.current);
        saveProgress(progressRef.current);
      },
    });
  }
  const g = ref.current;
  const [, force] = useReducer((x) => x + 1, 0);

  // Enquanto for a vez de um bot, agenda UM passo com atraso (para assistir).
  useEffect(() => {
    if (g.phase === "playing" && !g.table.handOver && !g.isHeroTurn()) {
      const id = setTimeout(() => {
        g.botStep();
        force();
      }, 650);
      return () => clearTimeout(id);
    }
  });

  return {
    controller: g,
    heroAct: (a: Action) => {
      g.heroAct(a);
      force();
    },
    newHand: () => {
      g.newHand();
      force();
    },
    resetStats: () => {
      g.resetStats();
      force();
    },
    startTournament: (cfg: TournamentConfig) => {
      g.configureTournament(cfg);
      force();
    },
    setLevel: (idx: number) => {
      g.setBlindLevel(idx);
      force();
    },
    dismissSummary: () => {
      g.tournamentOver = false;
      force();
    },
    progress: () => summarize(progressRef.current),
    resetProgress: () => {
      progressRef.current = resetProgress();
      force();
    },
  };
}

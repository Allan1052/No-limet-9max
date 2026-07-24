// Hook React que embrulha o GameController e cuida do tempo dos bots.
import { useEffect, useReducer, useRef } from "react";
import {
  GameController,
  type GameOptions,
  type GameSnapshot,
  type TournamentConfig,
} from "./gameController";
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

const SNAP_KEY = "poker-sim-tournament";

/** Salva o torneio entre mãos (para retomar depois) ou limpa se acabou. */
function persist(g: GameController): void {
  try {
    if (g.tournamentOver) {
      localStorage.removeItem(SNAP_KEY);
      return;
    }
    if (g.tournament && g.phase === "handOver") {
      const snap = g.snapshot();
      if (snap) localStorage.setItem(SNAP_KEY, JSON.stringify(snap));
    }
  } catch {
    /* armazenamento indisponível — segue sem persistir */
  }
}

function loadSnapshot(): GameSnapshot | null {
  try {
    const raw = localStorage.getItem(SNAP_KEY);
    return raw ? (JSON.parse(raw) as GameSnapshot) : null;
  } catch {
    return null;
  }
}

export function useGame(opts?: GameOptions) {
  const progressRef = useRef<ProgressState>(loadProgress());
  const ref = useRef<GameController | null>(null);
  if (!ref.current) {
    const g = new GameController({
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
    // Retoma um torneio salvo, se houver (sair e voltar de onde parou).
    const snap = loadSnapshot();
    if (snap && snap.v === 1) {
      try {
        g.restore(snap);
      } catch {
        /* snapshot inválido — começa limpo */
      }
    }
    ref.current = g;
  }
  const g = ref.current;
  const [, force] = useReducer((x) => x + 1, 0);

  // Enquanto for a vez de um bot, agenda UM passo com atraso (para assistir).
  useEffect(() => {
    if (g.phase === "playing" && !g.table.handOver && !g.isHeroTurn()) {
      const id = setTimeout(() => {
        g.botStep();
        persist(g);
        force();
      }, 650);
      return () => clearTimeout(id);
    }
  });

  return {
    controller: g,
    heroAct: (a: Action) => {
      g.heroAct(a);
      persist(g);
      force();
    },
    newHand: () => {
      g.newHand();
      persist(g);
      force();
    },
    resetStats: () => {
      g.resetStats();
      force();
    },
    startTournament: (cfg: TournamentConfig) => {
      g.configureTournament(cfg);
      persist(g);
      force();
    },
    setLevel: (idx: number) => {
      g.setBlindLevel(idx);
      persist(g);
      force();
    },
    dismissSummary: () => {
      g.tournamentOver = false;
      g.tournament = null;
      try {
        localStorage.removeItem(SNAP_KEY);
      } catch {
        /* ignora */
      }
      force();
    },
    progress: () => summarize(progressRef.current),
    resetProgress: () => {
      progressRef.current = resetProgress();
      force();
    },
  };
}

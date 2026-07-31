// Hook React que embrulha o GameController e cuida do tempo dos bots.
import { useEffect, useReducer, useRef, useState } from "react";
import { GameController, type GameOptions, type TournamentConfig, type UserSubscriptionLevel } from "./gameController";
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
import { saveSlot, loadSlot, removeSlot, listSlots } from "./tournamentSlots";
import {
  loadMissions,
  saveMissions,
  resetMissions,
  applyEvent,
  missionViews,
  missionCounts,
  type MissionState,
  type Mission,
  type MissionEvent,
} from "./missions";

/**
 * Salva o torneio ATUAL entre mãos, no slot da sua faixa de buy-in (para
 * retomar depois), ou limpa esse slot quando o torneio acaba.
 */
function persist(g: GameController): void {
  const tourney = g.tournament;
  if (!tourney) return;
  if (g.tournamentOver) {
    removeSlot(tourney.buyIn);
    return;
  }
  if (g.phase === "handOver") {
    const snap = g.snapshot();
    if (snap) saveSlot(snap);
  }
}

export function useGame(userSubscriptionLevel: UserSubscriptionLevel, opts?: GameOptions) {
  const progressRef = useRef<ProgressState>(loadProgress());
  const missionRef = useRef<MissionState>(loadMissions());
  const [toasts, setToasts] = useState<Mission[]>([]);
  const [celebrateItm, setCelebrateItm] = useState(false);
  const ref = useRef<GameController | null>(null);

  // Aplica um evento às missões, salva e enfileira as recém-concluídas (aviso).
  const fireMission = (e: MissionEvent) => {
    const r = applyEvent(missionRef.current, e);
    saveMissions(missionRef.current);
    if (r.completed.length) setToasts((prev) => [...prev, ...r.completed]);
  };

  if (!ref.current) {
    const g = new GameController({
      ...opts,
      userSubscriptionLevel,
      onDecision: ({ rating, heroType }) => {
        recordDecision(progressRef.current, rating);
        saveProgress(progressRef.current);
        fireMission({ type: "decision", rating, heroType });
      },
      onHeroHand: () => {
        recordHand(progressRef.current);
        saveProgress(progressRef.current);
        fireMission({ type: "hand" });
      },
      onTournamentEnd: ({ result, inMoney }) => {
        fireMission({ type: "tournamentEnd", result, inMoney });
      },
      onBubble: () => setCelebrateItm(true),
    });
    // Retoma o torneio mais recente, se houver (sair e voltar de onde parou).
    const recent = listSlots()[0];
    if (recent) {
      const snap = loadSlot(recent.buyIn);
      if (snap && snap.v === 1) {
        try {
          g.restore(snap);
        } catch {
          /* snapshot inválido — começa limpo */
        }
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
      }, 2500);
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
      // O slot já foi removido quando o torneio acabou (persist). Só limpa a UI.
      g.tournamentOver = false;
      g.tournament = null;
      force();
    },
    // Lista dos torneios salvos (um por faixa de buy-in), para a tela de setup.
    savedTournaments: () => listSlots(),
    resumeTournament: (buyIn: number) => {
      const snap = loadSlot(buyIn);
      if (snap && snap.v === 1) {
        try {
          g.restore(snap);
        } catch {
          /* snapshot inválido */
        }
      }
      force();
    },
    discardTournament: (buyIn: number) => {
      removeSlot(buyIn);
      if (g.tournament && g.tournament.buyIn === buyIn) g.tournament = null;
      force();
    },
    progress: () => summarize(progressRef.current),
    resetProgress: () => {
      progressRef.current = resetProgress();
      force();
    },
    missions: () => missionViews(missionRef.current),
    missionCounts: () => missionCounts(missionRef.current),
    resetMissions: () => {
      missionRef.current = resetMissions();
      force();
    },
    missionToasts: toasts,
    dismissMissionToasts: () => setToasts([]),
    celebrateItm,
    dismissItmCelebration: () => setCelebrateItm(false),
  };
}

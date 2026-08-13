// Hook React que embrulha o GameController e cuida do tempo dos bots.
//
// Quando a variante muda (Texas → Omaha ou vice-versa), o controller é
// RECRIADO com a nova variante para que a mesa, os bots e o feedback
// reflitam corretamente as regras de cada jogo.
import { useEffect, useReducer, useRef, useState, useCallback } from "react";
import { GameController, type GameOptions, type TournamentConfig, type UserSubscriptionLevel } from "./gameController";
import type { Action } from "../game/engine";
import type { Rating } from "../feedback/analyzer";
import {
  loadProgress,
  recordDecision,
  recordHand,
  saveProgress,
  resetProgress,
  summarize,
  recordPreflopFold,
  recordBadCall,
  recordCbet,
  recordBotFold,
  recordVpip,
  type ProgressState,
} from "./progress";
import { saveSlot, loadSlot, removeSlot, listSlots } from "./tournamentSlots";
import { recordTournamentDecision } from "../train/decisionStats";
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
import {
  isXpUnlocked,
  loadXpState,
  saveXpState,
  processXpEvent,
  type AchievementToast,
} from "./achievements";

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
  const [xpToasts, setXpToasts] = useState<AchievementToast[]>([]);
  const [celebrateItm, setCelebrateItm] = useState(false);
  const [finalTable, setFinalTable] = useState<{ players: number } | null>(null);
  const [headsUp, setHeadsUp] = useState<
    { heroStackBB: number; villainName: string; villainStackBB: number } | null
  >(null);
  const [champion, setChampion] = useState<{ entrants: number; cash: number } | null>(null);
  const ref = useRef<GameController | null>(null);
  // Rastreia a variante que o controller atual foi criado com.
  const variantRef = useRef<string>(opts?.variant ?? "holdem");

  // Aplica um evento às missões, salva e enfileira as recém-concluídas (aviso).
  const fireMission = (e: MissionEvent) => {
    const r = applyEvent(missionRef.current, e);
    saveMissions(missionRef.current);
    if (r.completed.length) setToasts((prev) => [...prev, ...r.completed]);
  };

  // Callbacks estáveis (memoizados) para não recriar o controller à toa.
  const onDecision = useCallback(
    ({
      rating,
      heroType,
      isPreflop,
      buyIn,
      heroBB,
      facingAllin,
      finalTable,
    }: {
      rating: Rating;
      heroType: string;
      isPreflop: boolean;
      buyIn?: number;
      heroBB?: number;
      facingAllin?: boolean;
      finalTable?: boolean;
    }) => {
      recordDecision(progressRef.current, rating);
      saveProgress(progressRef.current);
      fireMission({ type: "decision", rating, heroType });
      // Raio-X de torneio por buy-in — só decisões pré-flop do jogo de verdade.
      if (isPreflop && buyIn != null) recordTournamentDecision(buyIn, heroType);
      // XP + Achievements
      if (isXpUnlocked()) {
        const xpState = loadXpState();
        const result = processXpEvent(xpState, { type: "decision", rating, heroType, isPreflop, buyIn, heroBB, facingAllin, finalTable });
        saveXpState(result.state);
        if (result.newAchievements.length > 0) {
          setXpToasts((prev) => [...prev, ...result.newAchievements]);
        }
      }
    },
    [],
  );

  const onHeroHand = useCallback(() => {
    recordHand(progressRef.current);
    saveProgress(progressRef.current);
    fireMission({ type: "hand" });
    // XP: nova mão
    if (isXpUnlocked()) {
      const xpState = loadXpState();
      const result = processXpEvent(xpState, { type: "handOver" });
      saveXpState(result.state);
      if (result.newAchievements.length > 0) {
        setXpToasts((prev) => [...prev, ...result.newAchievements]);
      }
    }
  }, []);

  const onTournamentEnd = useCallback(({ result, inMoney }: { result: "campeao" | "eliminado"; inMoney: boolean }) => {
    fireMission({ type: "tournamentEnd", result, inMoney });
    // XP: torneio terminado
    if (isXpUnlocked()) {
      const xpState = loadXpState();
      const finishPlace = result === "campeao" ? 1 : undefined;
      const resultXp = processXpEvent(xpState, { type: "tournamentOver", finishPlace, inMoney });
      saveXpState(resultXp.state);
      if (resultXp.newAchievements.length > 0) {
        setXpToasts((prev) => [...prev, ...resultXp.newAchievements]);
      }
    }
  }, []);

  const onBubble = useCallback(() => {
    setCelebrateItm(true);
  }, []);

  const onFinalTable = useCallback((d: { players: number }) => {
    setFinalTable(d);
  }, []);

  const onHeadsUp = useCallback(
    (d: { heroStackBB: number; villainName: string; villainStackBB: number }) => {
      setHeadsUp(d);
    },
    [],
  );

  const onChampion = useCallback((d: { entrants: number; cash: number }) => {
    setChampion(d);
    // XP: vitória adicional
    if (isXpUnlocked()) {
      const xpState = loadXpState();
      const resultXp = processXpEvent(xpState, { type: "tournamentOver", finishPlace: 1, inMoney: true });
      saveXpState(resultXp.state);
      if (resultXp.newAchievements.length > 0) {
        setXpToasts((prev) => [...prev, ...resultXp.newAchievements]);
      }
    }
  }, []);

  // ---- Disciplina callbacks ----
  const onPreflopFold = useCallback((chipsSaved: number) => {
    recordPreflopFold(progressRef.current, chipsSaved);
    saveProgress(progressRef.current);
    fireMission({ type: "decision", rating: "boa", heroType: "fold" });
  }, []);

  const onBadCall = useCallback((chipsLost: number) => {
    recordBadCall(progressRef.current, chipsLost);
    saveProgress(progressRef.current);
  }, []);

  const onCbet = useCallback(() => {
    recordCbet(progressRef.current);
    saveProgress(progressRef.current);
  }, []);

  const onBotFolded = useCallback(() => {
    recordBotFold(progressRef.current);
    saveProgress(progressRef.current);
  }, []);

  const onHeroVpip = useCallback(() => {
    recordVpip(progressRef.current);
    saveProgress(progressRef.current);
  }, []);

  const createController = useCallback(() => {
    const g = new GameController({
      ...opts,
      userSubscriptionLevel,
      onDecision,
      onHeroHand,
      onTournamentEnd,
      onBubble,
      onFinalTable,
      onHeadsUp,
      onChampion,
      onPreflopFold,
      onBadCall,
      onCbet,
      onBotFolded,
      onHeroVpip,
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
    return g;
  }, [opts, userSubscriptionLevel, onDecision, onHeroHand, onTournamentEnd, onBubble, onFinalTable, onHeadsUp, onChampion, onPreflopFold, onBadCall, onCbet, onBotFolded, onHeroVpip]);

  // Cria o controller na primeira renderização.
  if (!ref.current) {
    ref.current = createController();
    variantRef.current = opts?.variant ?? "holdem";
  }

  // Quando a variante muda (Texas → Omaha ou vice-versa), recria o controller
  // para que a mesa, bots e feedback reflitam a variante correta.
  const currentVariant = opts?.variant ?? "holdem";
  if (variantRef.current !== currentVariant) {
    // Não pode trocar no meio de uma mão — espera o handOver.
    // Se estiver no meio de uma mão, marca para trocar no próximo handOver.
    if (ref.current && ref.current.phase === "handOver") {
      ref.current = createController();
      variantRef.current = currentVariant;
    }
    // Se estiver no meio de uma mão, a troca acontece quando o jogador
    // clicar em "Nova Mão" (que chama newHand → que passa por handOver).
    // Enquanto isso, a UI mostra o toggle mas a mesa atual continua.
  }

  const g = ref.current;
  const [, force] = useReducer((x) => x + 1, 0);

  // Enquanto for a vez de um bot, agenda UM passo com atraso (para assistir).
  // Ritmo de mesa ao vivo: rápido o bastante para não cansar, lento o bastante
  // para ver a ficha andar. Ações "quietas" (fold/check da jogada anterior)
  // correm mais; aposta/raise dá um respiro pro drama.
  useEffect(() => {
    if (g.phase === "playing" && !g.table.handOver && !g.isHeroTurn()) {
      const last = g.table.lastAggressor >= 0 ? g.table.currentBet : 0;
      const quiet = last <= g.table.bigBlind; // ninguém aumentou ainda nesta rua
      const delay = quiet ? 720 : 1050;
      const id = setTimeout(() => {
        g.botStep();
        persist(g);
        force();
      }, delay);
      return () => clearTimeout(id);
    }
  });

  return {
    xpToasts,
    dismissXpToasts: () => setXpToasts([]),
    controller: g,
    heroAct: (a: Action) => {
      g.heroAct(a);
      persist(g);
      force();
    },
    newHand: () => {
      // Se a variante mudou e estamos no handOver, recria o controller
      // antes de iniciar a nova mão.
      if (variantRef.current !== currentVariant) {
        ref.current = createController();
        variantRef.current = currentVariant;
        force();
        return;
      }
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
      saveProgress(progressRef.current);
      force();
    },
    missions: () => missionViews(missionRef.current),
    missionCounts: () => missionCounts(missionRef.current),
    resetMissions: () => {
      missionRef.current = resetMissions();
      saveMissions(missionRef.current);
      force();
    },
    missionToasts: toasts,
    dismissMissionToasts: () => setToasts([]),
    celebrateItm,
    dismissItmCelebration: () => setCelebrateItm(false),
    finalTable,
    dismissFinalTable: () => setFinalTable(null),
    headsUp,
    dismissHeadsUp: () => setHeadsUp(null),
    champion,
    dismissChampion: () => setChampion(null),
  };
}

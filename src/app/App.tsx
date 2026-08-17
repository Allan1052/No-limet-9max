import { useState, useEffect, useRef, Suspense } from "react";
import { useGame } from "./useGame";
import { updateAvailable, applyUpdate, onUpdateAvailable, checkForUpdate } from "./pwaUpdate";
import { PokerTable } from "../ui/Table";
import { Controls } from "../ui/Controls";
import { Replayer } from "../ui/Replayer";
import { TournamentSummary } from "../ui/TournamentSummary";
import { IcmCalculator, TournamentSetup, RangeGrid, MissionsPanel } from "./LazyViews";
import { MissionToast } from "../ui/MissionToast";
import { AchievementsPanel } from "./LazyViews";
import { SessionHistoryPanel } from "../ui/SessionHistoryPanel";
import { HandHistoryPanel } from "../ui/HandHistoryPanel";
import { LeaksPanel } from "../ui/LeaksPanel";
import { HandActions } from "../ui/HandActions";
import { AchievementToastPopup } from "../ui/AchievementToast";
import { isXpUnlocked } from "./achievements";

// Get the base URL from the manifest or default to '/'
function getBasePath(): string {
  const base = document.querySelector('script[type="module"]')?.getAttribute('src') || '';
  // Extract base path from script src (e.g., "/No-limet-9max/assets/index-xxx.js")
  // Exclude /assets/ — it's the Vite assets folder, not the base path
  const match = base.match(/^(\/[a-zA-Z][^/]+\/(?:assets|dist)\/)/);
  if (match) {
    return match[1].replace(/\/(?:assets|dist)\/$/, '/');
  }
  // Fallback: detect if we're at root (no project folder in path)
  const rootMatch = base.match(/^(\/assets\/)/);
  if (rootMatch) return '/';
  // Old format: /ProjectName/assets/...
  const legacy = base.match(/^(\/[^/]+\/)/);
  return legacy ? legacy[1] : '/';
}
import {
  UltraTrainer,
  StreetTrainer,
  DrillView,
  HandLab,
  CampaignView,
  TrainView,
  LearnTrailView,
  ImportView,
  Leaderboard,
  AnatomiaTorneio,
  ProfileView,
  FinalTableTrainer,
} from "./LazyViews";
import { BottomNav, HubSubNav, type AppView } from "../ui/BottomNav";
import { ProgressPanel } from "../ui/ProgressPanel";
import { Onboarding } from "../ui/Onboarding";
import { markFirstOpen } from "../ui/AvatarSelector";
import { GuidedHand, hasSeenGuidedHand, markGuidedHandDone } from "../ui/GuidedHand";
import { SeatStatsPopup } from "../ui/SeatStatsPopup";
import { SpotRangePopup } from "../ui/SpotRangePopup";
import { handSpots } from "./handSpots";
import { getParticipantSeats } from "./handParticipants";
import { HandTipsModal } from "../ui/HandTipsModal";
import { heroBBBefore } from "../ui/handDepth";
import { MoneyRain } from "../ui/MoneyRain";
import { TourneyMilestone } from "../ui/TourneyMilestone";
import { ChallengeReceived } from "../ui/ChallengeReceived";
import { SplashScreen } from "../ui/SplashScreen";
import { readChallengeFromUrl } from "./challenge";
import { useT } from "../i18n";
import { useSettings } from "./settings";
import { createLeakDrillSession, planForLeak } from "../train/leakTraining";
import { isDevUnlocked } from "../lib/devLock";
import { UserSubscriptionLevel } from "./gameController";
import { legalActions } from "../game/betting";
import { addTournamentResult } from "./resultsLog";
import { appendHandLog } from "./handHistoryLog";
import "../ui/theme.css";

// Placeholder discreto para funcionalidades travadas atrás da senha de
// teste (rua2026). Mostra uma mensagem neutra e devolve o usuário ao Treino.
function DevLockedPlaceholder({ onGo }: { onGo: () => void }) {
  return (
    <div className="play" style={{ textAlign: "center", padding: "48px 20px" }}>
      <p style={{ color: "var(--muted, #9aa39e)", fontSize: 15, marginBottom: 16 }}>
        🔒 Funcionalidade em teste — indisponível no momento.
      </p>
      <button className="btn primary" onClick={onGo}>
        Voltar ao Treino
      </button>
    </div>
  );
}

export function App() {
  const { t: tr } = useT();
  const { onboarded, setOnboarded, mode } = useSettings();
  // TODO: Obter o nível de assinatura real do usuário (do Supabase ou contexto)
  // Mapeia o mode de UI (simples/tecnico) para o nível de feedback (free/technical/ultra)
  // Quando o usuário troca de modo, o level muda junto
  const effectiveLevel: UserSubscriptionLevel = mode === "tecnico" ? "technical" : "free";
  const [splashComplete, setSplashComplete] = useState(false);
  const [guidedDone, setGuidedDone] = useState<boolean>(() => hasSeenGuidedHand());
  const [gameVariant, setGameVariant] = useState<"holdem" | "omaha">("holdem");
  const [omahaUnlocked, setOmahaUnlocked] = useState<boolean>(() => {
    return localStorage.getItem("omaha_dev_unlock") === "true";
  });
  const {
    controller,
    heroAct,
    newHand,
    startTournament,
    dismissSummary,
    progress,
    resetProgress,
    savedTournaments,
    resumeTournament,
    discardTournament,
    missions,
    missionCounts,
    resetMissions,
    missionToasts,
    dismissMissionToasts,
    celebrateItm,
    dismissItmCelebration,
    finalTable,
    dismissFinalTable,
    headsUp,
    dismissHeadsUp,
    champion,
    dismissChampion,
    xpToasts,
    dismissXpToasts,
  } = useGame(effectiveLevel, { variant: gameVariant });
  // Diário de resultados ("Trophy Room"): grava no aparelho do jogador
  // uma única vez por torneio concluído, com todos os dados do summary.
  const summaryRef = useRef<string>("");
  useEffect(() => {
    if (controller.tournamentOver && controller.tournamentSummary()) {
      const s = controller.tournamentSummary()!;
      const key = `${s.buyIn}:${s.mode}:${s.finishPlace}:${s.cash}`;
      if (summaryRef.current !== key) {
        summaryRef.current = key;
        addTournamentResult({
          finishPlace: s.finishPlace,
          entrants: s.entrants,
          buyIn: s.buyIn,
          cash: s.cash,
          inMoney: s.inMoney,
          mode: s.mode,
          circuitStage: s.circuitStage,
          timestamp: Date.now(),
        });
        // Histórico de mãos: grava as decisões não-"boa" da sessão (com
        // contexto do torneio) para o filtro por tipo de erro no app.
        appendHandLog(
          (s.review ?? []).map((item) => ({
            item,
            buyIn: s.buyIn,
            mode: s.mode,
            circuitStage: s.circuitStage,
            entrants: s.entrants,
            timestamp: Date.now(),
          })),
        );
      }
    } else {
      summaryRef.current = "";
    }
  }, [controller.tournamentOver, controller.tournamentSummary()]);

  // Esconde a landing page overlay quando o app está pronto
  useEffect(() => {
    const lh = document.getElementById("landing-hero");
    if (lh) {
      setTimeout(() => {
        lh.style.transition = "opacity 0.4s ease";
        lh.style.opacity = "0";
        setTimeout(() => { lh.style.display = "none"; }, 400);
      }, 1200);
    }
  }, []);

  const [challenge, setChallenge] = useState(() => readChallengeFromUrl());
  const [replayOpen, setReplayOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLogOpen, setHistoryLogOpen] = useState(false);
  const [leaksOpen, setLeaksOpen] = useState(false);
  // Treino dirigido: sessão montada pelo painel de leaks para o DrillView.
  const [leakTrainingSession, setLeakTrainingSession] = useState<{ session: any; focus: string; leakId: string; leakTitle: string } | null>(null);
  const [historyReplayIdx, setHistoryReplayIdx] = useState<number | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [view, setView] = useState<AppView>("play");

  // Navegação programática via evento customizado (ex: banners clicáveis)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail === "string") {
        setView(detail as AppView);
      }
    };
    window.addEventListener("nav-to", handler);
    return () => window.removeEventListener("nav-to", handler);
  }, []);

  // "Treinar esse spot" da Sua Mão: abre o Treino 1×1 (view "ultra") já com o
  // spot analisado — o UltraTrainer lê o spec do localStorage no mount.
  useEffect(() => {
    const handler = () => setView("ultra");
    window.addEventListener("cof-open-ultra", handler);
    return () => window.removeEventListener("cof-open-ultra", handler);
  }, []);

  // "Treinar rua por rua" da Sua Mão: abre o Treino Rua por Rua (view "street")
  // já com a mão, posição e stack do jogador — o StreetTrainer lê o spec no mount.
  useEffect(() => {
    const handler = () => setView("street");
    window.addEventListener("cof-open-street", handler);
    return () => window.removeEventListener("cof-open-street", handler);
  }, []);
  const t = controller.table;
  const la = legalActions(t);
  const heroTurn = controller.isHeroTurn();
  const handOver = controller.phase === "handOver";
  // A barra de baixo some durante a mão (na mesa), pra os controles de ação
  // (Raise/All-in, % e slider) ficarem com espaço total sem a nav atrapalhando.
  // Ela volta entre as mãos e nas outras telas.
  const navHidden = view === "play" && !handOver;

  // HUD do torneio no topo (linha das abas), à direita — estilo GGPoker.
  const fs = controller.fieldStatus();
  const isCircuit = controller.tournament?.mode === "circuito";
  const circuitStage = controller.tournament?.circuitStage;
  const playInfo =
    view === "play" ? (
      <div className="tstatus">
        {fs ? (
          <>
            <span className="ts-seg ts-rank">
              {fs.heroRank}º<i>/{fs.remaining.toLocaleString("en-US")}</i>
            </span>
            <span className={`ts-seg${fs.inMoney ? " itm" : ""}`}>
              {fs.inMoney
                ? `ITM $${Math.round(fs.currentCash).toLocaleString("en-US")}`
                : `🎯 ${fs.toBubble} p/ bolha`}
            </span>
            {/* Barra de progresso visual: quanto falta pro dinheiro */}
            <div className="ts-progress" title={`Falta ${fs.toBubble} bustar pro dinheiro`}>
              <div
                className="ts-progress-fill"
                style={{ width: `${Math.max(5, Math.min(100, ((fs.entrants - fs.remaining) / fs.entrants) * 100))}%` }}
              />
            </div>
          </>
        ) : null}
        <span className="ts-seg ts-blinds">
          {t.smallBlind}/{t.bigBlind}
          {t.ante ? ` · a${t.ante}` : ""}
        </span>
      </div>
    ) : null;

  // Sinal global para o SW saber quando é seguro recarregar
  useEffect(() => {
    window.__HAND_OVER = handOver;
  }, [handOver]);

  // Atualização do app: avisa quando há versão nova e recarrega num momento
  // seguro (entre mãos, na tela de jogo) para não interromper uma decisão nem
  // fazer perder algo digitado em outra aba (ex.: colar mãos no Importar).
  const [updateReady, setUpdateReady] = useState(updateAvailable());
  useEffect(() => onUpdateAvailable(() => setUpdateReady(true)), []);

  // Botão "Atualizar" SEMPRE disponível: verifica em silêncio se o servidor já
  // está servindo versão nova (a cada 10 min + quando o app volta do segundo
  // plano). Assim o banner/botão aparece mesmo sem o SW avisar. (16/08)
  useEffect(() => {
    // Checagem inicial 15s após o splash (não atrapalha a abertura)
    const warmup = setTimeout(() => {
      checkForUpdate().catch(() => undefined);
    }, 15000);
    // Quando o app volta do segundo plano
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        checkForUpdate().catch(() => undefined);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    // Checagem periódica a cada 10 min
    const interval = setInterval(() => {
      checkForUpdate().catch(() => undefined);
    }, 10 * 60 * 1000);
    return () => {
      clearTimeout(warmup);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  useEffect(() => {
    if (!updateReady) return;
    if (view !== "play" || !handOver) return; // só recarrega sozinho entre mãos
    const id = setTimeout(() => applyUpdate(), 1500);
    return () => clearTimeout(id);
  }, [updateReady, view, handOver]);

  const rows = controller.statRows();
  const selectedRow = selectedSeat != null ? rows.find((r) => r.seat === selectedSeat) : null;

  // Modo avançado + mão finalizada: clicar num jogador mostra o range que ele
  // deveria jogar naquele spot, com a mão real dele em destaque.
  const spots = handOver && controller.lastHand ? handSpots(controller.lastHand) : [];
  const participantSeats = handOver && controller.lastHand ? getParticipantSeats(controller.lastHand) : [];
  const selectedSpot =
    mode === "tecnico" && selectedSeat != null ? spots.find((s) => s.seat === selectedSeat) : null;

  // Dica opcional: o que a linha de base recomendaria na sua vez.
  const advice = heroTurn ? controller.computeHeroAdvice() : null;
  const hint = advice ? tr("hint.baseline", { action: adviceLabel(advice.action) }) : undefined;

  if (!splashComplete) {
    return <SplashScreen onComplete={() => setSplashComplete(true)} />;
  }

  return (
    <div className={`app${navHidden ? " nav-hidden" : ""}`}>
      {updateReady ? (
        <div className="update-banner">
          <span>✨ {tr("update.available")}</span>
          <button className="btn primary" onClick={applyUpdate}>
            {tr("update.button")}
          </button>
        </div>
      ) : null}
      <div className="topbar">
        <div className="brand">
          <img src={`${getBasePath()}brand-logo-splash.png`} alt="Call ou Fold" className="brand-logo" />
          <div className="brand-text">
            <span className="brand-name">
              Call<em>ou</em>Fold
            </span>
            <small>aqui é possível</small>
          </div>
        </div>
        {isCircuit && view === "play" ? (
          <div className="topbar-circuit">
            🏆 Circuito{circuitStage ? ` E${circuitStage}` : ""}
          </div>
        ) : null}
      </div>

            <HubSubNav view={view} setView={setView} info={playInfo} />
      <div key={view} className="view-enter">
      {view === "icm" ? (
        <Suspense><IcmCalculator /></Suspense>
      ) : view === "ultra" ? (
        <Suspense><UltraTrainer /></Suspense>
      ) : view === "street" ? (
        isDevUnlocked("rua2026") ? (
          <Suspense><StreetTrainer /></Suspense>
        ) : (
          <DevLockedPlaceholder onGo={() => setView("treino")} />
        )
      ) : view === "drill" ? (
        isDevUnlocked("rua2026") ? (
          <Suspense><DrillView leakSession={leakTrainingSession} /></Suspense>
        ) : (
          <DevLockedPlaceholder onGo={() => setView("treino")} />
        )
      ) : view === "ft" ? (
        <Suspense><FinalTableTrainer /></Suspense>
      ) : view === "suamao" ? (
        <Suspense><HandLab /></Suspense>
      ) : view === "campanha" ? (
        <Suspense><CampaignView /></Suspense>
      ) : view === "treino" ? (
        <Suspense><TrainView /></Suspense>
      ) : view === "aprenda" ? (
        <Suspense><LearnTrailView /></Suspense>
      ) : view === "ranking" ? (
        <Suspense><Leaderboard /></Suspense>
      ) : view === "anatomia" ? (
        <Suspense><AnatomiaTorneio /></Suspense>
      ) : view === "perfil" ? (
        <Suspense><ProfileView
          gameVariant={gameVariant}
          setGameVariant={setGameVariant}
          omahaUnlocked={omahaUnlocked}
          setOmahaUnlocked={setOmahaUnlocked}
          onOpenProgress={() => setProgressOpen(true)}
          onOpenAchievements={() => setAchievementsOpen(true)}
          onOpenHistory={() => setHistoryLogOpen(true)}
          buildLabel={formatBuild(__BUILD_ID__)}
          onCheckUpdate={forceUpdate}
        /></Suspense>
      ) : view === "importar" ? (
        <Suspense><ImportView /></Suspense>
      ) : view === "missoes" ? (
        <Suspense><MissionsPanel
          missions={missions()}
          done={missionCounts().done}
          total={missionCounts().total}
          onReset={resetMissions}
        /></Suspense>
      ) : view === "ranges" ? (
        <Suspense><RangeGrid /></Suspense>
      ) : view === "torneio" ? (
        <Suspense><TournamentSetup
          saved={savedTournaments()}
          onResume={(buyIn) => {
            resumeTournament(buyIn);
            setView("play");
          }}
          onDiscard={discardTournament}
          onStart={(cfg) => {
            startTournament(cfg);
            setView("play");
          }}
        /></Suspense>
      ) : (
        <div className="play">
          <PokerTable
            table={t}
            lastActionLabel={controller.lastActionLabel}
            hint={heroTurn ? hint : undefined}
            onSelectSeat={setSelectedSeat}
            onShowTips={() => setTipsOpen(true)}
            showTips={handOver && controller.feedback.length > 0}
            celebrate={celebrateItm}
            updateReady={updateReady}
            onUpdate={applyUpdate}
            rangeSeats={participantSeats}
            buyIn={controller.tournament?.buyIn}
          />

          {handOver ? (
            <div className="controls action-row">
              <button className="btn primary" onClick={() => { if (controller.tournamentOver) dismissSummary(); newHand(); }}>
                {tr("btn.newHand")}
              </button>
              <button className="btn" disabled={!controller.lastHand} onClick={() => setReplayOpen(true)}>
                {tr("btn.reviewHand")}
              </button>
              {controller.lastHand ? (
                <HandActions hand={controller.lastHand} feedback={controller.feedback} />
              ) : null}
              <button className="btn" onClick={() => setProgressOpen(true)}>
                📊 {tr("btn.progress")}
              </button>
              {isXpUnlocked() ? (
                <button className="btn" onClick={() => setAchievementsOpen(true)}>
                  🏆 Conquistas
                </button>
              ) : null}
              <button className="btn" onClick={() => setHistoryOpen(true)}>
                📋 Mãos desta sessão
              </button>
              <button className="btn" onClick={() => setLeaksOpen(true)}>
                🎯 Pontos fracos
              </button>
              <button
                className="btn"
                disabled={controller.handLog.length === 0}
                onClick={() => downloadText(controller.exportSessionText())}
              >
                {tr("btn.exportHands")} ({controller.handLog.length})
              </button>
              {controller.messageKey ? (
                <div className="message">{tr(controller.messageKey, controller.messageVars)}</div>
              ) : null}
            </div>
          ) : (
            <Controls
              legal={la}
              active={heroTurn}
              pot={controller.pot}
              bigBlind={t.bigBlind}
              onAction={heroAct}
              isOmaha={t.variant === "omaha"}
              defaultRaiseTo={controller.suggestedRaiseTo()}
            />
                    )}
        </div>
      )}
      </div>
      {replayOpen && controller.lastHand ? (
        <Replayer
          hand={controller.lastHand}
          feedback={controller.feedback}
          onClose={() => setReplayOpen(false)}
        />
      ) : null}

      {historyReplayIdx !== null && controller.handLog[historyReplayIdx] ? (
        <Replayer
          hand={controller.handLog[historyReplayIdx]}
          feedback={controller.handLog[historyReplayIdx].handFeedback ?? []}
          onClose={() => setHistoryReplayIdx(null)}
        />
      ) : null}

      {historyOpen ? (
        <div className="overlay" onClick={() => setHistoryOpen(false)}>
          <div className="replay progress-modal hh-modal" onClick={(e) => e.stopPropagation()}>
            <SessionHistoryPanel
              hands={controller.handLog}
              onClose={() => setHistoryOpen(false)}
              onSelectHand={(idx) => {
                setHistoryOpen(false);
                setHistoryReplayIdx(idx);
              }}
            />
          </div>
        </div>
      ) : null}

      {historyLogOpen ? (
        <div className="overlay" onClick={() => setHistoryLogOpen(false)}>
          <div className="replay progress-modal hh-modal" onClick={(e) => e.stopPropagation()}>
            <HandHistoryPanel />
            <button className="btn" style={{ width: "100%" }} onClick={() => setHistoryLogOpen(false)}>
              fechar
            </button>
          </div>
        </div>
      ) : null}

      {leaksOpen ? (
        <LeaksPanel
          hands={controller.handLog}
          onClose={() => setLeaksOpen(false)}
          onTrainLeak={(leak) => {
            // Monta o drill dirigido e leva o jogador direto ao treino.
            const sess = createLeakDrillSession(leak.id);
            if (!sess) {
              // Sem drill dirigido (leaks pós-flop): estuda as mãos do painel.
              setLeaksOpen(true);
              return;
            }
            const plan = planForLeak(leak.id);
            setLeakTrainingSession({
              session: sess,
              focus: plan?.focus ?? "",
              leakId: leak.id,
              leakTitle: leak.title,
            });
            setView("drill");
            setLeaksOpen(false);
          }}
          trainingLocked={!isDevUnlocked("rua2026")}
        />
      ) : null}

      {tipsOpen ? (
        <HandTipsModal
          items={controller.feedback}
          itemsFree={controller.feedbackFree}
          itemsTechnical={controller.feedbackTechnical}
          heroHand={controller.lastHand?.holeCards[controller.heroSeat] ?? []}
          userSubscriptionLevel={effectiveLevel}
          board={controller.lastHand?.finalBoard ?? []}
          heroPosition={controller.lastHand?.heroPosition}
          heroBB={
            controller.lastHand
              ? (heroBBBefore(controller.lastHand, controller.lastHand.events.length) ?? undefined)
              : undefined
          }
          onClose={() => setTipsOpen(false)}
        />
      ) : null}

      {selectedSpot ? (
        <SpotRangePopup spot={selectedSpot} onClose={() => setSelectedSeat(null)} />
      ) : selectedRow ? (
        <SeatStatsPopup row={selectedRow} onClose={() => setSelectedSeat(null)} />
      ) : null}

      {progressOpen ? (
        <div className="overlay" onClick={() => setProgressOpen(false)}>
          <div className="replay progress-modal" onClick={(e) => e.stopPropagation()}>
            <ProgressPanel summary={progress()} onReset={resetProgress} />
            <button className="btn" style={{ width: "100%" }} onClick={() => setProgressOpen(false)}>
              fechar
            </button>
          </div>
        </div>
      ) : null}

      {controller.tournamentOver && controller.tournamentSummary() ? (
        <TournamentSummary
          summary={controller.tournamentSummary()!}
          onClose={() => {
            dismissSummary();
            setView("torneio");
          }}
          onNewHand={() => {
            dismissSummary();
            newHand();
            setView("torneio");
          }}
        />
      ) : null}

      {/* Onboarding: mostra na primeira vez que abre o app */}
      {!onboarded ? (
        <Onboarding onClose={() => { setOnboarded(true); markFirstOpen(); }} />
      ) : null}
      {/* Mão guiada: primeira vez que o usuário entra no jogo (após onboarding) */}
      {onboarded && !guidedDone ? (
        <GuidedHand onDone={() => {
          markGuidedHandDone();
          setGuidedDone(true);
        }} />
      ) : null}

      {challenge ? (
        <ChallengeReceived
          scenario={challenge}
          onPlay={() => {
            setChallenge(null);
            try {
              history.replaceState(null, "", location.pathname);
            } catch {
              /* ignora */
            }
          }}
        />
      ) : null}

      <MissionToast missions={missionToasts} onDismiss={dismissMissionToasts} />

      {isXpUnlocked() ? (
        <AchievementToastPopup toasts={xpToasts} onDismiss={dismissXpToasts} />
      ) : null}

      {achievementsOpen ? (
        <AchievementsPanel onClose={() => setAchievementsOpen(false)} />
      ) : null}

      {celebrateItm ? <MoneyRain onDone={dismissItmCelebration} /> : null}

      {finalTable ? (
        <TourneyMilestone kind="finalTable" players={finalTable.players} onDone={dismissFinalTable} />
      ) : null}

      {headsUp ? (
        <TourneyMilestone
          kind="headsUp"
          heroBB={headsUp.heroStackBB}
          villain={{ name: headsUp.villainName, stackBB: headsUp.villainStackBB }}
          onDone={dismissHeadsUp}
        />
      ) : null}

      {champion ? (
        <TourneyMilestone
          kind="champion"
          players={champion.entrants}
          cash={champion.cash}
          onDone={dismissChampion}
        />
      ) : null}

      <div className={`app-seal${view === "play" ? " on-play" : ""}`}>
        <img src={`${getBasePath()}brand-icon-192.png`} alt="Call ou Fold" className="app-seal-icon" />
        <span>{tr("disclaimer")}</span>
      </div>

      <BottomNav view={view} setView={setView} hidden={navHidden} />
    </div>
  );
}

/**
 * Formata o carimbo de versão (ISO em UTC gerado no build) no FUSO LOCAL do
 * jogador — ex.: um usuário no Brasil vê a hora dele, não a do servidor.
 */
function formatBuild(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso; // formato antigo: mostra como veio
  const p = (n: number) => String(n).padStart(2, "0");
  // Curto (DD/MM/AA) para caber na mesma linha do Simples/Técnico + idiomas.
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
}

/**
 * Força a atualização do app: desregistra o service worker antigo, limpa os
 * caches e recarrega buscando tudo da rede. É o jeito mais garantido de puxar a
 * versão nova quando o PWA instalado ficou preso numa versão em cache.
 */
async function forceUpdate(): Promise<void> {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
    }
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* segue para o reload mesmo se algo falhar */
  }
  // Cache-buster: força buscar o index.html novo da rede (evita apontar para um
  // bundle antigo que já foi removido do servidor e causaria tela branca).
  // Remove um cache-buster anterior antes de pôr o novo (não acumula na URL).
  const url = new URL(location.href);
  url.searchParams.delete("u");
  url.searchParams.set("u", Date.now().toString());
  location.replace(url.toString());
}

/** Dispara o download de um texto como arquivo .txt (histórico da sessão). */
function downloadText(text: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `call-ou-fold-maos-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function adviceLabel(a: string): string {
  const map: Record<string, string> = {
    fold: "Fold",
    check: "Check",
    call: "Call",
    raise: "Raise",
    bet: "Apostar",
    "3bet": "3-bet",
    jam: "All-in",
  };
  return map[a] ?? a;
}

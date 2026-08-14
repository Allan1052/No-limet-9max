import { useState, useEffect } from "react";
import { useGame } from "./useGame";
import { updateAvailable, applyUpdate, onUpdateAvailable } from "./pwaUpdate";
import { PokerTable } from "../ui/Table";
import { Controls } from "../ui/Controls";
import { Replayer } from "../ui/Replayer";
import { TournamentSummary } from "../ui/TournamentSummary";
import { IcmCalculator } from "../ui/IcmCalculator";
import { TournamentSetup } from "../ui/Tournament";
import { RangeGrid } from "../ui/RangeGrid";
import { MissionsPanel } from "../ui/MissionsPanel";
import { MissionToast } from "../ui/MissionToast";
import { AchievementsPanel } from "../ui/AchievementsPanel";
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
import { TrainView } from "../ui/TrainView";
import { UltraTrainer } from "../ui/UltraTrainer";
import { DrillView } from "../ui/DrillView";
import { HandLab } from "../ui/HandLab";
import { CampaignView } from "../ui/CampaignView";
import { ImportView } from "../ui/ImportView";
import { Leaderboard } from "../ui/Leaderboard";
import { AnatomiaTorneio } from "../ui/AnatomiaTorneio";
import { BottomNav, HubSubNav, type AppView } from "../ui/BottomNav";
import { ProfileView } from "../ui/ProfileView";
import { ProgressPanel } from "../ui/ProgressPanel";
import { Onboarding } from "../ui/Onboarding";
import { markFirstOpen } from "../ui/AvatarSelector";
import { GuidedHand, hasSeenGuidedHand, markGuidedHandDone } from "../ui/GuidedHand";
import { SeatStatsPopup } from "../ui/SeatStatsPopup";
import { SpotRangePopup } from "../ui/SpotRangePopup";
import { handSpots } from "./handSpots";
import { getParticipantSeats } from "./handParticipants";
import { HandTipsModal } from "../ui/HandTipsModal";
import { MoneyRain } from "../ui/MoneyRain";
import { TourneyMilestone } from "../ui/TourneyMilestone";
import { ChallengeReceived } from "../ui/ChallengeReceived";
import { SplashScreen } from "../ui/SplashScreen";
import { readChallengeFromUrl } from "./challenge";
import { useT } from "../i18n";
import { useSettings } from "./settings";
import { UserSubscriptionLevel } from "./gameController";
import { legalActions } from "../game/betting";
import "../ui/theme.css";

export function App() {
  const { t: tr } = useT();
  const { onboarded, setOnboarded, mode } = useSettings();
  // TODO: Obter o nível de assinatura real do usuário (do Supabase ou contexto)
  const [userSubscriptionLevel] = useState<UserSubscriptionLevel>(() => mode === "tecnico" ? "technical" : "free");
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
  const [leaksOpen, setLeaksOpen] = useState(false);
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

      {view === "icm" ? (
        <IcmCalculator />
      ) : view === "ultra" ? (
        <UltraTrainer />
      ) : view === "drill" ? (
        <DrillView />
      ) : view === "suamao" ? (
        <HandLab />
      ) : view === "campanha" ? (
        <CampaignView />
      ) : view === "treino" ? (
        <TrainView />
      ) : view === "ranking" ? (
        <Leaderboard />
      ) : view === "anatomia" ? (
        <AnatomiaTorneio />
      ) : view === "perfil" ? (
        <ProfileView
          gameVariant={gameVariant}
          setGameVariant={setGameVariant}
          omahaUnlocked={omahaUnlocked}
          setOmahaUnlocked={setOmahaUnlocked}
          onOpenProgress={() => setProgressOpen(true)}
          onOpenAchievements={() => setAchievementsOpen(true)}
          buildLabel={formatBuild(__BUILD_ID__)}
          onCheckUpdate={forceUpdate}
        />
      ) : view === "importar" ? (
        <ImportView />
      ) : view === "missoes" ? (
        <MissionsPanel
          missions={missions()}
          done={missionCounts().done}
          total={missionCounts().total}
          onReset={resetMissions}
        />
      ) : view === "ranges" ? (
        <RangeGrid />
      ) : view === "torneio" ? (
        <TournamentSetup
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
        />
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
          />

          {handOver ? (
            <div className="controls action-row">
              <button className="btn primary" onClick={newHand}>
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
                📋 Histórico
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
        <HandHistoryPanel
          hands={controller.handLog}
          onClose={() => setHistoryOpen(false)}
          onSelectHand={(idx) => {
            setHistoryOpen(false);
            setHistoryReplayIdx(idx);
          }}
        />
      ) : null}

      {leaksOpen ? (
        <LeaksPanel hands={controller.handLog} onClose={() => setLeaksOpen(false)} />
      ) : null}

      {tipsOpen ? (
        <HandTipsModal
          items={controller.feedback}
          heroHand={controller.lastHand?.holeCards[controller.heroSeat] ?? []}
          userSubscriptionLevel={userSubscriptionLevel}
          board={controller.lastHand?.finalBoard ?? []}
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

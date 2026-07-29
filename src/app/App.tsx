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
import { TrainView } from "../ui/TrainView";
import { UltraTrainer } from "../ui/UltraTrainer";
import { CampaignView } from "../ui/CampaignView";
import { ImportView } from "../ui/ImportView";
import { InstallButton } from "../ui/InstallButton";
import { LangSelect } from "../ui/LangSelect";
import { ModeToggle } from "../ui/ModeToggle";
import { ProgressPanel } from "../ui/ProgressPanel";
import { Onboarding } from "../ui/Onboarding";
import { SeatStatsPopup } from "../ui/SeatStatsPopup";
import { SpotRangePopup } from "../ui/SpotRangePopup";
import { handSpots } from "./handSpots";
import { HandTipsModal } from "../ui/HandTipsModal";
import { MoneyRain } from "../ui/MoneyRain";
import { ChallengeReceived } from "../ui/ChallengeReceived";
import { readChallengeFromUrl } from "./challenge";
import { useT } from "../i18n";
import { useSettings } from "./settings";
import { legalActions } from "../game/betting";
import "../ui/theme.css";

export function App() {
  const { t: tr } = useT();
  const { onboarded, setOnboarded, mode } = useSettings();
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
  } = useGame();
  const [challenge, setChallenge] = useState(() => readChallengeFromUrl());
  const [replayOpen, setReplayOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [view, setView] = useState<
    "play" | "icm" | "torneio" | "ranges" | "missoes" | "treino" | "importar" | "ultra" | "campanha"
  >("play");
  const t = controller.table;
  const la = legalActions(t);
  const heroTurn = controller.isHeroTurn();
  const handOver = controller.phase === "handOver";

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
  const selectedSpot =
    mode === "tecnico" && selectedSeat != null ? spots.find((s) => s.seat === selectedSeat) : null;

  // Dica opcional: o que a linha de base recomendaria na sua vez.
  const advice = heroTurn ? controller.computeHeroAdvice() : null;
  const hint = advice ? tr("hint.baseline", { action: adviceLabel(advice.action) }) : undefined;

  return (
    <div className="app">
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
          <span className="brand-mono" aria-hidden="true">
            <b>C</b>
            <i>F</i>
          </span>
          <span className="brand-text">
            <span className="brand-name">
              Call<em>ou</em>Fold
            </span>
            <small>aqui é possível</small>
          </span>
        </div>
        <div className="tabs">
          <button className={`tab ${view === "play" ? "active" : ""}`} onClick={() => setView("play")}>
            {tr("tab.play")}
          </button>
          <button
            className={`tab ${view === "torneio" ? "active" : ""}`}
            onClick={() => setView("torneio")}
          >
            {tr("tab.tournament")}
          </button>
          <button
            className={`tab ${view === "treino" ? "active" : ""}`}
            onClick={() => setView("treino")}
          >
            {tr("tab.train")}
          </button>
          <button
            className={`tab tab-ultra ${view === "ultra" ? "active" : ""}`}
            onClick={() => setView("ultra")}
          >
            {tr("tab.ultra")}
          </button>
          <button
            className={`tab tab-mission ${view === "campanha" ? "active" : ""}`}
            onClick={() => setView("campanha")}
          >
            {tr("tab.mission")}
          </button>
          <button
            className={`tab ${view === "importar" ? "active" : ""}`}
            onClick={() => setView("importar")}
          >
            {tr("tab.import")}
          </button>
          <button
            className={`tab ${view === "missoes" ? "active" : ""}`}
            onClick={() => setView("missoes")}
          >
            {tr("tab.missions")}
          </button>
          <button
            className={`tab ${view === "ranges" ? "active" : ""}`}
            onClick={() => setView("ranges")}
          >
            {tr("tab.ranges")}
          </button>
          <button className={`tab ${view === "icm" ? "active" : ""}`} onClick={() => setView("icm")}>
            {tr("tab.icm")}
          </button>
        </div>
        <div className="topbar-right">
          <div className="topbar-controls">
            <ModeToggle />
            <button
              className="build-id"
              title={tr("version.update")}
              onClick={forceUpdate}
            >
              🔄 {formatBuild(__BUILD_ID__)}
            </button>
            <LangSelect />
          </div>
          <InstallButton />
          <span className="disclaimer disclaimer-text">{tr("disclaimer")}</span>
        </div>
      </div>

      {view === "icm" ? (
        <IcmCalculator />
      ) : view === "ultra" ? (
        <UltraTrainer />
      ) : view === "campanha" ? (
        <CampaignView />
      ) : view === "treino" ? (
        <TrainView />
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
            field={controller.fieldStatus()}
            hint={heroTurn ? hint : undefined}
            onSelectSeat={setSelectedSeat}
            onShowTips={() => setTipsOpen(true)}
            showTips={handOver && controller.feedback.length > 0}
            celebrate={celebrateItm}
            updateReady={updateReady}
            onUpdate={applyUpdate}
            rangeSeats={mode === "tecnico" ? spots.map((s) => s.seat) : []}
          />

          {handOver ? (
            <div className="controls action-row">
              <button className="btn primary" onClick={newHand}>
                {tr("btn.newHand")}
              </button>
              <button className="btn" disabled={!controller.lastHand} onClick={() => setReplayOpen(true)}>
                {tr("btn.reviewHand")}
              </button>
              <button className="btn" onClick={() => setProgressOpen(true)}>
                📊 {tr("btn.progress")}
              </button>
              <button
                className="btn"
                disabled={controller.handLog.length === 0}
                onClick={() => downloadText(controller.exportSessionText())}
              >
                {tr("btn.exportHands")} ({controller.handLog.length})
              </button>
              {controller.message ? <div className="message">{controller.message}</div> : null}
            </div>
          ) : (
            <Controls
              legal={la}
              active={heroTurn}
              pot={controller.pot}
              bigBlind={t.bigBlind}
              onAction={heroAct}
            />
          )}
        </div>
      )}

      {replayOpen && controller.lastHand ? (
        <Replayer hand={controller.lastHand} onClose={() => setReplayOpen(false)} />
      ) : null}

      {tipsOpen ? (
        <HandTipsModal
          items={controller.feedback}
          heroHand={controller.lastHand?.holeCards[controller.heroSeat] ?? []}
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

      {!onboarded ? <Onboarding onClose={() => setOnboarded(true)} /> : null}

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

      {celebrateItm ? <MoneyRain onDone={dismissItmCelebration} /> : null}

      <div className={`app-seal${view === "play" ? " on-play" : ""}`}>🔒 {tr("disclaimer")}</div>
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

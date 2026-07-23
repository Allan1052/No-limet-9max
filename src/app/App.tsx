import { useState } from "react";
import { useGame } from "./useGame";
import { PokerTable } from "../ui/Table";
import { Controls } from "../ui/Controls";
import { FeedbackPanel, ProfilesLegend } from "../ui/FeedbackPanel";
import { StatsPanel } from "../ui/StatsPanel";
import { Replayer } from "../ui/Replayer";
import { TournamentSummary } from "../ui/TournamentSummary";
import { IcmCalculator } from "../ui/IcmCalculator";
import { TournamentSetup, TournamentHUD } from "../ui/Tournament";
import { RangeGrid } from "../ui/RangeGrid";
import { legalActions } from "../game/betting";
import "../ui/theme.css";

export function App() {
  const { controller, heroAct, newHand, resetStats, startTournament, setLevel, dismissSummary } =
    useGame();
  const [replayOpen, setReplayOpen] = useState(false);
  const [view, setView] = useState<"play" | "icm" | "torneio" | "ranges">("play");
  const t = controller.table;
  const la = legalActions(t);
  const heroTurn = controller.isHeroTurn();

  // Dica opcional: o que a linha de base recomendaria na sua vez.
  const advice = heroTurn ? controller.computeHeroAdvice() : null;
  const hint = advice
    ? `Recomendação da linha de base: ${adviceLabel(advice.action)}.`
    : undefined;

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          ♠ Poker Sim <small>· NLHE 9-max · ferramenta de estudo</small>
        </div>
        <div className="tabs">
          <button
            className={`tab ${view === "play" ? "active" : ""}`}
            onClick={() => setView("play")}
          >
            Jogar
          </button>
          <button
            className={`tab ${view === "torneio" ? "active" : ""}`}
            onClick={() => setView("torneio")}
          >
            Torneio
          </button>
          <button
            className={`tab ${view === "ranges" ? "active" : ""}`}
            onClick={() => setView("ranges")}
          >
            Ranges
          </button>
          <button
            className={`tab ${view === "icm" ? "active" : ""}`}
            onClick={() => setView("icm")}
          >
            Calculadora ICM
          </button>
        </div>
        <div className="disclaimer">
          SEM DINHEIRO REAL · SÓ ESTUDO
          <span className="build-id" title="Versão do app (data/hora do build)">
            v{__BUILD_ID__}
          </span>
        </div>
      </div>

      {view === "icm" ? (
        <IcmCalculator />
      ) : view === "ranges" ? (
        <RangeGrid />
      ) : view === "torneio" ? (
        <TournamentSetup
          onStart={(cfg) => {
            startTournament(cfg);
            setView("play");
          }}
        />
      ) : (
      <div className="layout">
        <div className="main">
          {controller.tournament ? (
            <TournamentHUD t={controller.tournament} onSetLevel={setLevel} />
          ) : null}
          <PokerTable table={t} lastActionLabel={controller.lastActionLabel} />

          {controller.phase === "handOver" ? (
            <div className="controls">
              <button className="btn primary" onClick={newHand}>
                Nova mão
              </button>
              <button
                className="btn"
                disabled={!controller.lastHand}
                onClick={() => setReplayOpen(true)}
              >
                Rever mão
              </button>
              <div className="message">{controller.message}</div>
            </div>
          ) : (
            <Controls
              legal={la}
              active={heroTurn}
              pot={controller.pot}
              bigBlind={t.bigBlind}
              onAction={heroAct}
              hint={hint}
            />
          )}
        </div>

        <div className="sidebar">
          <StatsPanel rows={controller.statRows()} onReset={resetStats} />
          <FeedbackPanel items={controller.feedback} />
          <ProfilesLegend />
        </div>
      </div>
      )}

      {replayOpen && controller.lastHand ? (
        <Replayer hand={controller.lastHand} onClose={() => setReplayOpen(false)} />
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
    </div>
  );
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

import { useGame } from "./useGame";
import { PokerTable } from "../ui/Table";
import { Controls } from "../ui/Controls";
import { FeedbackPanel, ProfilesLegend } from "../ui/FeedbackPanel";
import { legalActions } from "../game/betting";
import "../ui/theme.css";

export function App() {
  const { controller, heroAct, newHand } = useGame();
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
        <div className="disclaimer">SEM DINHEIRO REAL · SÓ ESTUDO</div>
      </div>

      <div className="layout">
        <div className="main">
          <PokerTable table={t} lastActionLabel={controller.lastActionLabel} />

          {controller.phase === "handOver" ? (
            <div className="controls">
              <button className="btn primary" onClick={newHand}>
                Nova mão
              </button>
              <div className="message">{controller.message}</div>
            </div>
          ) : (
            <Controls
              legal={la}
              active={heroTurn}
              pot={controller.pot}
              onAction={heroAct}
              hint={hint}
            />
          )}
        </div>

        <div className="sidebar">
          <FeedbackPanel items={controller.feedback} />
          <ProfilesLegend />
        </div>
      </div>
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

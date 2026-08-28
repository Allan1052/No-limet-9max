import { useRef } from "react";
import type { ProgressSummary } from "../app/progress";
import "./sessionProgressStrip.css";

export function SessionProgressStrip({ summary }: { summary: ProgressSummary }) {
  const start = useRef({
    hands: summary.hands,
    decisions: summary.decisions,
    good: summary.counts.boa + summary.counts.ok,
  });

  const hands = Math.max(0, summary.hands - start.current.hands);
  const decisions = Math.max(0, summary.decisions - start.current.decisions);
  const goodNow = summary.counts.boa + summary.counts.ok;
  const good = Math.max(0, goodNow - start.current.good);
  const accuracy = decisions > 0 ? Math.round((good / decisions) * 100) : 0;

  return (
    <section className="session-progress-strip" aria-label="Progresso desta sessão">
      <div className="sps-metric">
        <span className="sps-label">Sessão</span>
        <strong>{hands}</strong>
        <span className="sps-unit">mãos</span>
      </div>
      <div className="sps-divider" aria-hidden="true" />
      <div className="sps-metric">
        <span className="sps-label">Decisões</span>
        <strong>{decisions}</strong>
      </div>
      <div className="sps-divider" aria-hidden="true" />
      <div className="sps-metric sps-accuracy">
        <span className="sps-label">Precisão</span>
        <strong>{decisions > 0 ? `${accuracy}%` : "—"}</strong>
      </div>
      <div className="sps-track" aria-hidden="true">
        <span style={{ width: `${decisions > 0 ? accuracy : 0}%` }} />
      </div>
    </section>
  );
}

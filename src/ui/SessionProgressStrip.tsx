import { useEffect, useRef, useState } from "react";
import type { ProgressSummary } from "../app/progress";
import { trackEvent } from "../app/analytics";
import { getTrainingDayStatus, markActiveToday } from "../train/streak";
import "./sessionProgressStrip.css";

export function SessionProgressStrip({ summary }: { summary: ProgressSummary }) {
  const start = useRef({
    hands: summary.hands,
    decisions: summary.decisions,
    good: summary.counts.boa + summary.counts.ok,
  });
  const lastMarkedHands = useRef(0);
  const [trainingStatus, setTrainingStatus] = useState(() => getTrainingDayStatus());

  const hands = Math.max(0, summary.hands - start.current.hands);
  const decisions = Math.max(0, summary.decisions - start.current.decisions);
  const goodNow = summary.counts.boa + summary.counts.ok;
  const good = Math.max(0, goodNow - start.current.good);
  const accuracy = decisions > 0 ? Math.round((good / decisions) * 100) : 0;

  // A primeira mão concluída na sessão já conta como treino do dia.
  // Mãos extras no mesmo dia são idempotentes no streak. O mesmo incremento
  // é o ponto confiável para registrar a conclusão da mão no funil do Umami.
  useEffect(() => {
    if (hands <= lastMarkedHands.current) return;
    lastMarkedHands.current = hands;
    trackEvent("hand_completed", { session_hand: hands });
    const streak = markActiveToday();
    setTrainingStatus({ trainedToday: true, current: streak.current, best: streak.best });
  }, [hands]);

  return (
    <div className="session-progress-wrap">
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

      {trainingStatus.trainedToday ? (
        <div className="sps-return" role="status" aria-label="Treino diário concluído">
          <span className="sps-done">✓ Treino de hoje concluído</span>
          <span className="sps-streak">
            🔥 {trainingStatus.current} {trainingStatus.current === 1 ? "dia seguido" : "dias seguidos"}
          </span>
          <span className="sps-tomorrow">Amanhã tem outra mão.</span>
        </div>
      ) : null}
    </div>
  );
}

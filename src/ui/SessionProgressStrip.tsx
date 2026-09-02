import { useEffect, useRef, useState } from "react";
import type { ProgressSummary } from "../app/progress";
import {
  calculateSessionProgress,
  loadOrCreateSessionBaseline,
  type SessionStorageLike,
} from "../app/sessionProgress";
import { trackEvent } from "../app/analytics";
import { getTrainingDayStatus, markActiveToday } from "../train/streak";
import "./sessionProgressStrip.css";

function currentBaseline(summary: ProgressSummary) {
  return {
    hands: summary.hands,
    decisions: summary.decisions,
    good: summary.counts.boa + summary.counts.ok,
  };
}

function browserSessionStorage(): SessionStorageLike | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export function SessionProgressStrip({
  summary,
  tournament,
}: {
  summary: ProgressSummary;
  /** Placar do TORNEIO atual (mãos · decisões · precisão). Quando presente, a
   *  faixa mostra ISTO — que só zera ao iniciar outro torneio e persiste ao
   *  sair/voltar. Ausente (fora de torneio) → contagem da sessão, como antes. */
  tournament?: { hands: number; decisions: number; accuracy: number } | null;
}) {
  const start = useRef(
    (() => {
      const storage = browserSessionStorage();
      return storage ? loadOrCreateSessionBaseline(summary, storage) : currentBaseline(summary);
    })(),
  );
  const session = calculateSessionProgress(summary, start.current);
  const hands = tournament ? tournament.hands : session.hands;
  const decisions = tournament ? tournament.decisions : session.decisions;
  const accuracy = tournament ? tournament.accuracy : session.accuracy;

  // Se a faixa remontou ao voltar de outra aba, as mãos restauradas já foram
  // registradas antes. Começar daqui evita duplicar eventos de analytics.
  const lastMarkedHands = useRef(hands);
  const [trainingStatus, setTrainingStatus] = useState(() => getTrainingDayStatus());

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

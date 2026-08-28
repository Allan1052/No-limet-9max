import type { FeedbackItem, Rating } from "../feedback/analyzer";
import "./handResultSummary.css";

function isGood(rating: Rating): boolean {
  return rating === "boa" || rating === "ok";
}

export function HandResultSummary({
  feedback,
  onOpenTips,
}: {
  feedback: FeedbackItem[];
  onOpenTips?: () => void;
}) {
  if (!feedback.length) return null;

  const item = feedback[feedback.length - 1];
  const good = isGood(item.rating);

  return (
    <section className={`hand-result-summary ${good ? "is-good" : "is-review"}`} aria-label="Resultado da sua decisão">
      <div className="hrs-topline">
        <span className="hrs-status">{good ? "✓ ACERTO" : "✕ ERRO"}</span>
        <span className="hrs-street">{item.street}</span>
      </div>
      <div className="hrs-actions">
        <span className="hrs-label">Sua ação</span>
        <strong>{item.heroAction}</strong>
        <span className="hrs-arrow" aria-hidden="true">→</span>
        <span className="hrs-label">Melhor ação</span>
        <strong className="hrs-best">{item.advice}</strong>
      </div>
      <p className="hrs-explanation">{item.text}</p>
      {onOpenTips ? (
        <button type="button" className="hrs-more" onClick={onOpenTips}>
          Ver análise completa
        </button>
      ) : null}
    </section>
  );
}

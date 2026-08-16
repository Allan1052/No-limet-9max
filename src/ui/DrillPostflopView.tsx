// ---------------------------------------------------------------------------
// DRILL PÓS-FLOP — Treino intensivo de spots pós-flop.
//
// O jogador escolhe um spot (ex.: "Flush Draw no Flop") e treina 30 mãos
// seguidas NESSE spot. Cada mão: board fixo, cartas variadas, decide
// (fold/check/call/bet/raise), recebe feedback instantâneo.
// ---------------------------------------------------------------------------
import { useState, useCallback } from "react";
import { TrainingShareButton } from "./TrainingShareButton";
import { CardView } from "./Card";
import {
  POSTFLOP_DRILL_SPOTS,
  createPostflopDrillSession,
  answerPostflopDrillHand,
  type PostflopDrillSession,
  type PostflopDrillAction,
} from "../train/drillPostflop";

// Estilos inline para o Drill Pós-Flop (paleta do app)
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 620,
    margin: '0 auto',
    padding: '16px',
    minHeight: '100%',
  },
  header: { textAlign: 'center' as const },
  title: {
    fontSize: 24,
    fontWeight: 800,
    color: '#f0ede0',
    margin: '0 0 8px 0',
  },
  subtitle: {
    textAlign: 'center' as const,
    fontSize: 13,
    color: '#a8a596',
    marginBottom: 24,
  },
  spotBtn: {
    width: '100%',
    textAlign: 'left' as const,
    padding: 16,
    borderRadius: 14,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    cursor: 'pointer',
    transition: 'background 0.2s',
    marginBottom: 12,
  },
  spotInner: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  spotIcon: { fontSize: 24 },
  spotTitle: {
    fontWeight: 700,
    fontSize: 15,
    color: '#f0ede0',
    margin: 0,
  },
  spotDesc: {
    fontSize: 12,
    opacity: 0.6,
    color: '#a8a596',
    margin: 0,
  },
  backLink: {
    marginTop: 24,
    fontSize: 12,
    opacity: 0.5,
    background: 'none',
    border: 'none',
    color: '#a8a596',
    cursor: 'pointer',
    display: 'block',
    margin: '24px auto 0',
  },
  // Resultado
  resultTitle: {
    fontSize: 24,
    fontWeight: 800,
    marginBottom: 8,
    color: '#f0ede0',
  },
  resultPct: {
    fontSize: 52,
    fontWeight: 900,
    color: '#e6c454',
    marginBottom: 4,
  },
  resultInfo: {
    fontSize: 15,
    marginBottom: 4,
    color: '#f0ede0',
  },
  resultMastery: {
    fontSize: 20,
    fontWeight: 700,
    color: '#e6c454',
    marginBottom: 24,
  },
  errorsBox: {
    textAlign: 'left' as const,
    marginBottom: 24,
    padding: 16,
    borderRadius: 14,
    background: 'rgba(180,40,40,0.12)',
    border: '1px solid rgba(180,40,40,0.25)',
  },
  errorsTitle: {
    fontWeight: 700,
    marginBottom: 12,
    fontSize: 13,
    color: '#e0958c',
  },
  errorsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    maxHeight: 200,
    overflowY: 'auto' as const,
    fontSize: 11,
    color: '#a8a596',
  },
  backBtn: {
    padding: '12px 24px',
    borderRadius: 12,
    background: 'linear-gradient(160deg, #f7e79b, #e6c454)',
    color: '#0a0d0a',
    fontWeight: 800,
    fontSize: 15,
    border: 'none',
    cursor: 'pointer',
  },
  // Drill
  drillHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    fontSize: 12,
    color: '#a8a596',
  },
  progressBar: {
    width: '100%',
    height: 6,
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 99,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #e6c454, #f7e79b)',
    transition: 'width 0.3s',
    borderRadius: 99,
  },
  context: {
    textAlign: 'center' as const,
    marginBottom: 12,
    fontSize: 14,
    fontWeight: 700,
    color: '#f0ede0',
  },
  contextSub: {
    textAlign: 'center' as const,
    fontSize: 12,
    opacity: 0.6,
    color: '#a8a596',
    marginBottom: 16,
  },
  boardRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 12,
  },
  boardCard: {
    width: 40,
    height: 56,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    fontWeight: 700,
    borderRadius: 6,
    background: '#faf7f0',
    color: '#1c1c1c',
    border: '1px solid rgba(0,0,0,0.2)',
  },
  cardsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  feedbackBox: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 14,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    textAlign: 'center' as const,
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: 800,
    marginBottom: 4,
  },
  feedbackAdvice: {
    fontSize: 12,
    opacity: 0.8,
    color: '#a8a596',
  },
  feedbackText: {
    fontSize: 11,
    opacity: 0.6,
    color: '#a8a596',
    marginTop: 4,
  },
  actionGrid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginTop: 'auto',
  },
  actionGrid3: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 8,
    marginTop: 'auto',
  },
  actionBtn: {
    padding: '16px 0',
    borderRadius: 14,
    fontSize: 15,
    fontWeight: 800,
    cursor: 'pointer',
    border: '1px solid',
    transition: 'opacity 0.15s',
  },
  foldBtn: {
    background: 'rgba(139,0,0,0.3)',
    borderColor: 'rgba(180,60,60,0.4)',
    color: '#e0958c',
  },
  callBtn: {
    background: 'rgba(0,50,139,0.3)',
    borderColor: 'rgba(60,100,180,0.4)',
    color: '#8cb8e0',
  },
  raiseBtn: {
    background: 'rgba(0,100,50,0.3)',
    borderColor: 'rgba(60,160,100,0.4)',
    color: '#8ce0a8',
  },
  checkBtn: {
    background: 'rgba(100,100,100,0.25)',
    borderColor: 'rgba(150,150,150,0.4)',
    color: '#c8c8c8',
  },
  betBtn: {
    background: 'rgba(230,196,84,0.15)',
    borderColor: 'rgba(230,196,84,0.4)',
    color: '#e6c454',
  },
  quitBtn: {
    marginTop: 16,
    fontSize: 12,
    opacity: 0.5,
    background: 'none',
    border: 'none',
    color: '#a8a596',
    cursor: 'pointer',
  },
};

type PfPhase = "select" | "drill" | "done";

export function DrillPostflopView() {
  const [phase, setPhase] = useState<PfPhase>("select");
  const [session, setSession] = useState<PostflopDrillSession | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; bestAction: string; explanation: string; equity: number; potOdds: number } | null>(null);
  const [showingFeedback, setShowingFeedback] = useState(false);

  // Selecionar spot e iniciar
  const startDrill = useCallback((spotId: string) => {
    const s = createPostflopDrillSession(spotId, 30);
    setSession(s);
    setPhase("drill");
    setFeedback(null);
    setShowingFeedback(false);
  }, []);

  // Responder
  const answer = useCallback((choice: PostflopDrillAction) => {
    if (!session || showingFeedback) return;
    const correct = answerPostflopDrillHand(session, choice);
    const hand = session.hands[session.currentIndex - 1];
    setFeedback({
      correct,
      bestAction: hand.bestAction,
      explanation: hand.explanation,
      equity: hand.equity,
      potOdds: hand.potOdds,
    });
    setShowingFeedback(true);
    setTimeout(() => {
      setShowingFeedback(false);
      if (session.done) {
        setPhase("done");
      } else {
        setSession({ ...session });
      }
    }, 1500);
  }, [session, showingFeedback]);

  // Voltar
  const resetDrill = useCallback(() => {
    setPhase("select");
    setSession(null);
    setFeedback(null);
    setShowingFeedback(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Tela de seleção
  // ---------------------------------------------------------------------------
  if (phase === "select") {
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>🌊 Drill Pós-Flop</h2>
        <p style={styles.subtitle}>
          Treine spots pós-flop até dominar. 30 mãos seguidas, mesmo board.
        </p>
        <div>
          {POSTFLOP_DRILL_SPOTS.map((spot) => (
            <button
              key={spot.id}
              onClick={() => startDrill(spot.id)}
              style={styles.spotBtn}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            >
              <div style={styles.spotInner}>
                <span style={styles.spotIcon}>{spot.icon}</span>
                <div>
                  <p style={styles.spotTitle}>{spot.title}</p>
                  <p style={styles.spotDesc}>{spot.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
        <button onClick={() => {}} style={styles.backLink}>
          (Voltar — use o toggle acima)
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Tela de resultado
  // ---------------------------------------------------------------------------
  if (phase === "done" && session) {
    const accuracy = Math.round((session.correctCount / session.hands.length) * 100);
    const mastery = accuracy >= 90 ? "master" : accuracy >= 75 ? "advanced" : accuracy >= 60 ? "intermediate" : "beginner";
    const masteryEmoji = mastery === "master" ? "👑" : mastery === "advanced" ? "🔥" : mastery === "intermediate" ? "💪" : "📚";
    const wrongCount = session.hands.filter((h) => !h.correct).length;

    return (
      <div style={{ ...styles.container, textAlign: 'center', padding: '32px 16px' }}>
        <h2 style={styles.resultTitle}>{masteryEmoji} Resultado</h2>
        <p style={{ ...styles.subtitle, marginBottom: 24 }}>
          {session.spot.title} · {session.spot.potBB}bb pot · bet {session.spot.villainBetBB}bb
        </p>
        <div style={styles.resultPct}>{accuracy}%</div>
        <p style={styles.resultInfo}>{session.correctCount}/{session.hands.length} acertos</p>
        <p style={styles.resultMastery}>{mastery}</p>
        {/* Erros */}
        {wrongCount > 0 && (
          <div style={styles.errorsBox}>
            <p style={styles.errorsTitle}>❌ Erros ({wrongCount}):</p>
            <div style={styles.errorsList}>
              {session.hands.filter((h) => !h.correct).map((h, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{h.hand.map((c) => cardToStringHelper(c)).join(" ")}</span>
                  <span>Você: {h.heroChoice} · Certo: {h.bestAction}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <TrainingShareButton
            data={{
              trainingType: "Drill Mode",
              spot: session.spot.title + " · " + session.spot.potBB + "bb pot · bet " + session.spot.villainBetBB + "bb",
              score: session.correctCount + "/" + session.hands.length,
              accuracy: accuracy + "%",
              rating: mastery,
            }}
          />
        </div>
        <button onClick={resetDrill} style={styles.backBtn}>
          Voltar aos spots
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Tela de drill
  // ---------------------------------------------------------------------------
  if (phase === "drill" && session) {
    const currentHand = session.hands[session.currentIndex];
    if (!currentHand) return null;
    const spotLabel = session.spot.title;
    const actions: PostflopDrillAction[] =
      session.spot.villainBetBB > 0
        ? ["fold", "call", "raise"]
        : ["check", "bet"];

    const actionStyles: Record<string, React.CSSProperties> = {
      fold: { ...styles.actionBtn, ...styles.foldBtn },
      call: { ...styles.actionBtn, ...styles.callBtn },
      raise: { ...styles.actionBtn, ...styles.raiseBtn },
      check: { ...styles.actionBtn, ...styles.checkBtn },
      bet: { ...styles.actionBtn, ...styles.betBtn },
    };
    const actionLabels: Record<string, string> = {
      fold: "FOLD", call: "CALL", raise: "RAISE", check: "CHECK", bet: "BET",
    };

    return (
      <div style={{ ...styles.container, display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        {/* Header */}
        <div style={styles.drillHeader}>
          <span>Mão {session.currentIndex + 1}/{session.hands.length}</span>
          <span style={{ color: '#e6c454', fontWeight: 700 }}>Acertos: {session.correctCount}</span>
        </div>
        {/* Barra */}
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${(session.currentIndex / session.hands.length) * 100}%` }} />
        </div>
        {/* Contexto */}
        <div style={styles.context}>
          <p style={{ margin: 0 }}>{spotLabel}</p>
        </div>
        <div style={styles.contextSub}>
          <p style={{ margin: 0 }}>
            Pote: {session.spot.potBB}bb · Vilão bet: {session.spot.villainBetBB > 0 ? `${session.spot.villainBetBB}bb` : "passou"}
          </p>
        </div>
        {/* Board */}
        <div style={styles.boardRow}>
          {session.spot.board.map((card, i) => (
            <div key={i} style={styles.boardCard}>
              {cardToStringHelper(card)}
            </div>
          ))}
        </div>
        {/* Cartas */}
        <div style={styles.cardsRow}>
          <CardView card={currentHand.hand[0]} />
          <CardView card={currentHand.hand[1]} />
        </div>
        {/* Feedback */}
        {showingFeedback && feedback && (
          <div style={styles.feedbackBox}>
            <p style={{ ...styles.feedbackTitle, color: feedback.correct ? '#5cbe8d' : '#e0645f' }}>
              {feedback.correct ? "✅ Boa!" : "❌ Errada"}
            </p>
            <p style={styles.feedbackText}>{feedback.explanation}</p>
          </div>
        )}
        {/* Botões */}
        {!showingFeedback && (
          <div style={actions.length === 2 ? styles.actionGrid2 : styles.actionGrid3}>
            {actions.map((action) => (
              <button key={action} onClick={() => answer(action)} style={actionStyles[action]}>
                {actionLabels[action]}
              </button>
            ))}
          </div>
        )}
        {/* Desistir */}
        <button onClick={resetDrill} style={styles.quitBtn}>
          ✕ Desistir do drill
        </button>
      </div>
    );
  }

  return null;
}

// Helper para converter card → string
function cardToStringHelper(card: number): string {
  const RANKS = "23456789TJQKA";
  const SUITS = "cdhs";
  const suitSymbols: Record<string, string> = { c: "♣", d: "♦", h: "♥", s: "♠" };
  const rank = RANKS[card >> 2];
  const suit = SUITS[card & 3];
  return `${rank}${suitSymbols[suit] ?? suit}`;
}

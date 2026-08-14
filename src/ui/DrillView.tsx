// ---------------------------------------------------------------------------
// DRILL MODE — Treino intensivo de um spot específico.
//
// O jogador escolhe um spot (ex.: "BTN — Abertura" ou "Push/Fold — SB") e
// treina 30 mãos seguidas NESSE spot. Cada mão: cartas sorteadas, decide
// (fold/call/raise/all-in), recebe feedback instantâneo com nota.
//
// Ao final: % de acerto, mastery level (beginner→master), e lista dos erros.
// Progresso persistido em localStorage.
// ---------------------------------------------------------------------------
import { TrainingShareButton } from './TrainingShareButton';
import { useState, useCallback } from "react";
import { CardView } from "./Card";
import { actionLabel } from "../feedback/analyzer";
import { DrillPostflopView } from "./DrillPostflopView";
import {
  DRILL_PRESETS,
  createDrillSession,
  answerDrillHand,
  computeDrillResult,
  recordDrillResult,
  loadDrillProgress,
  type DrillSession,
  type DrillResult,
} from "../train/drill";

// Estilos inline para o Drill Mode (paleta do app)
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 620,
    margin: '0 auto',
    padding: '16px',
    minHeight: '100%',
  },
  header: {
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    color: '#f0ede0',
    margin: 0,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 13,
    color: '#a8a596',
    marginBottom: 24,
  },
  progressBox: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    fontSize: 12,
  },
  progressTitle: {
    fontWeight: 700,
    marginBottom: 8,
    color: '#f0ede0',
  },
  progressGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  progressItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    color: '#a8a596',
  },
  toggleRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    padding: '10px 8px',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.15)',
    transition: 'all 0.2s',
  },
  toggleActive: {
    background: 'linear-gradient(160deg, #f7e79b, #e6c454)',
    color: '#0a0d0a',
    borderColor: '#e6c454',
  } as React.CSSProperties,
  toggleInactive: {
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.7)',
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
  spotIcon: {
    fontSize: 24,
  },
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
  spotProgress: {
    marginTop: 8,
    fontSize: 11,
    color: '#a8a596',
  },
  gold: {
    color: '#e6c454',
    fontWeight: 700,
  },
  // Tela de drill
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
    marginBottom: 16,
    fontSize: 14,
    fontWeight: 700,
    color: '#f0ede0',
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
  actionGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginTop: 'auto',
  },
  actionBtn: {
    padding: '16px 0',
    borderRadius: 14,
    fontSize: 16,
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
  allinBtn: {
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
};

type Phase = "select" | "drill" | "done";
type DrillMode = "preflop" | "postflop";

export function DrillView() {
  const [drillMode, setDrillMode] = useState<DrillMode & string>("preflop");
  const [phase, setPhase] = useState<Phase>("select");
  const [activePresetId, setActivePresetId] = useState<string>("");
  const [session, setSession] = useState<DrillSession | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; rating: string; advice: string } | null>(null);
  const [progress, setProgress] = useState(() => loadDrillProgress());
  const [showingFeedback, setShowingFeedback] = useState(false);

  // Selecionar preset e iniciar drill
  const startDrill = useCallback((presetId: string) => {
    setActivePresetId(presetId);
    const s = createDrillSession(presetId, 30);
    setSession(s);
    setPhase("drill");
    setFeedback(null);
    setShowingFeedback(false);
  }, []);

  // Responder uma mão
  const answer = useCallback((choice: "fold" | "call" | "raise" | "allin") => {
    if (!session || showingFeedback) return;
    const { feedback: fb } = answerDrillHand(session, choice);
    setFeedback({
      text: fb.text,
      rating: fb.rating,
      advice: fb.advice,
    });
    setShowingFeedback(true);
    // Auto-avançar após delay
    setTimeout(() => {
      setShowingFeedback(false);
      if (session.done) {
        const result = computeDrillResult(session);
        const newProgress = recordDrillResult(session.spot.type + "_" + session.spot.heroPosition, result.accuracy, result.mastery);
        setProgress(newProgress);
        setPhase("done");
      } else {
        setSession({ ...session });
      }
    }, 1800);
  }, [session, showingFeedback]);

  // Resultado final
  const result: DrillResult | null = session?.done ? computeDrillResult(session) : null;

  // Voltar para seleção
  const resetDrill = useCallback(() => {
    setPhase("select");
    setSession(null);
    setActivePresetId("");
    setFeedback(null);
    setShowingFeedback(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Tela de seleção de spots
  // ---------------------------------------------------------------------------
  // Se estiver no modo pós-flop, renderizar o DrillPostflopView
  if (drillMode === "postflop") {
    return <DrillPostflopView />;
  }

  if (phase === "select") {
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>🎯 Drill Mode</h2>
        <p style={styles.subtitle}>
          Treine um spot específico até dominar. 30 mãos seguidas, feedback instantâneo.
        </p>
        {/* Progresso geral */}
        {Object.keys(progress).length > 0 && (
          <div style={styles.progressBox}>
            <p style={styles.progressTitle}>📊 Seu progresso:</p>
            <div style={styles.progressGrid}>
              {Object.entries(progress).slice(0, 6).map(([id, p]) => (
                <div key={id} style={styles.progressItem}>
                  <span>{id}</span>
                  <span style={styles.gold}>{p.bestAccuracy}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Toggle Pré-flop / Pós-flop */}
        <div style={styles.toggleRow}>
          <button
            onClick={() => setDrillMode("preflop")}
            style={{
              ...styles.toggleBtn,
              ...(drillMode === "preflop" ? styles.toggleActive : styles.toggleInactive),
            }}
          >
            🃏 Pré-flop
          </button>
          <button
            onClick={() => setDrillMode("postflop")}
            style={{
              ...styles.toggleBtn,
              ...(drillMode === ("postflop" as string) ? styles.toggleActive : styles.toggleInactive),
            }}
          >
            🌊 Pós-flop
          </button>
        </div>
        {/* Lista de presets */}
        {DRILL_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => startDrill(preset.id)}
            style={styles.spotBtn}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
          >
            <div style={styles.spotInner}>
              <span style={styles.spotIcon}>{preset.icon}</span>
              <div>
                <p style={styles.spotTitle}>{preset.title}</p>
                <p style={styles.spotDesc}>{preset.description}</p>
              </div>
            </div>
            {/* Melhor resultado deste spot */}
            {progress[preset.id] && (
              <div style={styles.spotProgress}>
                Melhor: <span style={styles.gold}>{progress[preset.id].bestAccuracy}%</span> · {progress[preset.id].mastery}
              </div>
            )}
          </button>
        ))}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Tela de resultado
  // ---------------------------------------------------------------------------
  if (phase === "done" && result) {
    const masteryEmoji = result.mastery === "master" ? "👑" : result.mastery === "advanced" ? "🔥" : result.mastery === "intermediate" ? "💪" : "📚";
    return (
      <div style={{ ...styles.container, textAlign: 'center', padding: '32px 16px' }}>
        <h2 style={styles.resultTitle}>{masteryEmoji} Resultado do Drill</h2>
        <p style={{ ...styles.subtitle, marginBottom: 24 }}>
          {DRILL_PRESETS.find((p) => p.id === activePresetId)?.title || ""}
        </p>
        <div style={styles.resultPct}>{result.accuracy}%</div>
        <p style={styles.resultInfo}>{result.correctCount}/{result.totalHands} acertos</p>
        <p style={styles.resultMastery}>{result.mastery}</p>
        {/* Erros */}
        {result.mistakes.length > 0 && (
          <div style={styles.errorsBox}>
            <p style={styles.errorsTitle}>❌ Erros ({result.mistakes.length}):</p>
            <div style={styles.errorsList}>
              {result.mistakes.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{m.hand}</span>
                  <span>Você: {m.choice} → {actionLabel(m.advice)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <TrainingShareButton
            data={{
              trainingType: "Drill Mode",
              spot: (session?.spot.type || "") + " · " + (session?.spot.heroPosition || "") + " · " + (session?.spot.effectiveBB || 0) + "bb",
              score: result.correctCount + "/" + result.totalHands,
              accuracy: result.accuracy + "%",
              rating: result.mastery,
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
  // Tela de drill (mão por mão)
  // ---------------------------------------------------------------------------
  if (phase === "drill" && session) {
    const currentHand = session.hands[session.currentIndex];
    if (!currentHand) return null;
    const spotLabel = `${session.spot.heroPosition}`;
    const contextLabel = session.spot.type === "open"
      ? `${spotLabel} · ${session.spot.effectiveBB}bb · Pote não aberto`
      : session.spot.type === "vsOpen"
        ? `${spotLabel} · ${session.spot.effectiveBB}bb · ${session.spot.raiserPosition} abriu ${session.spot.openSizeBB}bb`
        : session.spot.type === "vsThreeBet"
          ? `${spotLabel} · ${session.spot.effectiveBB}bb · Tomou 3-bet`
          : `${spotLabel} · ${session.spot.effectiveBB}bb · Push ou Fold`;

    const feedbackColor = (feedback?.rating === "boa" || feedback?.rating === "ok") ? '#5cbe8d' : '#e0645f';
    const feedbackEmoji = feedback?.rating === "boa" ? "✅" : feedback?.rating === "ok" ? "👍" : feedback?.rating === "imprecisa" ? "⚠️" : "❌";

    return (
      <div style={{ ...styles.container, display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        {/* Header */}
        <div style={styles.drillHeader}>
          <span>Mão {session.currentIndex + 1}/{session.hands.length}</span>
          <span style={{ color: '#e6c454', fontWeight: 700 }}>Acertos: {session.correctCount}</span>
        </div>
        {/* Barra de progresso */}
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${(session.currentIndex / session.hands.length) * 100}%` }} />
        </div>
        {/* Contexto */}
        <div style={styles.context}>
          <p style={{ margin: 0 }}>{contextLabel}</p>
        </div>
        {/* Cartas */}
        <div style={styles.cardsRow}>
          <CardView card={currentHand.hand[0]} />
          <CardView card={currentHand.hand[1]} />
        </div>
        {/* Feedback */}
        {showingFeedback && feedback && (
          <div style={styles.feedbackBox}>
            <p style={{ ...styles.feedbackTitle, color: feedbackColor }}>
              {feedbackEmoji} {feedback.rating === "boa" ? "Boa!" : feedback.rating === "ok" ? "Ok" : feedback.rating === "imprecisa" ? "Imprecisa" : "Errada"}
            </p>
            <p style={styles.feedbackAdvice}>Certo: {feedback.advice}</p>
            <p style={styles.feedbackText}>{feedback.text}</p>
          </div>
        )}
        {/* Botões de ação */}
        {!showingFeedback && (
          <div style={styles.actionGrid}>
            <button onClick={() => answer("fold")} style={{ ...styles.actionBtn, ...styles.foldBtn }}>FOLD</button>
            <button onClick={() => answer("call")} style={{ ...styles.actionBtn, ...styles.callBtn }}>CALL</button>
            <button onClick={() => answer("raise")} style={{ ...styles.actionBtn, ...styles.raiseBtn }}>RAISE</button>
            <button onClick={() => answer("allin")} style={{ ...styles.actionBtn, ...styles.allinBtn }}>ALL-IN</button>
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

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

type Phase = "select" | "drill" | "done";
type DrillMode = "preflop" | "postflop";

export function DrillView() {
  const [drillMode, setDrillMode] = useState<DrillMode>("preflop");
  const [phase, setPhase] = useState<Phase>("select");
  const [session, setSession] = useState<DrillSession | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; rating: string; advice: string } | null>(null);
  const [progress, setProgress] = useState(() => loadDrillProgress());
  const [showingFeedback, setShowingFeedback] = useState(false);

  // Selecionar preset e iniciar drill
  const startDrill = useCallback((presetId: string) => {
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
      <div className="max-w-md mx-auto px-4 py-6">
        <h2 className="text-xl font-bold text-center mb-2">🎯 Drill Mode</h2>
        <p className="text-center text-sm opacity-70 mb-6">
          Treine um spot específico até dominar. 30 mãos seguidas, feedback instantâneo.
        </p>

        {/* Progresso geral */}
        {Object.keys(progress).length > 0 && (
          <div className="mb-6 p-3 rounded-lg bg-white/5 text-xs">
            <p className="font-semibold mb-2">📊 Seu progresso:</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(progress).slice(0, 6).map(([id, p]) => (
                <div key={id} className="flex justify-between">
                  <span>{id}</span>
                  <span className="text-gold">{p.bestAccuracy}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Toggle Pré-flop / Pós-flop */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setDrillMode("preflop")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${drillMode === "preflop" ? "bg-gold text-black" : "bg-white/10 text-white/70"}`}
          >
            🃏 Pré-flop
          </button>
          <button
            onClick={() => setDrillMode("postflop")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${drillMode === ("postflop" as DrillMode) ? "bg-gold text-black" : "bg-white/10 text-white/70"}`}
          >
            🌊 Pós-flop
          </button>
        </div>
        {/* Lista de presets */}
        <div className="space-y-3">
          {DRILL_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => startDrill(preset.id)}
              className="w-full text-left p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{preset.icon}</span>
                <div>
                  <p className="font-semibold">{preset.title}</p>
                  <p className="text-xs opacity-60">{preset.description}</p>
                </div>
              </div>
              {/* Melhor resultado deste spot */}
              {progress[preset.id] && (
                <div className="mt-2 text-xs">
                  Melhor: <span className="text-gold font-bold">{progress[preset.id].bestAccuracy}%</span> · {progress[preset.id].mastery}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Tela de resultado
  // ---------------------------------------------------------------------------
  if (phase === "done" && result) {
    const masteryEmoji = result.mastery === "master" ? "👑" : result.mastery === "advanced" ? "🔥" : result.mastery === "intermediate" ? "💪" : "📚";
    return (
      <div className="max-w-md mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold mb-2">{masteryEmoji} Resultado do Drill</h2>
        <p className="text-sm opacity-70 mb-6">
          {session?.spot.type} · {session?.spot.heroPosition} · {session?.spot.effectiveBB}bb
        </p>

        <div className="text-6xl font-black mb-2">{result.accuracy}%</div>
        <p className="text-lg mb-1">{result.correctCount}/{result.totalHands} acertos</p>
        <p className="text-gold font-semibold text-xl mb-6 capitalize">{result.mastery}</p>

        {/* Erros */}
        {result.mistakes.length > 0 && (
          <div className="text-left mb-6 p-4 rounded-xl bg-red-900/20 border border-red-800/30">
            <p className="font-semibold mb-3 text-sm">❌ Erros ({result.mistakes.length}):</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {result.mistakes.map((m, i) => (
                <div key={i} className="text-xs flex justify-between">
                  <span>{m.hand}</span>
                  <span>Você: {m.choice} · Certo: {actionLabel(m.advice)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
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
        <button
          onClick={resetDrill}
          className="px-6 py-3 rounded-xl bg-gold text-black font-bold hover:opacity-90 transition-opacity"
        >
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

    return (
      <div className="max-w-md mx-auto px-4 py-4 flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs opacity-70">
            Mão {session.currentIndex + 1}/{session.hands.length}
          </span>
          <span className="text-xs text-gold font-semibold">
            Acertos: {session.correctCount}
          </span>
        </div>

        {/* Barra de progresso */}
        <div className="w-full h-2 bg-white/10 rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-gold transition-all duration-300"
            style={{ width: `${(session.currentIndex / session.hands.length) * 100}%` }}
          />
        </div>

        {/* Contexto */}
        <div className="text-center mb-4">
          <p className="text-sm font-semibold">{contextLabel}</p>
        </div>

        {/* Cartas */}
        <div className="flex justify-center gap-2 mb-6">
          <CardView card={currentHand.hand[0]} />
          <CardView card={currentHand.hand[1]} />
        </div>

        {/* Feedback (se estiver mostrando) */}
        {showingFeedback && feedback && (
          <div className="mb-4 p-4 rounded-xl bg-white/10 border border-white/20 text-center animate-in">
            <p className={`text-lg font-bold mb-1 ${feedback.rating === "boa" || feedback.rating === "ok" ? "text-green-400" : "text-red-400"}`}>
              {feedback.rating === "boa" ? "✅ Boa!" : feedback.rating === "ok" ? "👍 Ok" : feedback.rating === "imprecisa" ? "⚠️ Imprecisa" : "❌ Errada"}
            </p>
            <p className="text-xs opacity-80">Certo: {feedback.advice}</p>
            <p className="text-xs opacity-60 mt-1">{feedback.text}</p>
          </div>
        )}

        {/* Botões de ação */}
        {!showingFeedback && (
          <div className="grid grid-cols-2 gap-3 mt-auto">
            <button
              onClick={() => answer("fold")}
              className="py-4 rounded-xl bg-red-900/40 border border-red-700/50 text-lg font-bold hover:bg-red-800/50 transition-colors"
            >
              FOLD
            </button>
            <button
              onClick={() => answer("call")}
              className="py-4 rounded-xl bg-blue-900/40 border border-blue-700/50 text-lg font-bold hover:bg-blue-800/50 transition-colors"
            >
              CALL
            </button>
            <button
              onClick={() => answer("raise")}
              className="py-4 rounded-xl bg-green-900/40 border border-green-700/50 text-lg font-bold hover:bg-green-800/50 transition-colors"
            >
              RAISE
            </button>
            <button
              onClick={() => answer("allin")}
              className="py-4 rounded-xl bg-gold/20 border border-gold/50 text-lg font-bold hover:bg-gold/30 transition-colors"
            >
              ALL-IN
            </button>
          </div>
        )}

        {/* Botão de desistir */}
        <button
          onClick={resetDrill}
          className="mt-4 text-xs opacity-50 hover:opacity-100 transition-opacity"
        >
          ✕ Desistir do drill
        </button>
      </div>
    );
  }

  return null;
}

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
      <div className="max-w-md mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-2 text-center">🌊 Drill Pós-Flop</h2>
        <p className="text-center text-sm opacity-70 mb-6">
          Treine spots pós-flop até dominar. 30 mãos seguidas, mesmo board.
        </p>
        <div className="space-y-3">
          {POSTFLOP_DRILL_SPOTS.map((spot) => (
            <button
              key={spot.id}
              onClick={() => startDrill(spot.id)}
              className="w-full text-left p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{spot.icon}</span>
                <div>
                  <p className="font-semibold">{spot.title}</p>
                  <p className="text-xs opacity-60">{spot.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={resetDrill}
          className="mt-6 text-xs opacity-50 hover:opacity-100 transition-opacity block mx-auto"
        >
          ← Voltar ao Drill Pré-Flop
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
    return (
      <div className="max-w-md mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold mb-2">{masteryEmoji} Resultado</h2>
        <p className="text-sm opacity-70 mb-6">
          {session.spot.title} · {session.spot.potBB}bb pot · bet {session.spot.villainBetBB}bb
        </p>
        <div className="text-6xl font-black mb-2">{accuracy}%</div>
        <p className="text-lg mb-1">{session.correctCount}/{session.hands.length} acertos</p>
        <p className="text-gold font-semibold text-xl mb-6 capitalize">{mastery}</p>
        {/* Erros */}
        {session.hands.filter((h) => !h.correct).length > 0 && (
          <div className="text-left mb-6 p-4 rounded-xl bg-red-900/20 border border-red-800/30">
            <p className="font-semibold mb-3 text-sm">❌ Erros ({session.hands.filter((h) => !h.correct).length}):</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {session.hands.filter((h) => !h.correct).map((h, i) => (
                <div key={i} className="text-xs flex justify-between">
                  <span>{h.hand.map((c) => cardToStringHelper(c)).join(" ")}</span>
                  <span>Você: {h.heroChoice} · Certo: {h.bestAction}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mb-4">
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
        {/* Barra */}
        <div className="w-full h-2 bg-white/10 rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-gold transition-all duration-300"
            style={{ width: `${(session.currentIndex / session.hands.length) * 100}%` }}
          />
        </div>
        {/* Contexto */}
        <div className="text-center mb-4">
          <p className="text-sm font-semibold">{spotLabel}</p>
          <p className="text-xs opacity-60">
            Pote: {session.spot.potBB}bb · Vilão bet: {session.spot.villainBetBB > 0 ? `${session.spot.villainBetBB}bb` : "passou"}
          </p>
        </div>
        {/* Board */}
        <div className="flex justify-center gap-1 mb-3">
          {session.spot.board.map((card, i) => (
            <div key={i} className="w-10 h-14 flex items-center justify-center text-lg font-bold rounded bg-white/10 border border-white/20">
              {cardToStringHelper(card)}
            </div>
          ))}
        </div>
        {/* Cartas */}
        <div className="flex justify-center gap-2 mb-6">
          <CardView card={currentHand.hand[0]} />
          <CardView card={currentHand.hand[1]} />
        </div>
        {/* Feedback */}
        {showingFeedback && feedback && (
          <div className="mb-4 p-4 rounded-xl bg-white/10 border border-white/20 text-center animate-in">
            <p className={`text-lg font-bold mb-1 ${feedback.correct ? "text-green-400" : "text-red-400"}`}>
              {feedback.correct ? "✅ Boa!" : "❌ Errada"}
            </p>
            <p className="text-xs opacity-80">
              Certo: {feedback.bestAction} · Equity {feedback.equity}% vs Pot odds {feedback.potOdds}%
            </p>
            <p className="text-xs opacity-60 mt-1">{feedback.explanation}</p>
          </div>
        )}
        {/* Botões */}
        {!showingFeedback && (
          <div className={`grid gap-3 mt-auto ${actions.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
            {actions.map((action) => (
              <button
                key={action}
                onClick={() => answer(action)}
                className={`py-4 rounded-xl text-lg font-bold transition-colors ${
                  action === "fold"
                    ? "bg-red-900/40 border border-red-700/50 hover:bg-red-800/50"
                    : action === "call"
                      ? "bg-blue-900/40 border border-blue-700/50 hover:bg-blue-800/50"
                      : action === "raise"
                        ? "bg-green-900/40 border border-green-700/50 hover:bg-green-800/50"
                        : action === "check"
                          ? "bg-gray-700/40 border border-gray-500/50 hover:bg-gray-600/50"
                          : "bg-gold/20 border border-gold/50 hover:bg-gold/30"
                }`}
              >
                {action === "fold" ? "FOLD" : action === "call" ? "CALL" : action === "raise" ? "RAISE" : action === "check" ? "CHECK" : "BET"}
              </button>
            ))}
          </div>
        )}
        {/* Desistir */}
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

// Helper para converter card → string (sem importar de cards.ts pra evitar duplicar)
function cardToStringHelper(card: number): string {
  const RANKS = "23456789TJQKA";
  const SUITS = "cdhs";
  const suitSymbols: Record<string, string> = { c: "♣", d: "♦", h: "♥", s: "♠" };
  const rank = RANKS[card >> 2];
  const suit = SUITS[card & 3];
  return `${rank}${suitSymbols[suit] ?? suit}`;
}

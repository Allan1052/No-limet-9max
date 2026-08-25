// ---------------------------------------------------------------------------
// GuidedHand — "primeira mão guiada" com o coach.
//
// Aparece NA PRIMEIRA VEZ que o usuário entra no app (após o onboarding).
// Simula uma mão de poker com balões do coach explicando cada passo.
// Termina com um momento de "aha" — o coach confirma a decisão certa.
//
// Persistido em localStorage: só mostra 1x. Botão "Pular" disponível.
// Estilo visual: dourado + feltro, marca Call ou Fold.
// ---------------------------------------------------------------------------
import { useState, useEffect, useCallback, useRef } from "react";
import { trackEvent } from "../app/analytics";

const LS_KEY = "cof-guided-hand-done";

export function hasSeenGuidedHand(): boolean {
  try {
    return localStorage.getItem(LS_KEY) === "true";
  } catch {
    return false;
  }
}

export function markGuidedHandDone(): void {
  try {
    localStorage.setItem(LS_KEY, "true");
  } catch {
    /* ignora */
  }
}

// Cada etapa do tutorial: o que o coach diz + o que acontece na "mesa"
interface GuidedStep {
  coachText: string;
  coachHighlight?: boolean; // destaque dourado
  cards?: { hero: string[]; board?: string[] }; // cartas na mesa (texto)
  action?: string; // ação sugerida: "fold", "call", "raise", "check"
  actionLabel?: string; // rótulo do botão
  delayMs?: number; // tempo antes de avançar
  isAha?: boolean; // momento "aha" — verde/celebratório
  isFinal?: boolean; // último passo com CTA
}

const STEPS: GuidedStep[] = [
  {
    coachText: "Bem-vindo! Eu sou seu coach. Vou te guiar numa mão rápida pra você ver como funciona.",
    cards: { hero: ["A♠", "K♥"] },
    delayMs: 3500,
  },
  {
    coachText: "Você está no BIG BLIND com Ás-Rei. A mão perfeita pra jogar.",
    cards: { hero: ["A♠", "K♥"], board: [] },
    delayMs: 3000,
  },
  {
    coachText: "O vilão do meio apostou 2x o blind. Você tem a melhor mão possível pro pre-flop.",
    cards: { hero: ["A♠", "K♥"], board: [] },
    action: "raise",
    actionLabel: "3-BET (re-raise)",
    delayMs: 3500,
  },
  {
    coachText: "Re-raise é a jogada certa aqui: mostra força e ganha o pote já no pre-flop se ele foldar.",
    cards: { hero: ["A♠", "K♥"], board: [] },
    delayMs: 3000,
  },
  {
    coachText: "O vilão pagou. Agora vem o flop: dois de copas. Perfeito pra você.",
    cards: { hero: ["A♠", "K♥"], board: ["A♣", "Q♠", "2♥"] },
    delayMs: 3000,
  },
  {
    coachText: "Par de Ás + kicker Rei. Você está MUITO na frente aqui.",
    cards: { hero: ["A♠", "K♥"], board: ["A♣", "Q♠", "2♥"] },
    delayMs: 2500,
  },
  {
    coachText: "O vilão checkou. Aqui é hora de apostar pra extrair valor — ele não sabe que você acertou.",
    cards: { hero: ["A♠", "K♥"], board: ["A♣", "Q♠", "2♥"] },
    action: "bet",
    actionLabel: "APOSTAR ½ pote",
    delayMs: 3500,
  },
  {
    coachText: "Ele pagou. Turn: nada que mude. Mantém a pressão.",
    cards: { hero: ["A♠", "K♥"], board: ["A♣", "Q♠", "2♥", "7♦"] },
    delayMs: 2500,
  },
  {
    coachText: "River: K♠. Agora você tem DOIS PARES (Ás + Rei). Mão fortíssima.",
    cards: { hero: ["A♠", "K♥"], board: ["A♣", "Q♠", "2♥", "7♦", "K♠"] },
    delayMs: 3000,
  },
  {
    coachText: "O vilão aposta ¾ do pote. Com dois pares, pagar aqui é lucrativo no longo prazo.",
    cards: { hero: ["A♠", "K♥"], board: ["A♣", "Q♠", "2♥", "7♦", "K♠"] },
    action: "call",
    actionLabel: "CALL",
    delayMs: 3000,
  },
  {
    coachText: "Você ganhou! Par de Ás + par de Rei. O vilão tinha só par de Dama.",
    cards: { hero: ["A♠", "K♥"], board: ["A♣", "Q♠", "2♥", "7♦", "K♠"] },
    isAha: true,
    delayMs: 3500,
  },
  {
    coachText: "Viu? Não foi sorte — foi DECISÃO certa em cada rua. É isso que o Call ou Fold te ensina, mão por mão. Bora jogar de verdade?",
    isFinal: true,
    delayMs: 4000,
  },
];

export function GuidedHand({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [skipping, setSkipping] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    trackEvent("guided_hand_started");
  }, []);

  const currentStep = STEPS[step] ?? STEPS[STEPS.length - 1];

  const advance = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      markGuidedHandDone();
      onDone();
    }
  }, [step, onDone]);

  // Auto-avançar após delay
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const delay = currentStep.delayMs ?? 3000;
    timerRef.current = setTimeout(advance, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [step, currentStep.delayMs, advance]);

  const skip = () => {
    trackEvent("guided_hand_skipped", { step });
    setSkipping(true);
    markGuidedHandDone();
    setTimeout(onDone, 400);
  };

  // Render do coach com balão
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "radial-gradient(ellipse at 50% 30%, #1a2a1a 0%, #0d0f0d 70%, #0a0a0a 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        animation: skipping ? "fadeOut 0.4s ease" : "fadeIn 0.3s ease",
      }}
    >
      {/* Estilo inline para animações */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes pulse-gold { 0%,100% { box-shadow: 0 0 8px #d4af3744; } 50% { box-shadow: 0 0 20px #d4af3788; } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes ahaGlow { from { box-shadow: 0 0 0 #5cbe8d00; } to { box-shadow: 0 0 40px #5cbe8d66; } }
      `}</style>

      {/* Barra de progresso */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "3px",
          width: `${((step + 1) / STEPS.length) * 100}%`,
          background: "linear-gradient(90deg, #d4af37, #e6c454)",
          transition: "width 0.5s ease",
        }}
      />

      {/* Botão pular */}
      <button
        onClick={skip}
        style={{
          position: "absolute",
          top: 12,
          right: 16,
          background: "transparent",
          border: "1px solid #d4af3755",
          color: "#d4af37",
          fontSize: 13,
          padding: "6px 14px",
          borderRadius: 8,
          cursor: "pointer",
          fontWeight: 600,
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.background = "#d4af3722";
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.background = "transparent";
        }}
      >
        Pular ▸
      </button>

      {/* Cartas na "mesa" */}
      {currentStep.cards && (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 24,
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/* Cartas do herói */}
          {currentStep.cards.hero.map((card, i) => (
            <div
              key={`hero-${i}`}
              style={{
                width: 56,
                height: 78,
                background: "linear-gradient(145deg, #f6f3e9, #ece7d5)",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 800,
                color: card.includes("♥") || card.includes("♦") ? "#c0392b" : "#1c1c1c",
                boxShadow: "0 4px 16px #00000066",
                border: "2px solid #d4af37",
                animation: "float 2s ease infinite",
                animationDelay: `${i * 0.2}s`,
              }}
            >
              {card}
            </div>
          ))}

          {/* Separador */}
          {currentStep.cards.board && currentStep.cards.board.length > 0 && (
            <span style={{ color: "#d4af3766", fontSize: 18, margin: "0 8px" }}>—</span>
          )}

          {/* Board */}
          {currentStep.cards.board?.map((card, i) => (
            <div
              key={`board-${i}`}
              style={{
                width: 48,
                height: 66,
                background: "linear-gradient(145deg, #f6f3e9, #ece7d5)",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 700,
                color: card.includes("♥") || card.includes("♦") ? "#c0392b" : "#1c1c1c",
                boxShadow: "0 2px 8px #00000044",
                border: "1px solid #d4af3744",
                opacity: 0.9,
              }}
            >
              {card}
            </div>
          ))}
        </div>
      )}

      {/* Balão do coach */}
      <div
        style={{
          maxWidth: 460,
          width: "100%",
          padding: "20px 24px",
          background: currentStep.isAha
            ? "linear-gradient(135deg, #245f40, #17452f)"
            : currentStep.isFinal
              ? "linear-gradient(135deg, #2a2010, #1a1508)"
              : "linear-gradient(135deg, #173d2a, #10271c)",
          boxShadow: "0 14px 34px #00000066",
          borderRadius: 16,
          border: currentStep.isAha
            ? "2px solid #5cbe8d"
            : currentStep.isFinal
              ? "2px solid #d4af37"
              : "1px solid #5cbe8d66",
          animation: currentStep.isAha ? "ahaGlow 1s ease forwards" : undefined,
          position: "relative",
        }}
      >
        {/* "Orelha" do balão */}
        <div
          style={{
            position: "absolute",
            top: -8,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "10px solid transparent",
            borderRight: "10px solid transparent",
            borderBottom: `10px solid ${currentStep.isAha ? "#245f40" : currentStep.isFinal ? "#2a2010" : "#173d2a"}`,
          }}
        />

        {/* Avatar do coach */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #d4af37, #e6c454)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
            }}
          >
            🧠
          </div>
          <span style={{ fontSize: 12, color: "#d4af37", fontWeight: 700, letterSpacing: 1 }}>
            COACH
          </span>
        </div>

        <p
          style={{
            margin: 0,
            fontSize: 16,
            lineHeight: 1.5,
            color: currentStep.isAha ? "#e8f5e9" : currentStep.isFinal ? "#f5e6c0" : "#e8e6dc",
            fontWeight: currentStep.isAha ? 700 : 400,
          }}
        >
          {currentStep.coachText}
        </p>

        {/* Botão de ação sugerida */}
        {currentStep.action && (
          <div
            style={{
              marginTop: 12,
              padding: "8px 16px",
              background: currentStep.isAha ? "#5cbe8d22" : "#d4af3718",
              borderRadius: 8,
              border: `1px solid ${currentStep.isAha ? "#5cbe8d55" : "#d4af3744"}`,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 13, color: currentStep.isAha ? "#5cbe8d" : "#d4af37", fontWeight: 700 }}>
              → {currentStep.actionLabel}
            </span>
          </div>
        )}

        {/* CTA final */}
        {currentStep.isFinal && (
          <button
            onClick={() => {
              trackEvent("guided_hand_cta_clicked");
              markGuidedHandDone();
              onDone();
            }}
            style={{
              marginTop: 14,
              padding: "10px 24px",
              background: "linear-gradient(135deg, #d4af37, #e6c454)",
              color: "#0d0f0d",
              fontWeight: 800,
              fontSize: 14,
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              animation: "pulse-gold 2s ease infinite",
              letterSpacing: 0.5,
            }}
          >
            ▶ JOGAR AGORA
          </button>
        )}
      </div>

      {/* Indicador de progresso */}
      <div style={{ marginTop: 16, display: "flex", gap: 4 }}>
        {STEPS.map((_, i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: i === step ? "#d4af37" : i < step ? "#d4af3755" : "#333",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}

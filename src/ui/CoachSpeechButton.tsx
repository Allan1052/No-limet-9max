// ---------------------------------------------------------------------------
// Botão "🔊" que fala o feedback do coach quando clicado.
// Mostra ⏸ quando está falando (clica pra pausar/retomar).
// ---------------------------------------------------------------------------
import { useEffect, useState } from "react";
import {
  speakCoach,
  stopCoach,
  isSpeechAvailable,
} from "../app/coachSpeech";

export function CoachSpeechButton({
  text,
  autoPlay = false,
  size = "normal",
}: {
  text: string;
  autoPlay?: boolean;
  size?: "normal" | "small";
}) {
  const [speaking, setSpeaking] = useState(false);

  // Auto-play quando o componente monta (se habilitado)
  useEffect(() => {
    if (autoPlay && text && isSpeechAvailable()) {
      setSpeaking(true);
      speakCoach(text).then(() => setSpeaking(false));
    }
    // Cleanup: para a fala quando o componente desmonta
    return () => {
      if (autoPlay) stopCoach();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, autoPlay]);

  if (!isSpeechAvailable()) return null;

  const handleToggle = () => {
    if (speaking) {
      stopCoach();
      setSpeaking(false);
    } else {
      setSpeaking(true);
      speakCoach(text).then(() => setSpeaking(false));
    }
  };

  const btnSize = size === "small" ? 32 : 36;
  const fontSize = size === "small" ? 16 : 18;

  return (
    <button
      onClick={handleToggle}
      title={speaking ? "Pausar" : "Ouvir coach"}
      style={{
        background: "transparent",
        border: `1.5px solid ${speaking ? "#d4af37" : "#666"}`,
        borderRadius: btnSize / 2,
        width: btnSize,
        height: btnSize,
        fontSize,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: speaking ? "#d4af37" : "#aaa",
        transition: "all 0.2s ease",
        padding: 0,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {speaking ? "⏸" : "🔊"}
    </button>
  );
}

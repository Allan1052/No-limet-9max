// ---------------------------------------------------------------------------
// Botão "📤 Compartilhar" — gera o Hand Share Card e compartilha via
// Web Share API (celular) ou download (desktop).
// ---------------------------------------------------------------------------
import { useState } from "react";
import { drawHandShareCard, type HandShareData } from "../app/handShareCard";
import { shareSpot } from "../app/share";
import { isXpUnlocked, loadXpState, saveXpState, processXpEvent } from "../app/achievements";

const SHARE_TEXT = "Essa mão eu joguei no Call ou Fold — simulador grátis de poker. 🃏\nSem dinheiro real. Só estudo.";
const SHARE_URL = "https://calloufold.com.br";
const DISCLAIMER = "App de estudo. Sem apostas nem dinheiro real.";

export function HandShareButton({
  data,
  label = "📤 Compartilhar",
  className = "btn",
}: {
  data: HandShareData;
  label?: string;
  className?: string;
}) {
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  const handleShare = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const blob = await drawHandShareCard(data);
      if (!blob) return;

      const result = await shareSpot(blob, SHARE_URL, SHARE_TEXT, DISCLAIMER);
      if (result === "shared" || result === "copied") {
        setDone(true);
        setTimeout(() => setDone(false), 3000);
        // XP: achievement "Compartilhador"
        if (isXpUnlocked()) {
          const xpState = loadXpState();
          const xpResult = processXpEvent(xpState, { type: "shareHand" });
          saveXpState(xpResult.state);
        }
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      className={className}
      disabled={generating}
      onClick={handleShare}
      title="Gera um card com a mão para compartilhar no Instagram/WhatsApp"
    >
      {generating ? "Gerando…" : done ? "✓ Compartilhado!" : label}
    </button>
  );
}

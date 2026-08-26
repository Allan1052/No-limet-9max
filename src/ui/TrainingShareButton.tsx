// ---------------------------------------------------------------------------
// Training Share Button — gera um card PNG de resultado de treino (Drill Mode,
// Treino de Maestria, Hand Lab) e compartilha via Web Share API ou download.
// ---------------------------------------------------------------------------
import { useState } from "react";
import { drawTrainingCard, type TrainingShareData } from "../app/drawTrainingCard";
import { shareSpot } from "../app/share";
import { isXpUnlocked, loadXpState, saveXpState, processXpEvent } from "../app/achievements";
import { trackEvent } from "../app/analytics";

const SHARE_TEXT = "Treinei poker no Call ou Fold — simulador grátis. 🃏\nSem dinheiro real. Só estudo.";
const SHARE_URL = "https://calloufold.com.br";
const DISCLAIMER = "App de estudo. Sem apostas nem dinheiro real.";

export function TrainingShareButton({
  data,
  label = "📤 Compartilhar resultado",
  className = "btn",
}: {
  data: TrainingShareData;
  label?: string;
  className?: string;
}) {
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  const handleShare = async () => {
    if (generating) return;
    setGenerating(true);
    trackEvent("share_started", { source: "training" });
    try {
      const blob = await drawTrainingCard(data);
      if (!blob) {
        trackEvent("share_failed", { source: "training", reason: "card_generation" });
        return;
      }
      const result = await shareSpot(blob, SHARE_URL, SHARE_TEXT, DISCLAIMER);
      if (result === "shared" || result === "copied") {
        trackEvent("share_succeeded", { source: "training", method: result });
        setDone(true);
        setTimeout(() => setDone(false), 3000);
        // XP: achievement "Compartilhador"
        if (isXpUnlocked()) {
          const xpState = loadXpState();
          const xpResult = processXpEvent(xpState, { type: "shareHand" });
          saveXpState(xpResult.state);
        }
      } else if (result === "cancelled") {
        trackEvent("share_cancelled", { source: "training" });
      } else {
        trackEvent("share_failed", { source: "training", reason: result });
      }
    } catch {
      trackEvent("share_failed", { source: "training", reason: "exception" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      className={className}
      disabled={generating}
      onClick={handleShare}
      title="Gera um card com seu resultado para compartilhar no Instagram/WhatsApp"
    >
      {generating ? "Gerando…" : done ? "✓ Compartilhado!" : label}
    </button>
  );
}

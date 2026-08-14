// ---------------------------------------------------------------------------
// Botão "🏆 Compartilhar conquista" — gera o Card de Conquista (1080×1080)
// com a logo oficial, colocação, campo, prêmio e CTA do app.
// Compartilha via Web Share API (celular) ou download (desktop).
// ---------------------------------------------------------------------------
import { useState } from "react";
import { drawTrophyCard, type TrophyShareData } from "../app/handShareCard";
import { shareSpot } from "../app/share";

const SHARE_TEXT = "Fiz um resultado no Call ou Fold — simulador grátis de poker. 🃏\nSem dinheiro real. Só estudo.";
const SHARE_URL = "https://calloufold.com.br";
const DISCLAIMER = "App de estudo. Sem apostas nem dinheiro real.";

export function TrophyShareButton({
  data,
  label = "🏆 Compartilhar conquista",
  className = "btn",
}: {
  data: TrophyShareData;
  label?: string;
  className?: string;
}) {
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  const handleShare = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const blob = await drawTrophyCard(data);
      if (!blob) return;
      const result = await shareSpot(blob, SHARE_URL, SHARE_TEXT, DISCLAIMER);
      if (result === "shared" || result === "copied") {
        setDone(true);
        setTimeout(() => setDone(false), 3000);
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
      title="Gera um card com a sua conquista para compartilhar no Instagram/WhatsApp"
    >
      {generating ? "Gerando…" : done ? "✓ Compartilhado!" : label}
    </button>
  );
}

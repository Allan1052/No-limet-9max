// ---------------------------------------------------------------------------
// Botão "📤 Compartilhar" — gera o Hand Share Card e compartilha via
// Web Share API (celular) ou download (desktop).
//
// Quando o dev-unlock "card_dev_unlock" está ativo no localStorage, mostra
// dois botões: um para o card "Simples" e outro para o "Técnico".
// Sem o unlock, só aparece o card Simples (padrão).
// ---------------------------------------------------------------------------
import { useState } from "react";
import { drawHandShareCard, type HandShareData, type ShareCardMode } from "../app/handShareCard";
import { shareSpot } from "../app/share";
import { isXpUnlocked, loadXpState, saveXpState, processXpEvent } from "../app/achievements";

/** Baixa um blob como PNG — usado para o carrossel (2 imagens prontas para o
 *  Instagram). O Web Share API com múltiplos arquivos só funciona no Android;
 *  o download funciona em qualquer dispositivo. */
async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const SHARE_TEXT = "Essa mão eu joguei no Call ou Fold — simulador grátis de poker. 🃏\nSem dinheiro real. Só estudo.";
const SHARE_URL = "https://calloufold.com.br";
const DISCLAIMER = "App de estudo. Sem apostas nem dinheiro real.";

function isCardDevUnlocked(): boolean {
  return localStorage.getItem("card_dev_unlock") === "true";
}

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
  const showToggle = isCardDevUnlocked();

  const handleShare = async (mode: ShareCardMode) => {
    if (generating) return;
    setGenerating(true);
    try {
      const blob = await drawHandShareCard(data, mode);
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

  // CARROSSEL (2 cards): card da decisão + card do histórico completo, prontos
  // para postar como carrossel no Instagram. Baixa os 2 PNGs sequencialmente.
  const handleCarousel = async () => {
    if (generating || !data.actionLog || data.actionLog.length < 3) return;
    setGenerating(true);
    try {
      const card1 = await drawHandShareCard(data, "simples", "decisao");
      const card2 = await drawHandShareCard(data, "simples", "historico");
      if (card1) await downloadBlob(card1, "card_1_desafio.png");
      if (card2) await downloadBlob(card2, "card_2_historico.png");
      setDone(true);
      setTimeout(() => setDone(false), 3000);
      if (isXpUnlocked()) {
        const xpState = loadXpState();
        const xpResult = processXpEvent(xpState, { type: "shareHand" });
        saveXpState(xpResult.state);
      }
    } finally {
      setGenerating(false);
    }
  };

  const showCarousel = showToggle && !!data.actionLog && data.actionLog.length >= 3;

  if (showToggle) {
    return (
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <button
          className={className}
          disabled={generating}
          onClick={() => handleShare("simples")}
          title="Card simples — sem jargão técnico"
        >
          {generating ? "Gerando…" : done ? "✓ Compartilhado!" : "📤 Simples"}
        </button>
        <button
          className={className}
          disabled={generating}
          onClick={() => handleShare("tecnico")}
          title="Card técnico — com equity, pot odds e EV"
        >
          {generating ? "Gerando…" : done ? "✓ Compartilhado!" : "📐 Técnico"}
        </button>
        {showCarousel ? (
          <button
            className={className}
            disabled={generating}
            onClick={handleCarousel}
            title="Baixa 2 cards (decisão + histórico completo) para postar em carrossel no Instagram"
          >
            {generating ? "Gerando…" : done ? "✓ Baixado!" : "🖼️ Carrossel (2 cards)"}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <button
      className={className}
      disabled={generating}
      onClick={() => handleShare("simples")}
      title="Gera um card com a mão para compartilhar no Instagram/WhatsApp"
    >
      {generating ? "Gerando…" : done ? "✓ Compartilhado!" : label}
    </button>
  );
}

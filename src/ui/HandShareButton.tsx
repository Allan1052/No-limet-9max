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
import { shareSpot, shareMulti, downloadBlob } from "../app/share";
import { isXpUnlocked, loadXpState, saveXpState, processXpEvent } from "../app/achievements";
import { buildCaption } from "../app/captionSuggestions";


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

  // CARROSSEL: card da decisão + card do histórico completo (que já inclui
  // pote por rua, showdown e pote final). No Android/iOS com suporte, os 2
  // cards saem juntos e o Instagram monta o carrossel automaticamente;
  // quando o celular não aceita envio múltiplo, baixa os 2 PNGs prontos.
  const handleCarousel = async () => {
    if (generating || !data.actionLog || data.actionLog.length < 3) return;
    setGenerating(true);
    try {
      const card1 = await drawHandShareCard(data, "simples", "decisao");
      const card2 = await drawHandShareCard(data, "simples", "narrativa");
      if (!card1 || !card2) return;
      const files = [
        new File([card1], "card_1_resultado.png", { type: "image/png" }),
        new File([card2], "card_2_rua_por_rua.png", { type: "image/png" }),
      ];
      const result = await shareMulti(files, SHARE_URL, SHARE_TEXT, DISCLAIMER);
      if (result === "download") {
        await downloadBlob(card1, "card_1_resultado.png");
        await downloadBlob(card2, "card_2_rua_por_rua.png");
      }
      if (result === "shared" || result === "download") {
        setDone(true);
        setTimeout(() => setDone(false), 3000);
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

  const showCarousel = showToggle && !!data.actionLog && data.actionLog.length >= 3;

  // LEGENDA PRONTA: caption gerada com os dados da mão + botão copiar, pra
  // postar direto no Instagram sem escrever nada.
  const caption = buildCaption({
    heroAction: data.heroAction,
    position: data.position,
    stackBB: data.stackBB,
    street: data.street,
    tournamentResult: data.tournamentResult,
    actionLog: data.actionLog,
  });

  const handleCopyCaption = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(caption);
      } else {
        const ta = document.createElement("textarea");
        ta.value = caption;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch {
      // ignorar — o usuário pode copiar manualmente do painel
    }
  };

  const showCaption = !!caption;

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
            title="Envia os 2 cards juntos no carrossel (Instagram/WhatsApp); se o celular não aceitar, baixa os PNGs prontos"
          >
            {generating ? "Gerando…" : done ? "✓ Pronto!" : "🖼️ Carrossel (2 cards)"}
          </button>
        ) : null}
        {showCaption ? (
          <button
            className={className}
            disabled={generating}
            onClick={handleCopyCaption}
            title="Copia a legenda pronta para colar direto no post do Instagram"
          >
            {done ? "✓ Copiada!" : "📝 Copiar legenda"}
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

// ---------------------------------------------------------------------------
// Painel da legenda pronta — aparece quando o dev-unlock do card está ativo.
// Mostra a legenda gerada para a mão e o botão de copiar, tudo na mesma tela.
// ---------------------------------------------------------------------------
export function CaptionPanel({ data }: { data: HandShareData }) {
  const [copied, setCopied] = useState(false);
  // Colapsível (pedido do Allan 16/08): só a linha de copiar visível;
  // o texto da legenda aparece ao tocar, sem ocupar espaço.
  const [open, setOpen] = useState(false);
  const caption = buildCaption({
    heroAction: data.heroAction,
    position: data.position,
    stackBB: data.stackBB,
    street: data.street,
    tournamentResult: data.tournamentResult,
    actionLog: data.actionLog,
  });

  const copy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(caption);
      } else {
        const ta = document.createElement("textarea");
        ta.value = caption;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // ignorar
    }
  };

  return (
    <div
      style={{
        marginTop: 12,
        background: "rgba(0,0,0,0.28)",
        border: "1px solid rgba(212,175,55,0.35)",
        borderRadius: 12,
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span style={{ color: "#d4af37", fontWeight: 700, fontSize: 14 }}>
          📝 Legenda pronta pro Instagram
        </span>
        <button
          className="btn"
          onClick={copy}
          style={{ fontSize: 13, padding: "6px 12px" }}
        >
          {copied ? "✓ Copiada!" : "📋 Copiar"}
        </button>
      </div>
      {!open ? null : (
        <pre
          style={{
            color: "#f5f0e1",
            fontSize: 13,
            lineHeight: 1.45,
            margin: 0,
            whiteSpace: "pre-wrap",
            fontFamily: "inherit",
          }}
        >
          {caption}
        </pre>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          marginTop: 8,
          background: "none",
          border: "none",
          color: "#d4af37",
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
          padding: 0,
        }}
      >
        {open ? "▲ Ocultar legenda" : "▼ Ver legenda"}
      </button>
    </div>
  );
}

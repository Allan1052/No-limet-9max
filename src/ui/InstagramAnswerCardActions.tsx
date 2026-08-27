// ---------------------------------------------------------------------------
// Conteúdo para Instagram — card de resposta de quatro fases.
// O painel usa os dados do mesmo resultado que o jogador acabou de analisar.
// Não recalcula nem altera o motor; apenas exporta o resultado em formatos sociais.
// ---------------------------------------------------------------------------
import { useState } from "react";
import type { HandLabSpec } from "../train/stage";
import {
  buildFourFasesInstagramCaption,
  generateFourFasesInstagramCard,
  renderFourFasesInstagramCard,
} from "../app/seriesGen";
import { downloadBlob } from "../app/share";
import { staticCardToReel, STATIC_REEL_DURATION_SECONDS } from "../app/instagramReel";
import { trackEvent } from "../app/analytics";

const MP4_NAME = (spec: HandLabSpec) => `cof-resposta-4-fases-${Math.round(spec.stackBB)}bb-12s.mp4`;

type Action = "png" | "reel" | "caption";

export function InstagramAnswerCardActions({ spec }: { spec: HandLabSpec }) {
  const [busy, setBusy] = useState<Action | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const caption = buildFourFasesInstagramCaption(spec);

  const run = async (action: Action) => {
    if (busy) return;
    setBusy(action);
    setMessage(null);
    trackEvent("instagram_card_started", { format: action });
    try {
      if (action === "caption") {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(caption);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = caption;
          textarea.setAttribute("readonly", "true");
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          textarea.remove();
        }
        setMessage("✓ Legenda copiada — cole no Instagram.");
        trackEvent("instagram_card_succeeded", { format: action });
        return;
      }

      if (action === "png") {
        const name = await generateFourFasesInstagramCard(spec);
        setMessage(`✓ ${name} baixado.`);
        trackEvent("instagram_card_succeeded", { format: action });
        return;
      }

      const card = await renderFourFasesInstagramCard(spec);
      const reel = await staticCardToReel(card, STATIC_REEL_DURATION_SECONDS);
      const filename = MP4_NAME(spec).replace(/\.mp4$/, `.${reel.extension}`);
      await downloadBlob(reel.blob, filename);
      setMessage(reel.extension === "mp4"
        ? "✓ Reel MP4 de 12s baixado — adicione a música no Instagram."
        : "✓ Reel WebM de 12s baixado. Este navegador não tem H.264; para o Instagram, monte o Reel a partir do PNG ou use outro navegador.");
      trackEvent("instagram_card_succeeded", { format: action, durationSeconds: STATIC_REEL_DURATION_SECONDS, extension: reel.extension });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Não foi possível gerar este arquivo.";
      setMessage(`⚠ ${detail}`);
      trackEvent("instagram_card_failed", { format: action, reason: detail.slice(0, 120) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="ig-answer-tools" aria-label="Conteúdo para Instagram">
      <div className="ig-answer-tools-head">
        <div>
          <p className="ig-answer-tools-kicker">CONTEÚDO PARA INSTAGRAM</p>
          <h3>Resposta em 4 fases</h3>
          <p className="ig-answer-tools-sub">
            Card preenchido com o spot desta mão. O Reel fica parado por 12 segundos para você adicionar uma música no Instagram.
          </p>
        </div>
        <span className="ig-answer-tools-badge">9:16</span>
      </div>

      <div className="ig-answer-tools-actions">
        <button className="btn primary" onClick={() => run("png")} disabled={!!busy}>
          {busy === "png" ? "Gerando…" : "📸 Baixar card PNG"}
        </button>
        <button className="btn" onClick={() => run("reel")} disabled={!!busy}>
          {busy === "reel" ? "Gerando Reel…" : "🎬 Baixar Reel · 12s"}
        </button>
        <button className="btn" onClick={() => run("caption")} disabled={!!busy}>
          {busy === "caption" ? "Copiando…" : "📝 Copiar legenda"}
        </button>
      </div>

      {message ? <p className="ig-answer-tools-message" role="status" aria-live="polite">{message}</p> : null}
      <details className="ig-answer-tools-caption">
        <summary>Ver legenda gerada</summary>
        <pre>{caption}</pre>
      </details>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Conteúdo para Instagram — card automático de resposta.
// O painel usa os dados do mesmo resultado que o jogador acabou de analisar.
// Não recalcula nem altera o motor; apenas escolhe o formato social adequado.
// ---------------------------------------------------------------------------
import { useEffect, useState } from "react";
import type { HandLabSpec } from "../train/stage";
import {
  buildFourFasesInstagramCaption,
  buildFourFasesInstagramSvg,
  buildSingleAnswerCaption,
  buildSingleAnswerSvg,
  classifyCardSpot,
  renderFourFasesInstagramCard,
  renderInstagramCardSvg,
} from "../app/seriesGen";
import { downloadBlob } from "../app/share";
import { staticCardToReel, STATIC_REEL_DURATION_SECONDS } from "../app/instagramReel";
import { trackEvent } from "../app/analytics";

const PNG_NAME = (spec: HandLabSpec, kind: "fases" | "unica") =>
  `cof-${kind === "fases" ? "resposta-4-fases" : "decisao"}-${Math.round(spec.stackBB)}bb.png`;
const MP4_NAME = (spec: HandLabSpec) => `cof-resposta-4-fases-${Math.round(spec.stackBB)}bb-12s.mp4`;

type Action = "png" | "reel" | "caption";

export function InstagramAnswerCardActions({ spec }: { spec: HandLabSpec }) {
  const [busy, setBusy] = useState<Action | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const classification = classifyCardSpot(spec);
  const isPhases = classification.kind === "fases";
  const specKey = JSON.stringify(spec);

  useEffect(() => {
    // Uma nova análise não pode herdar o nome/sucesso do arquivo da mão anterior.
    setMessage(null);
    setBusy(null);
  }, [specKey, classification.kind]);
  const caption = isPhases
    ? buildFourFasesInstagramCaption(spec)
    : buildSingleAnswerCaption(spec);

  const run = async (action: Action) => {
    if (busy) return;
    if (action === "reel" && !isPhases) {
      setMessage("⚠ Este spot é de decisão única; o Reel de 12s só existe quando há mudança entre fases.");
      return;
    }

    setBusy(action);
    setMessage(null);
    trackEvent("instagram_card_started", { format: action, kind: classification.kind });
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
        trackEvent("instagram_card_succeeded", { format: action, kind: classification.kind });
        return;
      }

      if (action === "png") {
        // A classificação é explícita aqui para que o card não invente quatro
        // fases em um spot fundo ou sem mudança de decisão.
        const svg = isPhases ? buildFourFasesInstagramSvg(spec) : buildSingleAnswerSvg(spec);
        const blob = await renderInstagramCardSvg(svg);
        const name = PNG_NAME(spec, classification.kind);
        downloadBlob(blob, name);
        setMessage(`✓ ${name} baixado.`);
        trackEvent("instagram_card_succeeded", { format: action, kind: classification.kind });
        return;
      }

      // O Reel permanece exclusivo do card de quatro fases: o still é a única
      // saída para a decisão única, evitando uma história de ICM sem flip real.
      const card = await renderFourFasesInstagramCard(spec);
      const reel = await staticCardToReel(card, STATIC_REEL_DURATION_SECONDS);
      const filename = MP4_NAME(spec).replace(/\.mp4$/, `.${reel.extension}`);
      await downloadBlob(reel.blob, filename);
      setMessage(reel.extension === "mp4"
        ? "✓ Reel MP4 de 12s baixado — adicione a música no Instagram."
        : "✓ Reel WebM de 12s baixado. Este navegador não tem H.264; para o Instagram, monte o Reel a partir do PNG ou use outro navegador.");
      trackEvent("instagram_card_succeeded", {
        format: action,
        kind: classification.kind,
        durationSeconds: STATIC_REEL_DURATION_SECONDS,
        extension: reel.extension,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Não foi possível gerar este arquivo.";
      setMessage(`⚠ ${detail}`);
      trackEvent("instagram_card_failed", { format: action, kind: classification.kind, reason: detail.slice(0, 120) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="ig-answer-tools" aria-label="Conteúdo para Instagram">
      <div className="ig-answer-tools-head">
        <div>
          <p className="ig-answer-tools-kicker">CONTEÚDO PARA INSTAGRAM</p>
          <h3>{isPhases ? "Resposta em 4 fases" : "Decisão única"}</h3>
          <p className="ig-answer-tools-sub">
            {isPhases
              ? "Card preenchido com o spot desta mão. O Reel fica parado por 12 segundos para você adicionar uma música no Instagram."
              : "Card preenchido com a decisão deste spot e o porquê. Para este cenário, a saída correta é um still — sem Reel de 12 segundos."
            }
          </p>
          <p className="ig-answer-tools-sub">Escolha automática: {classification.reason}</p>
        </div>
        <span className="ig-answer-tools-badge">9:16</span>
      </div>

      <div className="ig-answer-tools-actions">
        <button className="btn primary" onClick={() => run("png")} disabled={!!busy}>
          {busy === "png" ? "Gerando…" : "📸 Baixar card PNG"}
        </button>
        {isPhases ? (
          <button className="btn" onClick={() => run("reel")} disabled={!!busy}>
            {busy === "reel" ? "Gerando Reel…" : "🎬 Baixar Reel · 12s"}
          </button>
        ) : null}
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

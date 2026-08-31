import { useState } from "react";
import type { HandAnalysis } from "../train/stage";
import { buildHandLabReferenceSharePlan } from "../app/handLabReferenceShare";
import { renderReferenceCardPng, type ReferenceCardFormat } from "../app/shareCardReference";
import { downloadBlob, shareMulti } from "../app/share";
import { isXpUnlocked, loadXpState, processXpEvent, saveXpState } from "../app/achievements";
import { trackEvent } from "../app/analytics";

const SHARE_URL = "https://calloufold.com.br";
const SHARE_TEXT = "Call ou Fold? Analisei esta decisão de torneio no Call ou Fold.";
const DISCLAIMER = "App de estudo. Sem apostas nem dinheiro real.";

type ShareState = "idle" | "generating" | "done" | "error";

export function HandLabReferenceShare({ analysis }: { analysis: HandAnalysis }) {
  const [state, setState] = useState<ShareState>("idle");
  const [activeFormat, setActiveFormat] = useState<ReferenceCardFormat | null>(null);

  const grantShareXp = () => {
    if (!isXpUnlocked()) return;
    const xpState = loadXpState();
    const xpResult = processXpEvent(xpState, { type: "shareHand" });
    saveXpState(xpResult.state);
  };

  const handleShare = async (format: ReferenceCardFormat) => {
    if (state === "generating") return;
    setState("generating");
    setActiveFormat(format);
    trackEvent("share_started", { source: "hand_lab_reference", format });

    try {
      const plan = buildHandLabReferenceSharePlan(analysis, format);
      const rendered = await Promise.all(
        plan.slides.map(async ({ slide, filename }) => ({
          slide,
          filename,
          blob: await renderReferenceCardPng(plan.model, format, slide),
        })),
      );

      if (rendered.some((item) => !item.blob)) {
        trackEvent("share_failed", { source: "hand_lab_reference", format, reason: "card_generation" });
        setState("error");
        return;
      }

      const images = rendered as Array<{ slide: 1 | 2; filename: string; blob: Blob }>;
      const files = images.map(({ blob, filename }) => new File([blob], filename, { type: "image/png" }));
      const result = await shareMulti(files, SHARE_URL, SHARE_TEXT, DISCLAIMER);

      if (result === "download") {
        for (const { blob, filename } of images) await downloadBlob(blob, filename);
        trackEvent("share_succeeded", { source: "hand_lab_reference", format, method: "download" });
        grantShareXp();
        setState("done");
      } else if (result === "shared" || result === "copied") {
        trackEvent("share_succeeded", { source: "hand_lab_reference", format, method: result });
        grantShareXp();
        setState("done");
      } else if (result === "cancelled") {
        trackEvent("share_cancelled", { source: "hand_lab_reference", format });
        setState("idle");
      } else {
        trackEvent("share_failed", { source: "hand_lab_reference", format, reason: result });
        setState("error");
      }
    } catch {
      trackEvent("share_failed", { source: "hand_lab_reference", format, reason: "exception" });
      setState("error");
    } finally {
      setTimeout(() => {
        setState((current) => current === "generating" ? "idle" : current);
      }, 0);
    }
  };

  const label = (format: ReferenceCardFormat, normal: string) => {
    if (state === "generating" && activeFormat === format) return "Gerando 2 telas…";
    if (state === "done" && activeFormat === format) return "✓ Pronto!";
    if (state === "error" && activeFormat === format) return "Tentar novamente";
    return normal;
  };

  return (
    <div className="mt-4" aria-label="Compartilhar análise em duas telas">
      <p style={{ margin: "0 0 8px", color: "#b8b29a", fontSize: 12.5, textAlign: "center" }}>
        Compartilhe em 2 telas: pergunta + resposta com a matemática da decisão.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button
          className="btn"
          disabled={state === "generating"}
          onClick={() => void handleShare("feed")}
          title="Gera duas imagens 4:5 para Feed/WhatsApp"
        >
          {label("feed", "📤 Feed 4:5")}
        </button>
        <button
          className="btn"
          disabled={state === "generating"}
          onClick={() => void handleShare("story")}
          title="Gera duas imagens 9:16 para Stories"
        >
          {label("story", "📱 Story 9:16")}
        </button>
      </div>
    </div>
  );
}

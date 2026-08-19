// ---------------------------------------------------------------------------
// "Apoie o sonho" — Pix voluntário. NÃO é cadeado: o app segue grátis, nada
// bloqueado. Mostra o QR (gerado no aparelho, sem CDN) e o Pix Copia e Cola,
// com botões de copiar. Quem quer e pode, apoia; quem não pode, fecha e joga.
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import qrcode from "qrcode-generator";
import { useT } from "../i18n";
import { PIX_COPIA_E_COLA, PIX_KEY, PIX_DISPLAY_NAME, PIX_CITY } from "../app/pix";

/** Gera a matriz do QR e devolve o "d" de um <path> (módulos escuros). */
function makeQrPath(text: string): { count: number; d: string } {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  let d = "";
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    }
  }
  return { count, d };
}

async function copy(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback abaixo */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function SupportPix({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const [copied, setCopied] = useState<"" | "key" | "code">("");
  // Anonimato: o nome completo só aparece depois que a pessoa decide de
  // verdade (primeiro clique em "Copiar"). Antes disso, exibe "Call ou Fold".
  const [revealed, setRevealed] = useState(false);
  const qr = useMemo(() => makeQrPath(PIX_COPIA_E_COLA), []);
  const margin = 4;
  const size = qr.count + margin * 2;

  const doCopy = async (what: "key" | "code", value: string) => {
    setRevealed(true);
    if (await copy(value)) {
      setCopied(what);
      setTimeout(() => setCopied(""), 1800);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="pix-card" onClick={(e) => e.stopPropagation()}>
        <button className="pix-close" onClick={onClose} aria-label="Fechar">
          ✕
        </button>

        <div className="pix-title">💚 {t("support.title")}</div>
        <p className="pix-body">{t("support.body")}</p>

        <div className="pix-qr-wrap">
          <svg
            className="pix-qr"
            viewBox={`0 0 ${size} ${size}`}
            role="img"
            aria-label="QR Code Pix"
            shapeRendering="crispEdges"
          >
            <rect x="0" y="0" width={size} height={size} fill="#ffffff" />
            <g transform={`translate(${margin} ${margin})`} fill="#0b0b0b">
              <path d={qr.d} />
            </g>
          </svg>
        </div>

        <div className="pix-to">
          {t("support.to")} <b>{revealed ? PIX_DISPLAY_NAME : "Call ou Fold"}</b> · {PIX_CITY}
        </div>

        <div className="pix-key-row">
          <span className="pix-key-label">{t("support.keyLabel")}</span>
          <code className="pix-key">{PIX_KEY}</code>
          <button className="btn tiny" onClick={() => doCopy("key", PIX_KEY)}>
            {copied === "key" ? `✓ ${t("support.copied")}` : t("support.copyKey")}
          </button>
        </div>

        <button className="btn primary pix-copy-code" onClick={() => doCopy("code", PIX_COPIA_E_COLA)}>
          {copied === "code" ? `✓ ${t("support.copied")}` : `📋 ${t("support.copyCode")}`}
        </button>

        <div className="pix-free">{t("support.free")}</div>
      </div>
    </div>
  );
}

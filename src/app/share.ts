// Compartilhamento com fallback: tenta a Web Share API com IMAGEM (celular),
// depois só texto+link, e por fim copia o link para a área de transferência.

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

/** Compartilha UMA imagem (fluxo original, usado pelo card simples). */
export async function shareSpot(
  blob: Blob | null,
  url: string,
  text: string,
  securityDisclaimer: string | null = null,
): Promise<ShareResult> {
  const result = await shareMulti(
    blob ? [new File([blob], "call-ou-fold-desafio.png", { type: "image/png" })] : [],
    url,
    text,
    securityDisclaimer,
  );
  // shareSpot mantém o contrato original: "download" aqui vira "failed" (o
  // chamador não pede fallback de download, que é responsabilidade do botão).
  return result === "download" ? "failed" : result;
}

/**
 * Compartilha VÁRIAS imagens de uma vez — o Web Share API aceita múltiplos
 * arquivos no Android e monta o carrossel nativo automaticamente. Quando o
 * navegador não suporta envio de múltiplos arquivos (iPhone/Safari, desktop),
 * devolve "download" e os arquivos prontos, para baixar e postar.
 */
export async function shareMulti(
  files: File[],
  url: string,
  text: string,
  securityDisclaimer: string | null = null,
): Promise<ShareResult | "download"> {
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
  };

  // 1) Web Share com múltiplos arquivos (carrossel nativo no celular).
  if (files.length > 0) {
    if (nav.canShare?.({ files }) && nav.share) {
      try {
        await nav.share({ files, text: securityDisclaimer ? `${securityDisclaimer}\n\n${text}` : text, url });
        return "shared";
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return "cancelled";
        // cai para os próximos métodos
      }
    }
  }

  // 2) Web Share só com texto + link.
  if (nav.share) {
    try {
      await nav.share({ text: securityDisclaimer ? `${securityDisclaimer}\n\n${text} ${url}` : `${text} ${url}` });
      return "shared";
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return "cancelled";
    }
  }

  // 3) Se tinha imagens mas não deu para enviar: devolve os arquivos para
  // download (o usuário monta o carrossel manualmente — Instagram aceita
  // múltiplas imagens da galeria).
  if (files.length > 0) {
    return "download";
  }

  // 4) Fallback: copia o link.
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}

/** Baixa um blob como PNG — usado pelo fallback do carrossel. */
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
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

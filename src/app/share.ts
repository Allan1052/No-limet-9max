// Compartilhamento com fallback: tenta a Web Share API com IMAGEM (celular),
// depois só texto+link, e por fim copia o link para a área de transferência.

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

export async function shareSpot(
  blob: Blob | null,
  url: string,
  text: string,
  securityDisclaimer: string | null = null,
): Promise<ShareResult> {
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
  };

  // 1) Web Share com arquivo de imagem (melhor experiência no celular).
  if (blob) {
    const file = new File([blob], "call-ou-fold-desafio.png", { type: "image/png" });
    if (nav.canShare?.({ files: [file] }) && nav.share) {
      try {
        await nav.share({ files: [file], text: securityDisclaimer ? `${securityDisclaimer}\n\n${text}` : text, url });
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

  // 3) Fallback: copia o link.
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}

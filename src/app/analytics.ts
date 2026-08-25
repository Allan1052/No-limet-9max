// ---------------------------------------------------------------------------
// Analytics leve e privacy-first.
//
// O script de medição (ex.: Umami) é adicionado no <head> do index.html quando
// você tiver o ID do site. Aqui a gente só DISPARA eventos de forma segura: se
// o script ainda não estiver carregado, tudo vira no-op — não quebra nada e
// não vaza dado nenhum. Sem cookie, sem login, sem identificar ninguém.
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    umami?: { track?: (name: string, data?: Record<string, unknown>) => void };
  }
}

/** Dispara um evento de forma segura (no-op se a ferramenta não estiver ativa). */
export function trackEvent(name: string, data?: Record<string, unknown>): void {
  try {
    window.umami?.track?.(name, data);
  } catch {
    /* silêncio — analytics nunca pode derrubar o app */
  }
}

function isStandalone(): boolean {
  try {
    return (
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

/**
 * Liga os eventos-chave, uma vez no boot:
 *  - "install": quando o usuário instala o PWA (o "download"). O appinstalled é
 *    global, então registramos aqui — independente da tela em que ele está.
 *  - "pwa_open": quando o app abre já instalado (rodando standalone). Serve pra
 *    separar "abriu o app instalado" de "só visitou pelo navegador".
 */
export function initAnalytics(): void {
  if (typeof window === "undefined") return;
  const standalone = isStandalone();
  trackEvent("app_opened", { mode: standalone ? "standalone" : "browser" });
  window.addEventListener("appinstalled", () => trackEvent("install"));
  if (standalone) trackEvent("pwa_open");
}

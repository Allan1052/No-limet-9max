// ---------------------------------------------------------------------------
// Analytics leve e privacy-first.
//
// O script de medição (Umami) fica no <head> do index.html. Aqui a gente só
// DISPARA eventos de forma segura: se o script ainda não estiver carregado,
// tudo vira no-op. Sem cookie, sem login e sem identificar ninguém.
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    umami?: { track?: (name: string, data?: Record<string, unknown>) => void };
  }
}

let handActive = false;

function send(name: string, data?: Record<string, unknown>): void {
  window.umami?.track?.(name, data);
}

/**
 * Dispara um evento de forma segura e mantém compatibilidade com os nomes
 * antigos já usados pela UI. Os aliases abaixo formam um funil estável no
 * Umami sem exigir alterações no motor de poker.
 */
export function trackEvent(name: string, data?: Record<string, unknown>): void {
  try {
    // Preserva o evento original para não quebrar relatórios já existentes.
    send(name, data);

    if (name === "hero_action_submitted") {
      // A primeira decisão observada também prova que uma mão foi iniciada.
      if (!handActive) {
        send("hand_started");
        handActive = true;
      }
      send("decision_made", data);
      return;
    }

    if (name === "new_hand_started") {
      send("next_hand_started");
      send("hand_started");
      handActive = true;
      return;
    }

    if (name === "hand_completed") {
      handActive = false;
    }
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
 *  - "install": quando o usuário instala o PWA (o "download").
 *  - "pwa_open": quando o app abre já instalado (rodando standalone).
 */
export function initAnalytics(): void {
  if (typeof window === "undefined") return;
  const standalone = isStandalone();
  trackEvent("app_opened", { mode: standalone ? "standalone" : "browser" });
  window.addEventListener("appinstalled", () => trackEvent("install"));
  if (standalone) trackEvent("pwa_open");
}

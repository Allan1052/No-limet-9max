import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { I18nProvider } from "./i18n";
import { SettingsProvider } from "./app/settings";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { announceUpdate } from "./app/pwaUpdate";
import { initAnalytics } from "./app/analytics";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

// Analytics privacy-first: liga os eventos de instalação/abertura (no-op até o
// script de medição existir no index.html).
initAnalytics();

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <I18nProvider>
        <SettingsProvider>
          <App />
        </SettingsProvider>
      </I18nProvider>
    </ErrorBoundary>
  </StrictMode>,
);

// ---------------------------------------------------------------------------
// Service Worker — registro com auto-update robusto
// ---------------------------------------------------------------------------
// Problema que existia: o SW novo ficava em "waiting" e nunca ativava,
// porque o main.tsx antigo não enviava a mensagem SKIP_WAITING.
// Isso causava o app ficar preso na versão antiga até desinstalar/reinstalar.
//
// Solução: ao detectar um SW novo instalado, enviamos SKIP_WAITING
// imediatamente e notificamos a UI via pwaUpdate.ts.
// ---------------------------------------------------------------------------
if ("serviceWorker" in navigator) {
  const updateSW = async () => {
    try {
      // Detectar o base path dinamicamente a partir do script src
      const scriptSrc = document.querySelector('script[type="module"]')?.getAttribute('src') || '';
      const basePathMatch = scriptSrc.match(/^(\/[^/]+\/)assets\//);
      const basePath = basePathMatch ? basePathMatch[1] : '/';
      const swUrl = `${basePath}sw.js`;

      const registration = await navigator.serviceWorker.register(swUrl);

      // Forçar claims imediatos — garante que o SW controla a página já no primeiro load
      if (registration.waiting) {
        // SW novo já instalado mas esperando — enviar SKIP_WAITING
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed") {
            if (navigator.serviceWorker.controller) {
              // Há um SW antigo controlando — enviar SKIP_WAITING para ativar o novo
              newWorker.postMessage({ type: "SKIP_WAITING" });
              // Notificar a UI que há update (a UI decide quando recarregar — entre mãos)
              announceUpdate(() => {
                newWorker.postMessage({ type: "SKIP_WAITING" });
              });
            } else {
              // Primeira instalação (sem controller anterior) — ativar imediatamente
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          }
        });
      });

      // Se o SW controller mudou (nova versão ativada), recarregar suavemente
      // APENAS se a página já estava aberta há tempo (evita reload duplo no primeiro load)
      let initialLoad = true;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (initialLoad) {
          initialLoad = false;
          return; // não recarrega na primeira ativação (já carregou os assets novos)
        }
        // Recarregar apenas se a UI não está no meio de uma mão
        if (typeof (window as any).__HAND_OVER !== "undefined" && !(window as any).__HAND_OVER) {
          return; // não recarregar durante uma mão ativa
        }
        location.reload();
      });
    } catch (e) {
      console.warn("SW registration failed:", e);
    }
  };

  // Registra o SW apenas em HTTPS ou localhost
  if (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    updateSW();
  }
}

// Sinal global para a UI saber se está seguro recarregar (entre mãos)
declare global {
  interface Window {
    __HAND_OVER?: boolean;
  }
}

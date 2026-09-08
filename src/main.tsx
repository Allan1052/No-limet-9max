import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { I18nProvider } from "./i18n";
import { SettingsProvider } from "./app/settings";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { announceUpdate, forceNetworkUpdate } from "./app/pwaUpdate";
import { initAnalytics } from "./app/analytics";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

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

// Rodada 4: o botão de versão do Perfil passa por um caminho de rede garantido.
// Usamos captura para impedir que o handler antigo recarregue antes de o SW/cache
// serem efetivamente limpos. O texto muda na hora para o Allan ver que o toque pegou.
document.addEventListener("click", (event) => {
  const target = event.target as Element | null;
  const button = target?.closest?.(".profile-version-row button") as HTMLButtonElement | null;
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  button.disabled = true;
  button.textContent = "🔄 Verificando…";
  window.setTimeout(() => {
    button.textContent = "⬇️ Atualizando…";
    void forceNetworkUpdate();
  }, 120);
}, true);

if ("serviceWorker" in navigator) {
  const updateSW = async () => {
    try {
      const scriptSrc = document.querySelector('script[type="module"]')?.getAttribute('src') || '';
      const basePathMatch = scriptSrc.match(/^(\/[^/]+\/)assets\//);
      const basePath = basePathMatch ? basePathMatch[1] : '/';
      const swUrl = `${basePath}sw.js`;

      const registration = await navigator.serviceWorker.register(swUrl);

      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed") {
            if (navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: "SKIP_WAITING" });
              announceUpdate(() => {
                newWorker.postMessage({ type: "SKIP_WAITING" });
              });
            } else {
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          }
        });
      });

      let initialLoad = true;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (initialLoad) {
          initialLoad = false;
          return;
        }
        if (typeof (window as any).__HAND_OVER !== "undefined" && !(window as any).__HAND_OVER) {
          return;
        }
        location.reload();
      });
    } catch (e) {
      console.warn("SW registration failed:", e);
    }
  };

  if (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    updateSW();
  }
}

declare global {
  interface Window {
    __HAND_OVER?: boolean;
  }
}

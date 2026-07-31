import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { I18nProvider } from "./i18n";
import { SettingsProvider } from "./app/settings";
import { ErrorBoundary } from "./ui/ErrorBoundary";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

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

// Registro manual do Service Worker para PWA
if ("serviceWorker" in navigator) {
  const updateSW = async () => {
    try {
      // Detectar o base path dinamicamente a partir do script src
      const scriptSrc = document.querySelector('script[type="module"]')?.getAttribute('src') || '';
      const basePathMatch = scriptSrc.match(/^(\/[^/]+\/)assets\//);
      const basePath = basePathMatch ? basePathMatch[1] : '/';
      const registration = await navigator.serviceWorker.register(`${basePath}sw.js`);
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // Notifica que há atualização disponível
              const event = new CustomEvent("sw-update");
              window.dispatchEvent(event);
            }
          });
        }
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

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { announceUpdate } from "./app/pwaUpdate";
import { App } from "./app/App";
import { I18nProvider } from "./i18n";
import { SettingsProvider } from "./app/settings";
import { ErrorBoundary } from "./ui/ErrorBoundary";

// Registro do service worker (PWA). Em modo autoUpdate, quando um build novo é
// detectado o SW é aplicado e a página recarrega sozinha — assim o app instalado
// no celular não fica preso a uma versão antiga em cache. Além disso, checamos
// por atualização a cada 60s e ao voltar o foco para a aba/app.
const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    setInterval(() => registration.update().catch(() => {}), 60_000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") registration.update().catch(() => {});
    });
  },
  onNeedRefresh() {
    // Não recarrega no meio de uma mão: apenas avisa a interface, que mostra o
    // aviso/botão e recarrega num momento seguro (entre mãos) ou ao toque.
    announceUpdate(() => updateSW(true));
  },
});

createRoot(document.getElementById("root")!).render(
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

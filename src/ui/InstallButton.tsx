// Botão "Instalar app" guiado.
//
// No Android/Chrome, capturamos o evento `beforeinstallprompt` e disparamos o
// fluxo NATIVO de instalação — que gera um WebAPK assinado pelo Google (sem o
// aviso de "fonte não confiável" que aparece quando o usuário instala de outro
// jeito). No iPhone (Safari não suporta o evento), mostramos o passo a passo
// manual. Se o app já está instalado (rodando em standalone), o botão some.
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari expõe navigator.standalone quando aberto pela tela de início.
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    const onBIP = (e: Event) => {
      e.preventDefault(); // guardamos para disparar no clique do usuário
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  // No Android só mostramos quando o navegador confirmou que dá para instalar;
  // no iOS mostramos sempre (instalação é manual via Compartilhar).
  if (!deferred && !isIos) return null;

  const onClick = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice.catch(() => undefined);
      setDeferred(null);
    } else if (isIos) {
      setShowIosHelp(true);
    }
  };

  return (
    <>
      <button className="install-btn" onClick={onClick} title="Instalar como aplicativo">
        ⬇ Instalar app
      </button>

      {showIosHelp ? (
        <div className="overlay" onClick={() => setShowIosHelp(false)}>
          <div className="replay ios-help" onClick={(e) => e.stopPropagation()}>
            <h3>Instalar no iPhone</h3>
            <ol className="ios-steps">
              <li>
                Toque no botão <b>Compartilhar</b> (o quadradinho com uma seta para cima),
                na barra do Safari.
              </li>
              <li>
                Role e toque em <b>“Adicionar à Tela de Início”</b>.
              </li>
              <li>
                Confirme em <b>Adicionar</b>. O ícone do Poker Sim aparece como um app normal.
              </li>
            </ol>
            <p className="ios-note">
              No iPhone não existe aviso de “fonte não confiável” — ele instala direto pela
              Tela de Início.
            </p>
            <button className="btn primary" onClick={() => setShowIosHelp(false)}>
              Entendi
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

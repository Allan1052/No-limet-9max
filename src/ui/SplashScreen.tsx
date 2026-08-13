// Splash Screen Premium — A primeira impressão do Call ou Fold
// Logo CF com animação de carregamento dourada e mensagem inspiradora
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";

// Get the base URL from the manifest or default to '/'
function getBasePath(): string {
  const base = document.querySelector('script[type="module"]')?.getAttribute('src') || '';
  // Detect if we're at root (script src = "/assets/...")
  if (base.startsWith('/assets/')) return '/';
  // Old format: /ProjectName/assets/...
  const match = base.match(/^(\/[^/]+\/)/);
  return match ? match[1] : '/';
}

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFade(true);
      setTimeout(onComplete, 300);
    }, 200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={`splash-screen ${fade ? "fade-out" : ""}`}>
      <div className="splash-content">
        <div className="splash-logo-container">
          <img src={`${getBasePath()}brand-logo-splash.png`} alt="Call ou Fold" className="splash-logo-img" />
        </div>

        <div className="splash-tagline">
          <p className="splash-main">Call ou Fold</p>
          <p className="splash-sub">aqui é possível</p>
        </div>

        <div className="splash-loader">
          <div className="loader-bar" />
        </div>
      </div>
    </div>
  );
}

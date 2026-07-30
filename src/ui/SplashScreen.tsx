// Splash Screen Premium — A primeira impressão do Call ou Fold
// Logo CF com animação de carregamento dourada e mensagem inspiradora
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFade(true);
      setTimeout(onComplete, 600);
    }, 2400);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={`splash-screen ${fade ? "fade-out" : ""}`}>
      <div className="splash-content">
        <div className="splash-logo-container">
          <svg
            className="splash-logo"
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
            width="120"
            height="120"
          >
            <defs>
              <linearGradient id="cfGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f7e79b" />
                <stop offset="45%" stopColor="#e6c454" />
                <stop offset="100%" stopColor="#b8912e" />
              </linearGradient>
              <filter id="cfGlow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Círculo externo */}
            <circle
              cx="100"
              cy="100"
              r="95"
              fill="none"
              stroke="url(#cfGradient)"
              strokeWidth="2"
              opacity="0.6"
              className="splash-ring"
            />

            {/* Letra C */}
            <text
              x="60"
              y="130"
              fontSize="90"
              fontFamily="Playfair Display, serif"
              fontWeight="700"
              fill="url(#cfGradient)"
              filter="url(#cfGlow)"
              className="splash-letter"
            >
              C
            </text>

            {/* Letra F */}
            <text
              x="110"
              y="130"
              fontSize="90"
              fontFamily="Playfair Display, serif"
              fontWeight="700"
              fill="url(#cfGradient)"
              filter="url(#cfGlow)"
              className="splash-letter"
            >
              F
            </text>
          </svg>
        </div>

        <div className="splash-tagline">
          <p className="splash-main">Aqui é Possível</p>
          <p className="splash-sub">O Poker para Quem Quer Evoluir</p>
        </div>

        <div className="splash-loader">
          <div className="loader-bar" />
        </div>
      </div>
    </div>
  );
}

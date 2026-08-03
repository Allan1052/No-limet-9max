// ---------------------------------------------------------------------------
// AvatarSelector — o jogador escolhe sua silhueta para a arena de duelo.
// Avatares sombreados (sem rosto) consistentes com a marca.
// Persistido em localStorage.
// ---------------------------------------------------------------------------
import { useState } from "react";
import { useT } from "../i18n";
import type { TransKey } from "../i18n/translations";

// ---------------------------------------------------------------------------
// Tipos de avatar — cada um é uma silhueta diferente (sem rosto)
// ---------------------------------------------------------------------------
export interface AvatarType {
  id: string;
  nameKey: string; // key de tradução
  icon: string; // emoji representativo
  color: string; // cor de destaque
  descriptionKey: string;
}

export const HERO_AVATARS: AvatarType[] = [
  {
    id: "strategist",
    nameKey: "avatar.strategist.name",
    icon: "♟️",
    color: "#d4af37",
    descriptionKey: "avatar.strategist.desc",
  },
  {
    id: "aggressor",
    nameKey: "avatar.aggressor.name",
    icon: "⚔️",
    color: "#e0645f",
    descriptionKey: "avatar.aggressor.desc",
  },
  {
    id: "patient",
    nameKey: "avatar.patient.name",
    icon: "🎯",
    color: "#5cbe8d",
    descriptionKey: "avatar.patient.desc",
  },
  {
    id: "dreamer",
    nameKey: "avatar.dreamer.name",
    icon: "🌟",
    color: "#7cc0ff",
    descriptionKey: "avatar.dreamer.desc",
  },
  {
    id: "ghost",
    nameKey: "avatar.ghost.name",
    icon: "👻",
    color: "#a78bfa",
    descriptionKey: "avatar.ghost.desc",
  },
  {
    id: "warrior",
    nameKey: "avatar.warrior.name",
    icon: "🛡️",
    color: "#f59e0b",
    descriptionKey: "avatar.warrior.desc",
  },
];

const STORAGE_KEY = "cof-hero-avatar";

export function getHeroAvatar(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || "strategist";
  } catch {
    return "strategist";
  }
}

export function setHeroAvatar(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignora
  }
}

// Silhueta SVG do jogador (sem rosto)
function HeroSilhouette({ size = 48, color = "#d4af37" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden focusable="false">
      <defs>
        <linearGradient id={`heroGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.9" />
          <stop offset="1" stopColor="#0b0d11" stopOpacity="1" />
        </linearGradient>
      </defs>
      {/* Corpo/silhueta */}
      <path
        d="M50 8C32 8 22 22 22 48c0 26 12 48 28 48s28-22 28-48C78 22 68 8 50 8Z"
        fill={`url(#heroGrad-${color.replace('#', '')})`}
        stroke={color}
        strokeWidth="1.5"
        strokeOpacity="0.6"
      />
      {/* Sombra do rosto (encapuzado) */}
      <ellipse cx="50" cy="52" rx="20" ry="26" fill="#1a1d22" />
      <path d="M30 48C30 30 38 20 50 20s20 10 20 28Z" fill="#0c0e12" opacity="0.95" />
      {/* Olhos sombreados */}
      <g fill="#0a0b0d" opacity="0.8">
        <rect x="34" y="46" width="14" height="10" rx="4" />
        <rect x="52" y="46" width="14" height="10" rx="4" />
        <rect x="45" y="49" width="10" height="3" rx="1.5" />
      </g>
      {/* Brilho nos olhos */}
      <rect x="37" y="48" width="5" height="2.5" rx="1.2" fill={color} opacity="0.4" />
      <rect x="58" y="48" width="5" height="2.5" rx="1.2" fill={color} opacity="0.4" />
    </svg>
  );
}

export { HeroSilhouette };

// ---------------------------------------------------------------------------
// Modal de seleção de avatar
// ---------------------------------------------------------------------------
export function AvatarSelector({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const [selected, setSelected] = useState(getHeroAvatar());

  const handleConfirm = () => {
    setHeroAvatar(selected);
    onClose();
  };

  return (
    <div className="avatar-overlay" onClick={onClose}>
      <div className="avatar-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="avatar-title">♠ {t("avatar.title")}</h3>
        <p className="avatar-subtitle">{t("avatar.subtitle")}</p>

        <div className="avatar-grid">
          {HERO_AVATARS.map((avatar) => {
            const isSelected = selected === avatar.id;
            return (
              <button
                key={avatar.id}
                className={`avatar-card ${isSelected ? "selected" : ""}`}
                onClick={() => setSelected(avatar.id)}
              >
                <HeroSilhouette size={44} color={avatar.color} />
                <span className="avatar-label">{t(avatar.nameKey as TransKey)}</span>
                <span className="avatar-icon">{avatar.icon}</span>
              </button>
            );
          })}
        </div>

        <div className="avatar-actions">
          <button className="btn avatar-cancel" onClick={onClose}>
            {t("avatar.cancel")}
          </button>
          <button className="btn primary avatar-confirm" onClick={handleConfirm}>
            {t("avatar.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

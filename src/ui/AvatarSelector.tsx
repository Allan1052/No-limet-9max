// ---------------------------------------------------------------------------
// AvatarSelector — o jogador escolhe sua máscara para a arena de duelo.
// Avatares fotorrealistas com iluminação cinematográfica.
// Persistido em localStorage com sistema de cooldown (1 troca/semana grátis).
// Tela de onboarding na primeira abertura do app.
// Frase de imersão personalizada após escolher.
// ---------------------------------------------------------------------------
import { useState, useCallback } from "react";
import { useT } from "../i18n";
import type { TransKey } from "../i18n/translations";

// ---------------------------------------------------------------------------
// Tipos de avatar — rostos fotorrealistas
// ---------------------------------------------------------------------------
export interface AvatarType {
  id: string;
  nameKey: string;
  color: string;
  descriptionKey: string;
  image: string;
  immersionKey: string; // frase de imersão ao escolher
}

export const HERO_AVATARS: AvatarType[] = [
  {
    id: "casual",
    nameKey: "avatar.casual.name",
    color: "#d4af37",
    descriptionKey: "avatar.casual.desc",
    image: "avatars/01-casual.png",
    immersionKey: "avatar.casual.immersion",
  },
  {
    id: "paga-tudo",
    nameKey: "avatar.pagatudo.name",
    color: "#e0645f",
    descriptionKey: "avatar.pagatudo.desc",
    image: "avatars/02-paga-tudo.png",
    immersionKey: "avatar.pagatudo.immersion",
  },
  {
    id: "muralha",
    nameKey: "avatar.muralha.name",
    color: "#8b8d8f",
    descriptionKey: "avatar.muralha.desc",
    image: "avatars/03-muralha.png",
    immersionKey: "avatar.muralha.immersion",
  },
  {
    id: "certinho",
    nameKey: "avatar.certinho.name",
    color: "#5cbe8d",
    descriptionKey: "avatar.certinho.desc",
    image: "avatars/04-certinho.png",
    immersionKey: "avatar.certinho.immersion",
  },
  {
    id: "cartilha",
    nameKey: "avatar.cartilha.name",
    color: "#7cc0ff",
    descriptionKey: "avatar.cartilha.desc",
    image: "avatars/05-cartilha.png",
    immersionKey: "avatar.cartilha.immersion",
  },
  {
    id: "furacao",
    nameKey: "avatar.furacao.name",
    color: "#ff4444",
    descriptionKey: "avatar.furacao.desc",
    image: "avatars/06-furacao.png",
    immersionKey: "avatar.furacao.immersion",
  },
  {
    id: "tudo-ou-nada",
    nameKey: "avatar.tudoounada.name",
    color: "#f59e0b",
    descriptionKey: "avatar.tudoounada.desc",
    image: "avatars/07-tudo-ou-nada.png",
    immersionKey: "avatar.tudoounada.immersion",
  },
  {
    id: "doidao",
    nameKey: "avatar.doidao.name",
    color: "#a78bfa",
    descriptionKey: "avatar.doidao.desc",
    image: "avatars/08-doidao.png",
    immersionKey: "avatar.doidao.immersion",
  },
  {
    id: "ceifador",
    nameKey: "avatar.ceifador.name",
    color: "#1a1a1a",
    descriptionKey: "avatar.ceifador.desc",
    image: "avatars/09-ceifador.png",
    immersionKey: "avatar.ceifador.immersion",
  },
  {
    id: "iniciante",
    nameKey: "avatar.iniciante.name",
    color: "#ff6b9d",
    descriptionKey: "avatar.iniciante.desc",
    image: "avatars/10-iniciante.png",
    immersionKey: "avatar.iniciante.immersion",
  },
  {
    id: "veterano",
    nameKey: "avatar.veterano.name",
    color: "#c9a96e",
    descriptionKey: "avatar.veterano.desc",
    image: "avatars/11-veterano.png",
    immersionKey: "avatar.veterano.immersion",
  },
  {
    id: "blefadora",
    nameKey: "avatar.blefadora.name",
    color: "#e8b4d9",
    descriptionKey: "avatar.blefadora.desc",
    image: "avatars/12-blefadora.png",
    immersionKey: "avatar.blefadora.immersion",
  },
  {
    id: "estrategista",
    nameKey: "avatar.estrategista.name",
    color: "#d4af37",
    descriptionKey: "avatar.estrategista.desc",
    image: "avatars/13-estrategista.png",
    immersionKey: "avatar.estrategista.immersion",
  },
  {
    id: "rainha",
    nameKey: "avatar.rainha.name",
    color: "#c084fc",
    descriptionKey: "avatar.rainha.desc",
    image: "avatars/14-rainha.png",
    immersionKey: "avatar.rainha.immersion",
  },
  {
    id: "silencioso",
    nameKey: "avatar.silencioso.name",
    color: "#78716c",
    descriptionKey: "avatar.silencioso.desc",
    image: "avatars/15-silencioso.png",
    immersionKey: "avatar.silencioso.immersion",
  },
  {
    id: "acelerador",
    nameKey: "avatar.acelerador.name",
    color: "#ef4444",
    descriptionKey: "avatar.acelerador.desc",
    image: "avatars/16-acelerador.png",
    immersionKey: "avatar.acelerador.immersion",
  },
  {
    id: "matematica",
    nameKey: "avatar.matematica.name",
    color: "#38bdf8",
    descriptionKey: "avatar.matematica.desc",
    image: "avatars/17-matematica.png",
    immersionKey: "avatar.matematica.immersion",
  },
  {
    id: "lendario",
    nameKey: "avatar.lendario.name",
    color: "#a16207",
    descriptionKey: "avatar.lendario.desc",
    image: "avatars/18-lendario.png",
    immersionKey: "avatar.lendario.immersion",
  },
];

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------
const STORAGE_KEY = "cof-hero-avatar";
const FIRST_OPEN_KEY = "cof-first-open"; // marca se já escolheu na primeira vez
const LAST_SWAP_KEY = "cof-last-avatar-swap"; // timestamp da última troca

const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 1 semana

// ---------------------------------------------------------------------------
// Funções de acesso
// ---------------------------------------------------------------------------
export function getHeroAvatar(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || "casual";
  } catch {
    return "casual";
  }
}

export function setHeroAvatar(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch { /* ignora */ }
}

export function getHeroAvatarData(): AvatarType {
  const id = getHeroAvatar();
  return HERO_AVATARS.find((a) => a.id === id) || HERO_AVATARS[0];
}

export function isFirstOpen(): boolean {
  try {
    return !localStorage.getItem(FIRST_OPEN_KEY);
  } catch {
    return true;
  }
}

export function markFirstOpen(): void {
  try {
    localStorage.setItem(FIRST_OPEN_KEY, Date.now().toString());
  } catch { /* ignora */ }
}

export function getLastSwapTimestamp(): number {
  try {
    return parseInt(localStorage.getItem(LAST_SWAP_KEY) || "0", 10);
  } catch {
    return 0;
  }
}

export function setLastSwapTimestamp(): void {
  try {
    localStorage.setItem(LAST_SWAP_KEY, Date.now().toString());
  } catch { /* ignora */ }
}

export function canSwapAvatar(): { allowed: boolean; remainingMs: number } {
  const lastSwap = getLastSwapTimestamp();
  const now = Date.now();
  const remaining = Math.max(0, COOLDOWN_MS - (now - lastSwap));
  return { allowed: remaining === 0, remainingMs: remaining };
}

export function formatCooldown(remainingMs: number): string {
  const totalSec = Math.ceil(remainingMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// ---------------------------------------------------------------------------
// Tela de ONBOARDING — primeira vez que abre o app
// ---------------------------------------------------------------------------
export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const [selected, setSelected] = useState<string | null>(null);
  const [showImmersion, setShowImmersion] = useState(false);
  const [selectedAvatarData, setSelectedAvatarData] = useState<AvatarType | null>(null);

  const handleConfirm = useCallback(() => {
    if (!selected) return;
    const avatar = HERO_AVATARS.find((a) => a.id === selected);
    if (!avatar) return;
    setHeroAvatar(selected);
    markFirstOpen();
    setLastSwapTimestamp();
    setSelectedAvatarData(avatar);
    setShowImmersion(true);
  }, [selected]);

  // Tela de imersão após escolher
  if (showImmersion && selectedAvatarData) {
    return (
      <div className="onboarding-overlay" onClick={onDone}>
        <div className="immersion-card" onClick={(e) => e.stopPropagation()}>
          <div
            className="immersion-avatar"
            style={{
              borderColor: selectedAvatarData.color,
              boxShadow: `0 0 24px ${selectedAvatarData.color}55, 0 0 60px ${selectedAvatarData.color}22`,
            }}
          >
            <img src={selectedAvatarData.image} alt="" className="immersion-avatar-img" />
          </div>
          <div className="immersion-name" style={{ color: selectedAvatarData.color }}>
            {t(selectedAvatarData.nameKey as TransKey)}
          </div>
          <div className="immersion-quote">
            "{t(selectedAvatarData.immersionKey as TransKey)}"
          </div>
          <button className="btn primary immersion-enter" onClick={onDone}>
            {t("onboarding.enter")}
          </button>
        </div>
      </div>
    );
  }

  // Tela de seleção de máscara
  return (
    <div className="onboarding-overlay">
      <div className="onboarding-content" onClick={(e) => e.stopPropagation()}>
        <div className="onboarding-brand">
          <div className="onboarding-spade">♠</div>
          <h1 className="onboarding-title">{t("onboarding.title")}</h1>
        </div>
        <p className="onboarding-subtitle">{t("onboarding.subtitle")}</p>
        <p className="onboarding-mask-phrase">"{t("avatar.maskPhrase")}"</p>

        <div className="onboarding-grid">
          {HERO_AVATARS.map((avatar) => {
            const isSelected = selected === avatar.id;
            return (
              <button
                key={avatar.id}
                className={`onboarding-card ${isSelected ? "selected" : ""}`}
                style={
                  isSelected
                    ? {
                        borderColor: avatar.color,
                        boxShadow: `0 0 16px ${avatar.color}55`,
                      }
                    : {}
                }
                onClick={() => setSelected(avatar.id)}
              >
                <img src={avatar.image} alt="" className="onboarding-card-img" loading="lazy" />
                <div className="onboarding-card-label" style={{ color: isSelected ? avatar.color : undefined }}>
                  {t(avatar.nameKey as TransKey)}
                </div>
              </button>
            );
          })}
        </div>

        <button
          className="btn primary onboarding-confirm"
          disabled={!selected}
          onClick={handleConfirm}
        >
          {selected ? t("onboarding.confirm") : t("onboarding.select")}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal de seleção de avatar (reutilizável na aba Missão)
// ---------------------------------------------------------------------------
export function AvatarSelector({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const [selected, setSelected] = useState(getHeroAvatar());
  const [showImmersion, setShowImmersion] = useState(false);
  const [selectedAvatarData, setSelectedAvatarData] = useState<AvatarType | null>(null);
  const cooldown = canSwapAvatar();

  const handleConfirm = () => {
    setHeroAvatar(selected);
    setLastSwapTimestamp();
    const avatar = HERO_AVATARS.find((a) => a.id === selected);
    if (avatar) {
      setSelectedAvatarData(avatar);
      setShowImmersion(true);
    } else {
      onClose();
    }
  };

  // Imersão após trocar
  if (showImmersion && selectedAvatarData) {
    return (
      <div className="onboarding-overlay" onClick={onClose}>
        <div className="immersion-card" onClick={(e) => e.stopPropagation()}>
          <div
            className="immersion-avatar"
            style={{
              borderColor: selectedAvatarData.color,
              boxShadow: `0 0 24px ${selectedAvatarData.color}55, 0 0 60px ${selectedAvatarData.color}22`,
            }}
          >
            <img src={selectedAvatarData.image} alt="" className="immersion-avatar-img" />
          </div>
          <div className="immersion-name" style={{ color: selectedAvatarData.color }}>
            {t(selectedAvatarData.nameKey as TransKey)}
          </div>
          <div className="immersion-quote">
            "{t(selectedAvatarData.immersionKey as TransKey)}"
          </div>
          <button className="btn primary immersion-enter" onClick={onClose}>
            {t("onboarding.continue")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="avatar-overlay" onClick={onClose}>
      <div className="avatar-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="avatar-title">♠ {t("avatar.title")}</h3>
        <p className="avatar-subtitle">{t("avatar.subtitle")}</p>
        <p className="avatar-mask-phrase">"{t("avatar.maskPhrase")}"</p>

        {/* Cooldown indicator */}
        {!cooldown.allowed && cooldown.remainingMs > 0 && (
          <div className="avatar-cooldown">
            <span className="cooldown-icon">⏳</span>
            {t("avatar.cooldown", { time: formatCooldown(cooldown.remainingMs) })}
          </div>
        )}

        <div className="avatar-grid-real">
          {HERO_AVATARS.map((avatar) => {
            const isSelected = selected === avatar.id;
            return (
              <button
                key={avatar.id}
                className={`avatar-card-real ${isSelected ? "selected" : ""}`}
                style={
                  isSelected
                    ? {
                        borderColor: avatar.color,
                        boxShadow: `0 0 16px ${avatar.color}55`,
                      }
                    : {}
                }
                onClick={() => setSelected(avatar.id)}
              >
                <img src={avatar.image} alt="" className="avatar-real-img" loading="lazy" />
                <div className="avatar-real-label" style={{ color: isSelected ? avatar.color : undefined }}>
                  {t(avatar.nameKey as TransKey)}
                </div>
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

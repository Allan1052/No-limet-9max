// ---------------------------------------------------------------------------
// AvatarSelector — o jogador escolhe seu rosto para a arena de duelo.
// Avatares fotorrealistas com iluminação cinematográfica.
// Persistido em localStorage.
// ---------------------------------------------------------------------------
import { useState } from "react";
import { useT } from "../i18n";
import type { TransKey } from "../i18n/translations";

// ---------------------------------------------------------------------------
// Tipos de avatar — rostos fotorrealistas
// ---------------------------------------------------------------------------
export interface AvatarType {
  id: string;
  nameKey: string; // key de tradução
  color: string; // cor de destaque (borda)
  descriptionKey: string;
  image: string; // caminho da imagem
}

export const HERO_AVATARS: AvatarType[] = [
  {
    id: "casual",
    nameKey: "avatar.casual.name",
    color: "#d4af37",
    descriptionKey: "avatar.casual.desc",
    image: "avatars/01-casual.png",
  },
  {
    id: "paga-tudo",
    nameKey: "avatar.pagatudo.name",
    color: "#e0645f",
    descriptionKey: "avatar.pagatudo.desc",
    image: "avatars/02-paga-tudo.png",
  },
  {
    id: "muralha",
    nameKey: "avatar.muralha.name",
    color: "#8b8d8f",
    descriptionKey: "avatar.muralha.desc",
    image: "avatars/03-muralha.png",
  },
  {
    id: "certinho",
    nameKey: "avatar.certinho.name",
    color: "#5cbe8d",
    descriptionKey: "avatar.certinho.desc",
    image: "avatars/04-certinho.png",
  },
  {
    id: "cartilha",
    nameKey: "avatar.cartilha.name",
    color: "#7cc0ff",
    descriptionKey: "avatar.cartilha.desc",
    image: "avatars/05-cartilha.png",
  },
  {
    id: "furacao",
    nameKey: "avatar.furacao.name",
    color: "#ff4444",
    descriptionKey: "avatar.furacao.desc",
    image: "avatars/06-furacao.png",
  },
  {
    id: "tudo-ou-nada",
    nameKey: "avatar.tudoounada.name",
    color: "#f59e0b",
    descriptionKey: "avatar.tudoounada.desc",
    image: "avatars/07-tudo-ou-nada.png",
  },
  {
    id: "doidao",
    nameKey: "avatar.doidao.name",
    color: "#a78bfa",
    descriptionKey: "avatar.doidao.desc",
    image: "avatars/08-doidao.png",
  },
  {
    id: "ceifador",
    nameKey: "avatar.ceifador.name",
    color: "#1a1a1a",
    descriptionKey: "avatar.ceifador.desc",
    image: "avatars/09-ceifador.png",
  },
  {
    id: "iniciante",
    nameKey: "avatar.iniciante.name",
    color: "#ff6b9d",
    descriptionKey: "avatar.iniciante.desc",
    image: "avatars/10-iniciante.png",
  },
  {
    id: "veterano",
    nameKey: "avatar.veterano.name",
    color: "#c9a96e",
    descriptionKey: "avatar.veterano.desc",
    image: "avatars/11-veterano.png",
  },
  {
    id: "blefadora",
    nameKey: "avatar.blefadora.name",
    color: "#e8b4d9",
    descriptionKey: "avatar.blefadora.desc",
    image: "avatars/12-blefadora.png",
  },
];

const STORAGE_KEY = "cof-hero-avatar";

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
  } catch {
    // ignora
  }
}

export function getHeroAvatarData(): AvatarType {
  const id = getHeroAvatar();
  return HERO_AVATARS.find((a) => a.id === id) || HERO_AVATARS[0];
}

// ---------------------------------------------------------------------------
// Modal de seleção de avatar — rostos reais com borda colorida
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
        <p className="avatar-mask-phrase">"{t("avatar.maskPhrase")}"</p>

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
                <img
                  src={avatar.image}
                  alt=""
                  className="avatar-real-img"
                  loading="lazy"
                />
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

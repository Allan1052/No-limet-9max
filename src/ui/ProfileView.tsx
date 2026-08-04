// ---------------------------------------------------------------------------
// Perfil — a "casa" do jogador e dos ajustes. Tira os controles do topo lotado
// (idioma, Simples/Técnico, variante, versão, instalar) e junta com o avatar e
// a evolução num lugar só. Deixa o topo do app só com a logo.
// ---------------------------------------------------------------------------
import { useState } from "react";
import { useT } from "../i18n";
import type { TransKey } from "../i18n/translations";
import { ModeToggle } from "./ModeToggle";
import { LangSelect } from "./LangSelect";
import { InstallButton } from "./InstallButton";
import { AvatarSelector, getHeroAvatarData } from "./AvatarSelector";

export function ProfileView({
  gameVariant,
  setGameVariant,
  omahaUnlocked,
  setOmahaUnlocked,
  onOpenProgress,
  buildLabel,
  onCheckUpdate,
}: {
  gameVariant: "holdem" | "omaha";
  setGameVariant: (v: "holdem" | "omaha") => void;
  omahaUnlocked: boolean;
  setOmahaUnlocked: (v: boolean) => void;
  onOpenProgress: () => void;
  buildLabel: string;
  onCheckUpdate: () => void;
}) {
  const { t } = useT();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatar = getHeroAvatarData();

  return (
    <div className="train-view">
      <div className="panel profile-panel">
        {/* Avatar do jogador */}
        <div className="profile-hero">
          <div
            className="profile-avatar-wrap"
            style={{ borderColor: avatar.color, background: `${avatar.color}22` }}
          >
            <img
              src={avatar.image}
              alt=""
              className="profile-avatar-img"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <div className="profile-hero-info">
            <div className="profile-hero-name">{t(avatar.nameKey as TransKey)}</div>
            <button className="btn tiny" onClick={() => setAvatarOpen(true)}>
              {t("profile.changeAvatar")}
            </button>
          </div>
        </div>

        {/* Evolução */}
        <button className="btn profile-evolution" onClick={onOpenProgress}>
          📊 {t("profile.evolution")}
        </button>

        {/* Ajustes */}
        <div className="profile-section-title">{t("profile.settings")}</div>

        <div className="profile-setting">
          <span className="ps-label">{t("profile.mode")}</span>
          <ModeToggle />
        </div>

        <div className="profile-setting">
          <span className="ps-label">{t("profile.language")}</span>
          <LangSelect />
        </div>

        <div className="profile-setting">
          <span className="ps-label">{t("profile.variant")}</span>
          <div className="variant-toggle">
            <button
              className={`variant-btn ${gameVariant === "holdem" ? "active" : ""}`}
              onClick={() => setGameVariant("holdem")}
            >
              Texas
            </button>
            <button
              className={`variant-btn ${gameVariant === "omaha" && omahaUnlocked ? "active" : ""}`}
              onClick={() => {
                if (omahaUnlocked) {
                  setGameVariant("omaha");
                } else {
                  const code = prompt("🔒");
                  if (code === "omaha2026") {
                    localStorage.setItem("omaha_dev_unlock", "true");
                    setOmahaUnlocked(true);
                    setGameVariant("omaha");
                  } else {
                    alert(t("profile.omahaSoon"));
                  }
                }
              }}
              style={omahaUnlocked ? {} : { opacity: 0.5 }}
            >
              {omahaUnlocked ? "Omaha" : "Omaha 🔒"}
            </button>
          </div>
        </div>

        <div className="profile-setting">
          <span className="ps-label">{t("profile.install")}</span>
          <InstallButton />
        </div>

        <div className="profile-setting">
          <span className="ps-label">{t("profile.version")}</span>
          <button className="btn tiny" onClick={onCheckUpdate}>
            🔄 {buildLabel}
          </button>
        </div>

        <div className="profile-seal">🔒 {t("disclaimer")}</div>
      </div>

      {avatarOpen ? <AvatarSelector onClose={() => setAvatarOpen(false)} /> : null}
    </div>
  );
}

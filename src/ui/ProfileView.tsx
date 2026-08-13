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
import { SupportPix } from "./SupportPix";
import { loadAuraTotal, auraTier } from "../train/aura";
import { getStreak } from "../train/streak";

export function ProfileView({
  gameVariant,
  setGameVariant,
  omahaUnlocked,
  setOmahaUnlocked,
  sng3Unlocked,
  setSng3Unlocked,
  cashUnlocked,
  setCashUnlocked,
  onOpenProgress,
  buildLabel,
  onCheckUpdate,
}: {
  gameVariant: "holdem" | "omaha" | "sng3" | "cash";
  setGameVariant: (v: "holdem" | "omaha" | "sng3" | "cash") => void;
  omahaUnlocked: boolean;
  setOmahaUnlocked: (v: boolean) => void;
  sng3Unlocked: boolean;
  setSng3Unlocked: (v: boolean) => void;
  cashUnlocked: boolean;
  setCashUnlocked: (v: boolean) => void;
  onOpenProgress: () => void;
  buildLabel: string;
  onCheckUpdate: () => void;
}) {
  const { t } = useT();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const avatar = getHeroAvatarData();
  const auraTotal = loadAuraTotal();
  const tier = auraTier(auraTotal);
  const streak = getStreak();

  // "Ajude a manter grátis" — engajamento sutil (compartilhar mantém o app de pé).
  const INSTAGRAM_URL = "https://instagram.com/calloufold.sonho";
  const appUrl =
    typeof window !== "undefined" ? window.location.origin : "https://calloufold.com.br";
  const shareApp = () => {
    const text = t("profile.shareText");
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "Call ou Fold", text, url: appUrl }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${appUrl}`)}`, "_blank");
    }
  };
  const inviteFriend = () => {
    const text = t("profile.inviteText");
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${appUrl}`)}`, "_blank");
  };

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
            <div className="profile-aura-badge">
              ✨ <b>{auraTotal}</b> {t("aura.word").toLowerCase()} · {tier.emoji} {t(tier.key as TransKey)}
              {streak.current > 0 ? (
                <>
                  {" · "}🔥 <b>{streak.current}</b> {t("streak.days")}
                </>
              ) : null}
            </div>
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
            <button
              className={`variant-btn ${gameVariant === "sng3" && sng3Unlocked ? "active" : ""}`}
              onClick={() => {
                if (sng3Unlocked) {
                  setGameVariant("sng3");
                } else {
                  const code = prompt("🔒 SNG 3-max");
                  if (code === "sng32026") {
                    localStorage.setItem("sng3_dev_unlock", "true");
                    setSng3Unlocked(true);
                    setGameVariant("sng3");
                  } else {
                    alert("Sit & Go 3-max em desenvolvimento. Disponível em breve!");
                  }
                }
              }}
              style={sng3Unlocked ? {} : { opacity: 0.5 }}
            >
              {sng3Unlocked ? "SNG 3-max" : "SNG 3-max 🔒"}
            </button>
            <button
              className={`variant-btn ${gameVariant === "cash" && cashUnlocked ? "active" : ""}`}
              onClick={() => {
                if (cashUnlocked) {
                  setGameVariant("cash");
                } else {
                  const code = prompt("🔒 Cash Game");
                  if (code === "cash2026") {
                    localStorage.setItem("cash_dev_unlock", "true");
                    setCashUnlocked(true);
                    setGameVariant("cash");
                  } else {
                    alert("Cash Game em desenvolvimento. Disponível em breve!");
                  }
                }
              }}
              style={cashUnlocked ? {} : { opacity: 0.5 }}
            >
              {cashUnlocked ? "Cash" : "Cash 🔒"}
            </button>
          </div>
        </div>

        <div className="profile-setting profile-install-row">
          <span className="ps-label">{t("profile.install")}</span>
          <InstallButton />
        </div>

        <div className="profile-setting">
          <span className="ps-label">{t("profile.version")}</span>
          <button className="btn tiny" onClick={onCheckUpdate}>
            🔄 {buildLabel}
          </button>
        </div>

        <div className="profile-help">
          <div className="profile-help-title">🤝 {t("profile.helpTitle")}</div>
          <div className="profile-help-note">{t("profile.helpNote")}</div>
          <div className="profile-help-row">
            <button className="btn" onClick={() => window.open(INSTAGRAM_URL, "_blank")}>
              📸 {t("profile.follow")}
            </button>
            <button className="btn" onClick={shareApp}>
              📣 {t("profile.share")}
            </button>
            <button className="btn" onClick={inviteFriend}>
              💬 {t("profile.invite")}
            </button>
          </div>
          <button className="btn profile-support-btn" onClick={() => setSupportOpen(true)}>
            💚 {t("support.button")}
          </button>
        </div>

        <div className="profile-seal">🔒 {t("disclaimer")}</div>
      </div>

      {avatarOpen ? <AvatarSelector onClose={() => setAvatarOpen(false)} /> : null}
      {supportOpen ? <SupportPix onClose={() => setSupportOpen(false)} /> : null}
    </div>
  );
}

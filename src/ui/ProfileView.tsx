// ---------------------------------------------------------------------------
// Perfil — a "casa" do jogador e dos ajustes. Tira os controles do topo lotado
// (idioma, Simples/Técnico, variante, versão, instalar) e junta com o avatar e
// a evolução num lugar só. Deixa o topo do app só com a logo.
// ---------------------------------------------------------------------------
import { useState } from "react";
import { useT } from "../i18n";
import type { TransKey } from "../i18n/translations";
import { ModeToggle } from "../ui/ModeToggle";
import { isDevUnlocked, setDevLock } from "../lib/devLock";
import { LangSelect } from "./LangSelect";
import { InstallButton } from "./InstallButton";
import { AvatarSelector, getHeroAvatarData } from "./AvatarSelector";
import { SupportPix } from "./SupportPix";
import { TopPrizesPanel } from "./TopPrizesPanel";

export function ProfileView({
  gameVariant,
  setGameVariant,
  omahaUnlocked,
  setOmahaUnlocked,
  onOpenProgress,
  onOpenAchievements,
  onOpenHistory,
  buildLabel,
  onCheckUpdate,
}: {
  gameVariant: "holdem" | "omaha";
  setGameVariant: (v: "holdem" | "omaha") => void;
  omahaUnlocked: boolean;
  setOmahaUnlocked: (v: boolean) => void;
  onOpenProgress: () => void;
  onOpenAchievements: () => void;
  onOpenHistory: () => void;
  buildLabel: string;
  onCheckUpdate: () => void;
}) {
  const { t } = useT();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [ruaUnlocked, setRuaUnlocked] = useState(isDevUnlocked("rua2026"));
  const [pwOpen, setPwOpen] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const requestRuaUnlock = () => {
    if (isDevUnlocked("rua2026")) {
      setDevLock("rua2026", false);
      setRuaUnlocked(false);
    } else {
      setPwInput("");
      setPwError(false);
      setPwOpen(true);
    }
  };
  const submitRuaPw = () => {
    if (pwInput.trim() === "rua2026") {
      setDevLock("rua2026", true);
      setRuaUnlocked(true);
      setPwOpen(false);
      setPwError(false);
    } else {
      setPwError(true);
    }
  };
  const avatar = getHeroAvatarData();

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
            <button className="btn tiny" onClick={() => setAvatarOpen(true)}>
              {t("profile.changeAvatar")}
            </button>
          </div>
        </div>

        {/* Progressão — XP + Conquistas */}
        <div className="profile-progress-row">
          <button className="btn profile-evolution" onClick={onOpenProgress}>
            📊 {t("profile.evolution")}
          </button>
          <button className="btn profile-evolution" onClick={onOpenAchievements}>
            🏆 Conquistas
          </button>
        </div>

        {/* Mural de troféus: os 10 maiores prêmios do jogador */}
        <TopPrizesPanel />

        {/* Diário de decisões: histórico de mãos com filtro por tipo de erro */}
        <div className="profile-section-title">📜 Histórico de Mãos</div>
        <button className="btn profile-evolution" onClick={onOpenHistory}>
          📜 Histórico de Mãos
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

        {/* Gate de senha p/ features em teste ("rua2026") — só o Allan usa. */}
        <div className="profile-setting">
          <span className="ps-label">🔑 {t("profile.devTest")}</span>
          <button
            className={`btn tiny ${ruaUnlocked ? "devlock-on" : "devlock-off"}`}
            onClick={requestRuaUnlock}
          >
            {ruaUnlocked ? "🟢 " + t("profile.devTestOn") : "🔒 " + t("profile.devTestOff")}
          </button>
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
            <button className="btn profile-help-btn" onClick={() => window.open(INSTAGRAM_URL, "_blank")}>
              📸 {t("profile.follow")}
            </button>
            <button className="btn profile-help-btn" onClick={shareApp}>
              📣 {t("profile.share")}
            </button>
            <button className="btn profile-help-btn" onClick={inviteFriend}>
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

      {/* Modal de senha para funcionalidades em teste — evita prompt() nativo, que trava o app no mobile. */}
      {pwOpen ? (
        <div className="devpw-overlay" onClick={() => setPwOpen(false)}>
          <div className="devpw-box" onClick={(e) => e.stopPropagation()}>
            <div className="devpw-title">🔑 {t("profile.devTestTitle")}</div>
            <div className="devpw-note">{t("profile.devTestNote")}</div>
            <input
              className={`devpw-input${pwError ? " devpw-input-err" : ""}`}
              type="text"
              inputMode="text"
              autoComplete="off"
              placeholder="senha"
              value={pwInput}
              onChange={(e) => {
                setPwInput(e.target.value);
                if (pwError) setPwError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitRuaPw();
              }}
            />
            {pwError ? <div className="devpw-err">{t("profile.devTestWrong")}</div> : null}
            <div className="devpw-btns">
              <button className="btn tiny" onClick={() => setPwOpen(false)}>
                {t("profile.devTestCancel")}
              </button>
              <button className="btn tiny" onClick={submitRuaPw}>
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

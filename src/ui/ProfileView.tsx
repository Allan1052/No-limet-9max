// ---------------------------------------------------------------------------
// Perfil — a "casa" do jogador e dos ajustes. Tira os controles do topo lotado
// (idioma, Simples/Técnico, variante, versão, instalar) e junta com o avatar e
// a evolução num lugar só. Deixa o topo do app só com a logo.
// ---------------------------------------------------------------------------
import { useEffect, useState } from "react";
import { useT } from "../i18n";
import type { TransKey } from "../i18n/translations";
import { ModeToggle } from "../ui/ModeToggle";
import { isDevUnlocked, setDevLock } from "../lib/devLock";
import { LangSelect } from "./LangSelect";
import { InstallButton } from "./InstallButton";
import { AvatarSelector, getHeroAvatarData } from "./AvatarSelector";
import { SupportPix } from "./SupportPix";
import { TopPrizesPanel } from "./TopPrizesPanel";
import { TournamentCountPanel } from "./TournamentCountPanel";
import { loadEliteWins, recordTournamentWin } from "../tournament/eliteUnlock";
import { recordEliteWinCloud, syncEliteWins, loadAllEliteWins } from "../lib/eliteSync";
import { getNickname } from "../lib/nickname";
import { trackEvent } from "../app/analytics";

export function ProfileView({
  gameVariant,
  setGameVariant,
  omahaUnlocked,
  setOmahaUnlocked,
  onOpenProgress,
  onOpenAchievements,
  onOpenHistory,
  buildLabel,
  fullBuildLabel,
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
  fullBuildLabel: string;
  onCheckUpdate: () => void;
}) {
  const { t } = useT();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [ruaUnlocked, setRuaUnlocked] = useState(isDevUnlocked("rua2026"));
  const [eliteUnlocked, setEliteUnlocked] = useState<boolean>(() => {
    // Local + espelho da nuvem: se a vitória existe em qualquer um dos dois,
    // o $1.000 está destravado (loadAllEliteWins faz a união).
    return !!loadAllEliteWins()["109"];
  });

  // Sincroniza as vitórias de elite com a nuvem (anti-perda em limpezas de cache).
  useEffect(() => {
    syncEliteWins(getNickname());
  }, []);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const [pwMode, setPwMode] = useState<"rua2026" | "elite109">("rua2026");
  const requestRuaUnlock = () => {
    if (isDevUnlocked("rua2026")) {
      setDevLock("rua2026", false);
      setRuaUnlocked(false);
    } else {
      setPwInput("");
      setPwError(false);
      setPwMode("rua2026");
      setPwOpen(true);
    }
  };
  const submitRuaPw = () => {
    const v = pwInput.trim();
    if (pwMode === "rua2026") {
      if (v === "rua2026") {
        setDevLock("rua2026", true);
        setRuaUnlocked(true);
        setPwOpen(false);
        setPwError(false);
      } else {
        setPwError(true);
      }
    } else {
      // elite109: destrava o $1.000 registrando a vitória comprovada de $109
      // (o Allan já foi campeão de um torneio de $109 com 100+ jogadores —
      // o registro local foi apagado em limpezas de cache). Senha: 2026.
      if (v === "2026") {
        recordTournamentWin(109, 100, "inicio");
        recordEliteWinCloud(109, getNickname());
        setEliteUnlocked(true);
        setPwOpen(false);
        setPwError(false);
      } else {
        setPwError(true);
      }
    }
  };
  const requestEliteUnlock = () => {
    if (loadEliteWins()["109"]) {
      // Já destravado pela vitória — remove o registro (volta ao natural).
      const w = loadEliteWins();
      delete w["109"];
      try {
        localStorage.setItem("cof-elite-wins", JSON.stringify(w));
      } catch {
        /* storage indisponível */
      }
      setEliteUnlocked(false);
    } else {
      setPwInput("");
      setPwError(false);
      setPwMode("elite109");
      setPwOpen(true);
    }
  };
  const avatar = getHeroAvatarData();

  // "Ajude a manter grátis" — engajamento sutil (compartilhar mantém o app de pé).
  const INSTAGRAM_URL = "https://instagram.com/calloufold.sonho";
  const UMAMI_SITE_URL = "https://cloud.umami.is/analytics/us/websites/5324592f-e1ca-4954-8539-4ebb5e9f98c1";
  // WhatsApp de suporte pro botão "Reportar um problema". Coloque só os dígitos
  // com DDI+DDD (ex.: "5511999998888"). Enquanto estiver vazio, o botão cai no
  // Instagram (DM) — nada quebra.
  const REPORT_WHATSAPP = "5531972698694"; // WhatsApp Business do Allan (DDI 55 + DDD 31)
  const reportProblem = () => {
    const msg =
      "Olá! Encontrei algo no Call ou Fold que quero reportar 🃏\n\n" +
      "• O que aconteceu:\n• Em qual tela/aba:\n• (se puder, manda um print)\n";
    import("../app/analytics").then(({ trackEvent }) => trackEvent("report_problem"));
    const url = REPORT_WHATSAPP
      ? `https://wa.me/${REPORT_WHATSAPP}?text=${encodeURIComponent(msg)}`
      : INSTAGRAM_URL;
    window.open(url, "_blank");
  };
  const appUrl =
    typeof window !== "undefined" ? window.location.origin : "https://calloufold.com.br";
  const shareApp = () => {
    const text = t("profile.shareText");
    import("../app/analytics").then(({ trackEvent }) => trackEvent("share_app"));
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "Call ou Fold", text, url: appUrl }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${appUrl}`)}`, "_blank");
    }
  };
  const inviteFriend = () => {
    const text = t("profile.inviteText");
    import("../app/analytics").then(({ trackEvent }) => trackEvent("invite_friend"));
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

        {/* Trajetória por buy-in: quantos torneios do Circuito disputados
            (e quantos no dinheiro) em cada faixa — a jornada completa. */}
        <TournamentCountPanel />

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

        {/* Destravamento do $1.000 (elite109) — para quando a vitória de $109
            com 100+ jogadores se perde em limpezas de cache. Só o Allan vê. */}
        <div className="profile-setting">
          <span className="ps-label">🏆 $1.000 — elite</span>
          <button
            className={`btn tiny ${eliteUnlocked ? "devlock-on" : "devlock-off"}`}
            onClick={requestEliteUnlock}
          >
            {eliteUnlocked ? "🟢 Destravado" : "🔒 Destravar ($109)"}
          </button>
        </div>

        {ruaUnlocked ? (
          <div
            className="profile-analytics-box"
            style={{
              margin: "12px 0",
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid rgba(92,190,141,0.35)",
              background: "rgba(92,190,141,0.08)",
            }}
          >
            <div style={{ fontWeight: 800, color: "var(--gold)", marginBottom: 5 }}>📈 Métricas do projeto</div>
            <div style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.45, marginBottom: 10 }}>
              Atalhos privados para acompanhar visitas, eventos, funil e origem do tráfego no Umami.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[
                ["Visão geral", `${UMAMI_SITE_URL}?date=30day`, "metrics_overview_opened"],
                ["Eventos", `${UMAMI_SITE_URL}/events?date=30day`, "metrics_events_opened"],
                ["Funis", `${UMAMI_SITE_URL}/funnels?date=30day`, "metrics_funnels_opened"],
                ["UTMs", `${UMAMI_SITE_URL}/utm?date=30day`, "metrics_utm_opened"],
              ].map(([label, href, event]) => (
                <a
                  key={event}
                  className="btn tiny"
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackEvent(event)}
                  style={{ textDecoration: "none" }}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        ) : null}

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
          <span className="ps-note">Atualizado em {fullBuildLabel}</span>
        </div>

        <div className="profile-help">
          <div className="profile-help-title">🤝 {t("profile.helpTitle")}</div>
          <div className="profile-help-note">{t("profile.helpNote")}</div>
          <div className="profile-help-row">
            <button
              className="btn profile-help-btn"
              onClick={() => {
                import("../app/analytics").then(({ trackEvent }) => trackEvent("click_instagram"));
                window.open(INSTAGRAM_URL, "_blank");
              }}
            >
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

        {/* Reportar um problema — transparência + canal de feedback. */}
        <div
          className="profile-report"
          style={{
            marginTop: 14,
            padding: "14px 16px",
            borderRadius: 14,
            border: "1px solid rgba(230,196,84,0.22)",
            background: "rgba(230,196,84,0.05)",
            textAlign: "center",
          }}
        >
          <p style={{ margin: "0 0 10px", fontSize: 13.5, lineHeight: 1.5, color: "var(--text-dim, #cfc8b0)" }}>
            O Call ou Fold é feito por um jogador recreativo, <b>sozinho</b>, com a ajuda de uma IA — e está <b>sempre melhorando</b>. 🃏 Achou algum erro? Me conta que eu conserto rápido.
          </p>
          <button className="btn profile-help-btn" onClick={reportProblem}>
            🛠️ Reportar um problema
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
            <div className="devpw-title">
              {pwMode === "elite109" ? "🏆 Destravar $1.000" : "🔑 " + t("profile.devTestTitle")}
            </div>
            <div className="devpw-note">
              {pwMode === "elite109"
                ? "Já venceu um torneio de $109 com 100+ jogadores? A senha 2026 registra a vitória e libera o $1.000."
                : t("profile.devTestNote")}
            </div>
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

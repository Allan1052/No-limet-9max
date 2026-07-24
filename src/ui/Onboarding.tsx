// Tutorial de primeira vez (30 segundos): 4 passos curtos para o recreativo
// não se perder. Aparece só uma vez (marcado no localStorage via settings).
import { useT } from "../i18n";

export function Onboarding({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const steps = [t("onboard.s1"), t("onboard.s2"), t("onboard.s3"), t("onboard.s4")];
  return (
    <div className="overlay" onClick={onClose}>
      <div className="replay onboard" onClick={(e) => e.stopPropagation()}>
        <h3>{t("onboard.title")}</h3>
        <ol className="onboard-steps">
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
        <p className="onboard-mode">{t("onboard.mode")}</p>
        <button className="btn primary" onClick={onClose}>
          {t("onboard.cta")}
        </button>
      </div>
    </div>
  );
}

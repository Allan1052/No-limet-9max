// Alternador de modo: Simples (linguagem fácil) ↔ Técnico (com números).
import { useSettings } from "../app/settings";
import { useT } from "../i18n";

export function ModeToggle() {
  const { mode, setMode } = useSettings();
  const { t } = useT();
  return (
    <div className="mode-toggle" title={t("mode.tip")}>
      <button
        className={`mode-opt ${mode === "simples" ? "active" : ""}`}
        onClick={() => setMode("simples")}
      >
        {t("mode.simple")}
      </button>
      <button
        className={`mode-opt ${mode === "tecnico" ? "active" : ""}`}
        onClick={() => setMode("tecnico")}
      >
        {t("mode.technical")}
      </button>
    </div>
  );
}

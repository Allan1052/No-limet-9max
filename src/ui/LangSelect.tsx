// Seletor de idioma (bandeirinhas) para o topo da barra.
import { useT } from "../i18n";
import { LANGS } from "../i18n/translations";

export function LangSelect() {
  const { lang, setLang, t } = useT();
  return (
    <div className="lang-select" title={t("lang.label")}>
      {LANGS.map((l) => (
        <button
          key={l.id}
          className={`lang-opt ${lang === l.id ? "active" : ""}`}
          onClick={() => setLang(l.id)}
          aria-label={l.label}
          title={l.label}
        >
          {l.flag}
        </button>
      ))}
    </div>
  );
}

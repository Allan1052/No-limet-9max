// ---------------------------------------------------------------------------
// Contexto de idioma (i18n).
//
// Fornece `useT()` → { t, lang, setLang }. O idioma inicial vem do localStorage
// (se o usuário já escolheu) ou do idioma do navegador; senão, português.
// A escolha é persistida e também refletida no atributo lang do <html>.
// ---------------------------------------------------------------------------

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { TRANSLATIONS, type Lang, type TransKey } from "./translations";

const STORAGE_KEY = "poker-sim-lang";

function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "pt" || saved === "es" || saved === "en") return saved;
  } catch {
    /* localStorage indisponível — segue para detecção do navegador */
  }
  const nav = (typeof navigator !== "undefined" ? navigator.language : "pt").toLowerCase();
  if (nav.startsWith("es")) return "es";
  if (nav.startsWith("en")) return "en";
  return "pt";
}

/** Interpola {chaves} no texto com os valores fornecidos. */
function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export type TFunc = (key: TransKey, vars?: Record<string, string | number>) => string;

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: TFunc;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignora se não puder persistir */
    }
  }, []);

  const t = useCallback<TFunc>(
    (key, vars) => {
      const dict = TRANSLATIONS[lang] ?? TRANSLATIONS.pt;
      const raw = (dict[key] ?? TRANSLATIONS.pt[key] ?? key) as string;
      return interpolate(raw, vars);
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT precisa estar dentro de <I18nProvider>");
  return ctx;
}

// ---------------------------------------------------------------------------
// Preferências do usuário (persistentes).
//
//  - mode: "simples" (linguagem humana, menos números — foco no recreativo) ou
//    "tecnico" (equity, pot odds, frequências — para quem quer os números).
//  - onboarded: se o usuário já viu o tutorial de primeira vez.
//
// Guardado no localStorage do aparelho.
// ---------------------------------------------------------------------------

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type UiMode = "simples" | "tecnico";

interface SettingsValue {
  mode: UiMode;
  setMode: (m: UiMode) => void;
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;
}

const MODE_KEY = "poker-sim-mode";
const ONBOARD_KEY = "poker-sim-onboarded";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignora se indisponível */
  }
}

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<UiMode>(() =>
    read(MODE_KEY) === "tecnico" ? "tecnico" : "simples",
  );
  const [onboarded, setOnboardedState] = useState<boolean>(() => read(ONBOARD_KEY) === "1");

  const setMode = useCallback((m: UiMode) => {
    setModeState(m);
    write(MODE_KEY, m);
  }, []);
  const setOnboarded = useCallback((v: boolean) => {
    setOnboardedState(v);
    write(ONBOARD_KEY, v ? "1" : "0");
  }, []);

  const value = useMemo(
    () => ({ mode, setMode, onboarded, setOnboarded }),
    [mode, setMode, onboarded, setOnboarded],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings precisa estar dentro de <SettingsProvider>");
  return ctx;
}

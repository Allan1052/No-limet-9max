import { create } from "zustand";
import { LEMBRETES_PADRAO, type ConfigLembretes } from "../lib/lembretes";

/** Preferências DESTE aparelho (ficam no navegador, não vão para a nuvem). */
export type Tema = "sistema" | "claro" | "escuro";

export interface Preferencias {
  tema: Tema;
  copos: number[];
  lembretes: ConfigLembretes;
  /** Modo dupla: mostrar kg perdidos ao parceiro? */
  compartilharKg: boolean;
  /** Conquistas já comemoradas (para não repetir a festa). */
  conquistasVistas: string[];
  /** Marcos já comemorados no dia (água, missões, proteína). */
  festasDoDia: { data: string; ids: string[] };
  /** Controle dos lembretes. */
  ultimoBlocoAgua: string | null;
  ultimoAvisoCheckin: string | null;
}

const CHAVE = "vida-leve:prefs";

const PADRAO: Preferencias = {
  tema: "sistema",
  copos: [200, 250, 500],
  lembretes: LEMBRETES_PADRAO,
  compartilharKg: false,
  conquistasVistas: [],
  festasDoDia: { data: "", ids: [] },
  ultimoBlocoAgua: null,
  ultimoAvisoCheckin: null,
};

function carregar(): Preferencias {
  try {
    const raw = localStorage.getItem(CHAVE);
    if (!raw) return PADRAO;
    const p = JSON.parse(raw) as Partial<Preferencias>;
    return { ...PADRAO, ...p, lembretes: { ...LEMBRETES_PADRAO, ...p.lembretes } };
  } catch {
    return PADRAO;
  }
}

interface PrefsState extends Preferencias {
  atualizar: (p: Partial<Preferencias>) => void;
  resetar: () => void;
}

export const usePreferencias = create<PrefsState>((set, get) => ({
  ...carregar(),
  atualizar: (p) => {
    set(p);
    const { atualizar: _a, resetar: _r, ...dados } = { ...get(), ...p };
    try {
      localStorage.setItem(CHAVE, JSON.stringify(dados));
    } catch {
      /* sem armazenamento: vale só nesta sessão */
    }
  },
  resetar: () => {
    try {
      localStorage.removeItem(CHAVE);
    } catch {
      /* ignora */
    }
    set(PADRAO);
  },
}));

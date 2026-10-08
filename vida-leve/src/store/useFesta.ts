import { create } from "zustand";

export interface Festa {
  emoji: string;
  titulo: string;
  texto: string;
}

interface FestaState {
  fila: Festa[];
  festejar: (f: Festa) => void;
  fechar: () => void;
}

/** Fila de comemorações (uma por vez na tela). */
export const useFesta = create<FestaState>((set) => ({
  fila: [],
  festejar: (f) => {
    set((s) => ({ fila: [...s.fila, f] }));
    try {
      navigator.vibrate?.([40, 60, 40]);
    } catch {
      /* sem vibração */
    }
  },
  fechar: () => set((s) => ({ fila: s.fila.slice(1) })),
}));

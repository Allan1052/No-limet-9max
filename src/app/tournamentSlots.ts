// ---------------------------------------------------------------------------
// Vários torneios salvos ao mesmo tempo — UM slot por faixa de buy-in.
//
// Cada buy-in ($5, $11, $22, $55, $109) tem seu próprio save no localStorage.
// Assim dá para ter um torneio em andamento em cada faixa e voltar a qualquer
// um quando quiser, com o progresso (stacks, campo, nível, estatísticas) e o
// feedback preservados por faixa.
// ---------------------------------------------------------------------------

import type { GameSnapshot } from "./gameController";
import type { Stage } from "../tournament/structure";

const PREFIX = "poker-sim-tourney-";

export interface SlotMeta {
  buyIn: number;
  savedAt: string;
  stage: Stage;
  entrants: number;
  fieldRemaining: number;
  heroStack: number;
  bb: number;
  /** Modo do torneio salvo: Treino Livre ou etapa do Circuito. */
  mode?: "livre" | "circuito";
  /** Etapa do circuito (1 a 10), quando for um save do Circuito. */
  circuitStage?: number;
}

export function slotKey(buyIn: number): string {
  return `${PREFIX}${buyIn}`;
}

export function saveSlot(snap: GameSnapshot): void {
  try {
    localStorage.setItem(slotKey(snap.tournament.buyIn), JSON.stringify(snap));
  } catch {
    /* armazenamento indisponível */
  }
}

export function loadSlot(buyIn: number): GameSnapshot | null {
  try {
    const raw = localStorage.getItem(slotKey(buyIn));
    return raw ? (JSON.parse(raw) as GameSnapshot) : null;
  } catch {
    return null;
  }
}

export function removeSlot(buyIn: number): void {
  try {
    localStorage.removeItem(slotKey(buyIn));
  } catch {
    /* ignora */
  }
}

/** Metadados de todos os torneios salvos, do mais recente ao mais antigo. */
export function listSlots(): SlotMeta[] {
  const out: SlotMeta[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const snap = JSON.parse(raw) as GameSnapshot;
      if (!snap?.tournament) continue;
      const hero = snap.seats.find((s) => s.isHero);
      out.push({
        buyIn: snap.tournament.buyIn,
        savedAt: snap.savedAt,
        stage: snap.tournament.stage,
        entrants: snap.tournament.entrants,
        fieldRemaining: Math.round(snap.tournament.fieldRemaining),
        heroStack: hero?.stack ?? 0,
        bb: snap.blinds.bb,
        mode: snap.tournament.mode,
        circuitStage: snap.tournament.circuitStage,
      });
    }
  } catch {
    /* localStorage indisponível */
  }
  return out.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
}

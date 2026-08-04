// ---------------------------------------------------------------------------
// ÁUREA — a "pontuação de estilo" do Call ou Fold.
//
// A trend fala em "farmar áurea" = ganhar clout sendo foda. Aqui a gente
// inverte: você farma áurea tomando a DECISÃO CERTA, principalmente as
// difíceis (um bom fold, largar o AK que não acertou). Nunca tem a ver com
// dinheiro — é pontuação de ESTUDO. Se a moda passar, troca-se só o nome; o
// motor ("recompensa por decidir certo") continua valendo.
//
// Guardado só no celular (localStorage). Sem backend.
// ---------------------------------------------------------------------------

const AURA_KEY = "cof-aura-v1";

export function loadAuraTotal(): number {
  try {
    const raw = localStorage.getItem(AURA_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Soma áurea ao total e devolve o novo total. */
export function addAura(amount: number): number {
  const total = loadAuraTotal() + Math.max(0, Math.round(amount));
  try {
    localStorage.setItem(AURA_KEY, String(total));
  } catch {
    /* ignore */
  }
  return total;
}

/**
 * Quanta áurea um estágio da Missão 1×1 vale ao ser passado.
 *  - base cresce com a dificuldade (índice do estágio);
 *  - bônus por gabaritar (sem erro nenhum);
 *  - bônus grande na PRIMEIRA vez que bate aquele estágio.
 */
export function auraForStage(
  stageIdx: number,
  correct: number,
  rounds: number,
  firstClear: boolean,
): number {
  const base = 40 + stageIdx * 10;
  const flawless = correct >= rounds ? 40 : 0;
  const firstTime = firstClear ? 100 : 0;
  return base + flawless + firstTime;
}

// +/− áurea por decisão no treino: acertou a jogada certa = farma; caiu no
// vazamento = perde um pouco (mas o total nunca fica negativo — é convite, não
// punição). Devolve o delta (pra mostrar "+6"/"−4") e o novo total.
const DECISION_GAIN = 6;
const DECISION_LOSS = 4;

export function awardDecisionAura(correct: boolean): { delta: number; total: number } {
  const delta = correct ? DECISION_GAIN : -DECISION_LOSS;
  const total = Math.max(0, loadAuraTotal() + delta);
  try {
    localStorage.setItem(AURA_KEY, String(total));
  } catch {
    /* ignore */
  }
  return { delta, total };
}

export interface AuraTier {
  key: string; // chave de i18n
  emoji: string;
}

// Do menor pro maior — auraTier() pega o primeiro cujo mínimo o total alcança.
const AURA_TIERS: Array<{ min: number } & AuraTier> = [
  { min: 4000, key: "aura.tier4", emoji: "👑" },
  { min: 1500, key: "aura.tier3", emoji: "🔥" },
  { min: 500, key: "aura.tier2", emoji: "⭐" },
  { min: 100, key: "aura.tier1", emoji: "✨" },
  { min: 0, key: "aura.tier0", emoji: "•" },
];

export function auraTier(total: number): AuraTier {
  const found = AURA_TIERS.find((t) => total >= t.min);
  return found ?? AURA_TIERS[AURA_TIERS.length - 1];
}

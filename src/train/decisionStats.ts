// ---------------------------------------------------------------------------
// RAIO-X — estatística das SUAS decisões (fold / call / raise).
//
// Guarda quantas vezes você escolheu cada ação no treino (Treino, 1×1 livre,
// Campanha e Mão do dia). Com isso a gente mostra o SEU perfil vs o ideal —
// "onde você vaza ficha". Tudo local, sem backend.
// ---------------------------------------------------------------------------

const KEY = "cof-decstats-v1";

export interface DecisionStats {
  fold: number;
  call: number;
  raise: number; // raise + all-in (ambos são agressão)
  total: number;
}

export function loadDecisionStats(): DecisionStats {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      const fold = p.fold | 0;
      const call = p.call | 0;
      const raise = p.raise | 0;
      return { fold, call, raise, total: fold + call + raise };
    }
  } catch {
    /* ignore */
  }
  return { fold: 0, call: 0, raise: 0, total: 0 };
}

export function recordDecision(key: "fold" | "call" | "raise" | "allin"): void {
  const s = loadDecisionStats();
  if (key === "fold") s.fold += 1;
  else if (key === "call") s.call += 1;
  else s.raise += 1; // raise ou allin
  try {
    localStorage.setItem(KEY, JSON.stringify({ fold: s.fold, call: s.call, raise: s.raise }));
  } catch {
    /* ignore */
  }
}

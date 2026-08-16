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

// ---------------------------------------------------------------------------
// Raio-X de TORNEIO — as suas decisões pré-flop no jogo de verdade, separadas
// por faixa de buy-in (micro / baixa / média / alta).
// ---------------------------------------------------------------------------

export type Tier = "micro" | "baixa" | "media" | "alta" | "elite";
export const TIERS: Tier[] = ["micro", "baixa", "media", "alta", "elite"];

/** Buy-ins do app: $5/$11 · $22 · $55 · $109 · $1.000+ → 5 faixas. */
export function buyInTier(buyIn: number): Tier {
  if (buyIn <= 11) return "micro";
  if (buyIn <= 22) return "baixa";
  if (buyIn <= 55) return "media";
  if (buyIn >= 1000) return "elite";
  return "alta";
}

const TKEY = "cof-tourney-decstats-v1";
type Bucket = { fold: number; call: number; raise: number };
type TierMap = Record<Tier, Bucket>;

function emptyTierMap(): TierMap {
  return {
    micro: { fold: 0, call: 0, raise: 0 },
    baixa: { fold: 0, call: 0, raise: 0 },
    media: { fold: 0, call: 0, raise: 0 },
    alta: { fold: 0, call: 0, raise: 0 },
    elite: { fold: 0, call: 0, raise: 0 },
  };
}

function loadTierMap(): TierMap {
  try {
    const raw = localStorage.getItem(TKEY);
    if (raw) {
      const p = JSON.parse(raw);
      const base = emptyTierMap();
      for (const tier of TIERS) {
        if (p[tier]) {
          base[tier] = {
            fold: p[tier].fold | 0,
            call: p[tier].call | 0,
            raise: p[tier].raise | 0,
          };
        }
      }
      return base;
    }
  } catch {
    /* ignore */
  }
  return emptyTierMap();
}

/** Registra UMA decisão pré-flop de torneio (só fold/call/raise; check é ignorado). */
export function recordTournamentDecision(buyIn: number, heroType: string): void {
  let key: "fold" | "call" | "raise" | null = null;
  if (heroType === "fold") key = "fold";
  else if (heroType === "call") key = "call";
  else if (heroType === "raise" || heroType === "bet" || heroType === "allin") key = "raise";
  if (!key) return; // check e outros passivos: fora da distribuição
  const map = loadTierMap();
  map[buyInTier(buyIn)][key] += 1;
  try {
    localStorage.setItem(TKEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function tournamentStatsFor(tier: Tier): DecisionStats {
  const b = loadTierMap()[tier];
  return { fold: b.fold, call: b.call, raise: b.raise, total: b.fold + b.call + b.raise };
}

// ---------------------------------------------------------------------------
// XP + Achievements — sistema de progressão que dá motivo pro jogador
// abrir o app todo dia. Persistido no localStorage do aparelho.
//
// DEV-UNLOCK: xp_dev_unlock — sem essa flag no localStorage, o sistema
// inteiro fica invisível (nenhuma UI, nenhum callback).
// ---------------------------------------------------------------------------
import type { Rating } from "../feedback/analyzer";

// ── Acesso global (antes era dev-unlock xp_dev_unlock, agora aberto pra todos) ──
export function isXpUnlocked(): boolean {
  return true;
}

// ── Tipos ──

export interface AchievementDef {
  id: string;
  name: string;
  icon: string;
  category: "iniciante" | "decisao" | "torneio" | "avancado";
  description: string;
  /** Função que verifica se o achievement foi desbloqueado dado o estado. */
  check: (s: XpState) => boolean;
}

export interface XpState {
  xp: number;
  handsPlayed: number;
  tournamentsFinished: number;
  itmCount: number;
  finalTableCount: number;
  wins: number;
  correctDecisions: number;
  foldPreflopCorrect: number;
  raiseCorrect: number;
  /** Sequência de decisões boas consecutivas. */
  correctStreak: number;
  /** Sequência de decisões sem "ruim". */
  noBadStreak: number;
  /** Máximo de streak de decisões boas. */
  maxCorrectStreak: number;
  /** Dias jogados (dias distintos). */
  playDays: number;
  /** Última data de jogo (ISO yyyy-mm-dd). */
  lastPlayDate: string;
  /** Dias seguidos de jogo. */
  streakDays: number;
  /** IDs dos achievements desbloqueados. */
  unlocked: string[];
  /** Flags temporárias (não persistidas — usadas pra detectar eventos). */
  _replayOpened?: boolean;
  _handShared?: boolean;
  /** Timestamp da última atualização. */
  updatedAt: string;
}

export interface XpEvent {
  type: "decision" | "handOver" | "tournamentOver" | "shareHand" | "replayOpen";
  rating?: Rating;
  heroType?: string; // "fold", "call", "raise", "allin"
  isPreflop?: boolean;
  finishPlace?: number; // 1 = venceu
  inMoney?: boolean;
  isFinalTable?: boolean;
}

export interface AchievementToast {
  id: string;
  name: string;
  icon: string;
}

// ── Constantes ──

const STORAGE_KEY = "cof-xp-achievements";
const XP_PER_GOOD = 10;
const XP_PER_OK = 5;
const XP_PER_IMPRECISE = 0;
const XP_PER_BAD = -5;
const XP_PER_LEVEL = 100;

// ── Definições de achievements ──

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // Iniciante
  {
    id: "first_hand",
    name: "Primeira Mão",
    icon: "🃏",
    category: "iniciante",
    description: "Jogue sua primeira mão no Call ou Fold.",
    check: (s) => s.handsPlayed >= 1,
  },
  {
    id: "hands_50",
    name: "Mão 50",
    icon: "✊",
    category: "iniciante",
    description: "Jogue 50 mãos.",
    check: (s) => s.handsPlayed >= 50,
  },
  {
    id: "hands_100",
    name: "Mão 100",
    icon: "💯",
    category: "iniciante",
    description: "Jogue 100 mãos.",
    check: (s) => s.handsPlayed >= 100,
  },
  {
    id: "first_circuit",
    name: "Primeiro Circuito",
    icon: "🏁",
    category: "iniciante",
    description: "Finalize um torneio do Circuito.",
    check: (s) => s.tournamentsFinished >= 1,
  },
  {
    id: "first_replay",
    name: "Revisão",
    icon: "🔍",
    category: "iniciante",
    description: "Use o replay pela primeira vez.",
    check: (s) => !!s._replayOpened,
  },
  // Decisão
  {
    id: "iron_discipline",
    name: "Disciplina de Ferro",
    icon: "⚔️",
    category: "decisao",
    description: "Faça 10 decisões 'boa' seguidas.",
    check: (s) => s.maxCorrectStreak >= 10,
  },
  {
    id: "fold_master",
    name: "Fold Master",
    icon: "🛑",
    category: "decisao",
    description: "Faça 20 folds pré-flop corretos.",
    check: (s) => s.foldPreflopCorrect >= 20,
  },
  {
    id: "value_bet",
    name: "Extrair Valor",
    icon: "💰",
    category: "decisao",
    description: "Faça 15 raises/c-bets corretos.",
    check: (s) => s.raiseCorrect >= 15,
  },
  {
    id: "no_bad_calls",
    name: "Sem Call Ruim",
    icon: "🚫",
    category: "decisao",
    description: "Faça 30 decisões sem nenhum 'ruim' na sequência.",
    check: (s) => s.noBadStreak >= 30,
  },
  {
    id: "perfection",
    name: "Perfeição",
    icon: "✨",
    category: "decisao",
    description: "Faça 50 decisões boas sem erro.",
    check: (s) => s.maxCorrectStreak >= 50,
  },
  // Torneio
  {
    id: "finalist",
    name: "Finalista",
    icon: "🎯",
    category: "torneio",
    description: "Chegue na mesa final.",
    check: (s) => s.finalTableCount >= 1,
  },
  {
    id: "champion",
    name: "Campeão",
    icon: "🏆",
    category: "torneio",
    description: "Ganhe um torneio.",
    check: (s) => s.wins >= 1,
  },
  {
    id: "itm_5",
    name: "ITM 5x",
    icon: "💵",
    category: "torneio",
    description: "Termine in the money 5 vezes.",
    check: (s) => s.itmCount >= 5,
  },
  {
    id: "deep_run",
    name: "Deep Run",
    icon: "🏊",
    category: "torneio",
    description: "Chegue na mesa final com menos de 20bb.",
    check: (s) => s.unlocked.includes("deep_run"), // set manualmente
  },
  {
    id: "circuit_complete",
    name: "Circuito Completo",
    icon: "🌟",
    category: "torneio",
    description: "Finalize um Circuito Mensal.",
    check: (s) => s.tournamentsFinished >= 1, // simplificado — quando circuito existir de verdade
  },
  // Avançado
  {
    id: "high_roller",
    name: "High Roller",
    icon: "🎰",
    category: "avancado",
    description: "Jogue um torneio de $109.",
    check: (s) => s.unlocked.includes("high_roller"), // set manualmente
  },
  {
    id: "short_stack",
    name: "Short Stack Survivor",
    icon: "🧗",
    category: "avancado",
    description: "Sobreviva com menos de 10bb por 10 mãos.",
    check: (s) => s.unlocked.includes("short_stack"), // set manualmente
  },
  {
    id: "bluff_catcher",
    name: "Bluff Catcher",
    icon: "🎣",
    category: "avancado",
    description: "Faça um call correto contra all-in.",
    check: (s) => s.unlocked.includes("bluff_catcher"), // set manualmente
  },
  {
    id: "hand_share",
    name: "Compartilhador",
    icon: "📤",
    category: "avancado",
    description: "Compartilhe uma mão no Instagram/WhatsApp.",
    check: (s) => !!s._handShared,
  },
  {
    id: "streak_7",
    name: "Viciado",
    icon: "🔥",
    category: "avancado",
    description: "Jogue 7 dias seguidos.",
    check: (s) => s.streakDays >= 7,
  },
];

// ── Estado padrão ──

function defaultState(): XpState {
  return {
    xp: 0,
    handsPlayed: 0,
    tournamentsFinished: 0,
    itmCount: 0,
    finalTableCount: 0,
    wins: 0,
    correctDecisions: 0,
    foldPreflopCorrect: 0,
    raiseCorrect: 0,
    correctStreak: 0,
    noBadStreak: 0,
    maxCorrectStreak: 0,
    playDays: 0,
    lastPlayDate: "",
    streakDays: 0,
    unlocked: [],
    updatedAt: new Date().toISOString(),
  };
}

// ── Persistência ──

export function loadXpState(): XpState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<XpState>;
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

export function saveXpState(state: XpState): void {
  try {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignora (storage cheio ou privado) */
  }
}

export function resetXpState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignora */
  }
}

// ── XP helpers ──

export function xpToLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function xpForNextLevel(xp: number): number {
  const current = xp % XP_PER_LEVEL;
  return XP_PER_LEVEL - current;
}

function xpForRating(r: Rating): number {
  switch (r) {
    case "boa": return XP_PER_GOOD;
    case "ok": return XP_PER_OK;
    case "imprecisa": return XP_PER_IMPRECISE;
    case "ruim": return XP_PER_BAD;
    default: return 0;
  }
}

// ── Processar evento ──

/**
 * Processa um evento de jogo e retorna o estado atualizado + novos achievements.
 */
export function processXpEvent(state: XpState, event: XpEvent): { state: XpState; newAchievements: AchievementToast[] } {
  const s = { ...state };
  const newAchievements: AchievementToast[] = [];

  // Atualizar dia/semana
  const today = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
  if (s.lastPlayDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (s.lastPlayDate === yesterday) {
      s.streakDays += 1;
    } else if (s.lastPlayDate !== "") {
      s.streakDays = 1; // voltou depois de perder o streak
    } else {
      s.streakDays = 1; // primeiro dia
    }
    s.lastPlayDate = today;
    s.playDays += 1;
  }

  switch (event.type) {
    case "decision": {
      const rating = event.rating ?? "imprecisa";
      const xp = xpForRating(rating);
      s.xp = Math.max(0, s.xp + xp);

      if (rating === "boa" || rating === "ok") {
        s.correctDecisions += 1;
        s.correctStreak += 1;
        s.noBadStreak += 1;
        s.maxCorrectStreak = Math.max(s.maxCorrectStreak, s.correctStreak);

        if (event.isPreflop && event.heroType === "fold") {
          s.foldPreflopCorrect += 1;
        }
        if ((event.heroType === "raise" || event.heroType === "allin") && !event.isPreflop) {
          s.raiseCorrect += 1;
        }
        // Bluff catcher: call correto vs all-in
        if (event.heroType === "call") {
          s.unlocked.includes("bluff_catcher") || s.unlocked.push("bluff_catcher");
          // Na verdade só se foi contra all-in — simplificado aqui
        }
      } else {
        s.correctStreak = 0;
        s.noBadStreak = 0;
      }
      break;
    }
    case "handOver":
      s.handsPlayed += 1;
      break;
    case "tournamentOver":
      s.tournamentsFinished += 1;
      if (event.inMoney) s.itmCount += 1;
      if (event.isFinalTable) s.finalTableCount += 1;
      if (event.finishPlace === 1) s.wins += 1;
      break;
    case "replayOpen":
      // Mark flag so the achievement check can detect it
      if (!s.unlocked.includes("first_replay")) {
        s._replayOpened = true;
      }
      break;
    case "shareHand":
      if (!s.unlocked.includes("hand_share")) {
        s._handShared = true;
      }
      break;
  }

  // Checkar achievements
  for (const def of ACHIEVEMENT_DEFS) {
    if (!s.unlocked.includes(def.id) && def.check(s)) {
      s.unlocked.push(def.id);
      newAchievements.push({ id: def.id, name: def.name, icon: def.icon });
    }
  }

  saveXpState(s);
  return { state: s, newAchievements };
}

// ── Sumário para UI ──

export interface XpSummary {
  xp: number;
  level: number;
  xpForNext: number;
  unlockedCount: number;
  totalCount: number;
  streakDays: number;
  handsPlayed: number;
  achievements: Array<{ def: AchievementDef; unlocked: boolean }>;
}

export function getXpSummary(): XpSummary {
  const state = loadXpState();
  return {
    xp: state.xp,
    level: xpToLevel(state.xp),
    xpForNext: xpForNextLevel(state.xp),
    unlockedCount: state.unlocked.length,
    totalCount: ACHIEVEMENT_DEFS.length,
    streakDays: state.streakDays,
    handsPlayed: state.handsPlayed,
    achievements: ACHIEVEMENT_DEFS.map((def) => ({
      def,
      unlocked: state.unlocked.includes(def.id),
    })),
  };
}

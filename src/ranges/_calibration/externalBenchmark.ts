// ---------------------------------------------------------------------------
// BENCHMARK EXTERNO — transparência do motor (melhoria nº 6 da auditoria).
//
// O SELO interno (gtoBenchmark) é um teste de regressão CURADO por nós. Este
// aqui é diferente de propósito: compara as decisões do motor com uma
// REFERÊNCIA INDEPENDENTE — push/fold curto no estilo Nash e a teoria pré-flop
// consolidada — numa grade ampla (8–20bb, várias posições, jam/fold/defesa).
//
// O objetivo NÃO é dar 100%. É ser HONESTO: mostrar onde o motor bate com a
// referência e onde ainda APROXIMA. Por isso separamos dois níveis:
//
//   • "exato"    → decisões quase universais (premium sempre empurra; lixo
//                  claro sempre folda de EP). Divergência aqui = regressão real.
//   • "consenso" → decisões padrão da teoria (spots de Nash/consenso). Aqui uma
//                  divergência pode ser leak nosso OU simplificação aceitável —
//                  o relatório mostra qual, sem fingir precisão de solver.
//
// Fronteiras (as mãos que os próprios charts discordam por fração de %) são
// deixadas DE FORA de propósito — comparar nelas seria desonesto.
// ---------------------------------------------------------------------------
import { cardsFromString, seededRng } from "../../engine/cards";
import { preflopDecision, type PreflopContext } from "../preflop";
import { BASELINE_PROFILE } from "../../bots/profiles";
import { handTypeToCards, matches, actionFamily } from "./gtoBenchmark";

type Family = "aggro" | "fold" | "defend";
type Pos = PreflopContext["heroPosition"];
type Tier = "exato" | "consenso";

export interface ExtBenchSpot {
  hand: string;
  pos: Pos;
  effBB: number;
  expect: Family;
  /** De onde vem a decisão de referência (fonte independente). */
  ref: string;
  tier: Tier;
  opts?: Partial<PreflopContext>;
}

// ---------------------------------------------------------------------------
// Geradores (reduzem erro de transcrição — a regra é a mesma para todo o grupo).
// ---------------------------------------------------------------------------
const SHORT_STACKS = [8, 10, 12, 15, 18, 20];

/** Premium empurra/abre forte em qualquer posição e stack curto — universal. */
function premiumJams(): ExtBenchSpot[] {
  const hands = ["AA", "KK", "QQ", "AKs", "AKo"];
  const out: ExtBenchSpot[] = [];
  for (const pos of ["UTG", "CO", "BTN", "SB"] as Pos[]) {
    for (const effBB of SHORT_STACKS) {
      for (const hand of hands) {
        out.push({ hand, pos, effBB, expect: "aggro", tier: "exato", ref: "Universal (premium empurra curto)" });
      }
    }
  }
  return out;
}

/** Lixo claro folda de posição inicial/média — universal (fora de BTN/SB curtos,
 *  onde a teoria alarga o shove). */
function trashFoldsEarly(): ExtBenchSpot[] {
  const hands = ["72o", "82o", "62o", "73o", "83o"];
  const out: ExtBenchSpot[] = [];
  for (const pos of ["UTG", "CO"] as Pos[]) {
    for (const effBB of SHORT_STACKS) {
      for (const hand of hands) {
        out.push({ hand, pos, effBB, expect: "fold", tier: "exato", ref: "Universal (lixo folda de EP/MP curto)" });
      }
    }
  }
  // BTN só nos stacks mais altos (18–20bb), onde o lixo total ainda folda.
  for (const effBB of [18, 20]) {
    for (const hand of ["72o", "82o", "62o"]) {
      out.push({ hand, pos: "BTN", effBB, expect: "fold", tier: "exato", ref: "Universal (lixo folda BTN 18–20bb)" });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Spots de CONSENSO — push/fold curto no estilo Nash (fora das fronteiras).
// Cada um com a fonte. Jams padrão que qualquer chart de Nash confirma.
// ---------------------------------------------------------------------------
const NASH_JAMS: ExtBenchSpot[] = [
  // BTN empurra largo em stacks curtos (Nash push/fold).
  { hand: "A2s", pos: "BTN", effBB: 10, expect: "aggro", tier: "consenso", ref: "Nash push/fold (BTN 10bb)" },
  { hand: "A2o", pos: "BTN", effBB: 10, expect: "aggro", tier: "consenso", ref: "Nash push/fold (BTN 10bb)" },
  { hand: "K7o", pos: "BTN", effBB: 10, expect: "aggro", tier: "consenso", ref: "Nash push/fold (BTN 10bb)" },
  { hand: "Q9o", pos: "BTN", effBB: 10, expect: "aggro", tier: "consenso", ref: "Nash push/fold (BTN 10bb)" },
  { hand: "J9o", pos: "BTN", effBB: 10, expect: "aggro", tier: "consenso", ref: "Nash push/fold (BTN 10bb)" },
  { hand: "T8s", pos: "BTN", effBB: 12, expect: "aggro", tier: "consenso", ref: "Nash push/fold (BTN 12bb)" },
  { hand: "55", pos: "BTN", effBB: 15, expect: "aggro", tier: "consenso", ref: "Nash push/fold (BTN 15bb)" },
  { hand: "22", pos: "BTN", effBB: 12, expect: "aggro", tier: "consenso", ref: "Nash push/fold (BTN 12bb)" },
  // SB empurra muito largo (heads-up efetivo contra o BB).
  { hand: "K9o", pos: "SB", effBB: 12, expect: "aggro", tier: "consenso", ref: "Nash push/fold (SB 12bb)" },
  { hand: "Q8o", pos: "SB", effBB: 10, expect: "aggro", tier: "consenso", ref: "Nash push/fold (SB 10bb)" },
  { hand: "J7s", pos: "SB", effBB: 12, expect: "aggro", tier: "consenso", ref: "Nash push/fold (SB 12bb)" },
  { hand: "A2o", pos: "SB", effBB: 15, expect: "aggro", tier: "consenso", ref: "Nash push/fold (SB 15bb)" },
  // Jams fortes de posição inicial em stack curto (consenso amplo).
  { hand: "99", pos: "UTG", effBB: 12, expect: "aggro", tier: "consenso", ref: "Consenso push/fold (UTG 12bb)" },
  { hand: "AJs", pos: "UTG", effBB: 12, expect: "aggro", tier: "consenso", ref: "Consenso push/fold (UTG 12bb)" },
  { hand: "TT", pos: "CO", effBB: 15, expect: "aggro", tier: "consenso", ref: "Consenso push/fold (CO 15bb)" },
  { hand: "AQo", pos: "CO", effBB: 12, expect: "aggro", tier: "consenso", ref: "Consenso push/fold (CO 12bb)" },
];

// Folds de consenso: mãos que continuam fold mesmo com o range alargando.
const NASH_FOLDS: ExtBenchSpot[] = [
  { hand: "72o", pos: "SB", effBB: 20, expect: "fold", tier: "consenso", ref: "Nash push/fold (SB 20bb folda 72o)" },
  { hand: "82o", pos: "BTN", effBB: 20, expect: "fold", tier: "consenso", ref: "Nash push/fold (BTN 20bb folda 82o)" },
  { hand: "J2o", pos: "UTG", effBB: 15, expect: "fold", tier: "consenso", ref: "Consenso (UTG 15bb folda J2o)" },
  { hand: "Q4o", pos: "UTG", effBB: 12, expect: "fold", tier: "consenso", ref: "Consenso (UTG 12bb folda Q4o)" },
  { hand: "K3o", pos: "CO", effBB: 15, expect: "fold", tier: "consenso", ref: "Consenso (CO 15bb folda K3o)" },
];

// Defesa do BB contra abertura (20bb) — não foldar mãos jogáveis; foldar lixo.
const BB_DEFENSE: ExtBenchSpot[] = [
  { hand: "QJs", pos: "BB", effBB: 20, expect: "defend", tier: "consenso", ref: "Teoria BB defense vs BTN", opts: { raiserPosition: "BTN", openSizeBB: 2.2 } },
  { hand: "T9s", pos: "BB", effBB: 20, expect: "defend", tier: "consenso", ref: "Teoria BB defense vs BTN", opts: { raiserPosition: "BTN", openSizeBB: 2.2 } },
  { hand: "72o", pos: "BB", effBB: 20, expect: "fold", tier: "consenso", ref: "Teoria BB folda lixo vs UTG", opts: { raiserPosition: "UTG", openSizeBB: 2.5 } },
  { hand: "J3o", pos: "BB", effBB: 20, expect: "fold", tier: "consenso", ref: "Teoria BB folda lixo vs UTG", opts: { raiserPosition: "UTG", openSizeBB: 2.5 } },
];

/** O banco externo completo. */
export const EXTERNAL_SPOTS: ExtBenchSpot[] = [
  ...premiumJams(),
  ...trashFoldsEarly(),
  ...NASH_JAMS,
  ...NASH_FOLDS,
  ...BB_DEFENSE,
];

// ---------------------------------------------------------------------------
// Execução e relatório transparente.
// ---------------------------------------------------------------------------
export interface ExtMiss {
  hand: string;
  pos: Pos;
  effBB: number;
  expect: Family;
  got: string;
  ref: string;
  tier: Tier;
}

export interface ExternalBenchmarkResult {
  total: number;
  matched: number;
  score: number;
  /** Placar por nível (exato/consenso), pra separar regressão de aproximação. */
  byTier: Record<Tier, { total: number; matched: number; score: number }>;
  /** Onde o motor DIVERGE da referência — a lista honesta pra publicar. */
  misses: ExtMiss[];
}

export function runExternalBenchmark(spots: ExtBenchSpot[] = EXTERNAL_SPOTS): ExternalBenchmarkResult {
  let matched = 0;
  const misses: ExtMiss[] = [];
  const byTier: ExternalBenchmarkResult["byTier"] = {
    exato: { total: 0, matched: 0, score: 0 },
    consenso: { total: 0, matched: 0, score: 0 },
  };

  for (const s of spots) {
    const ctx: PreflopContext = {
      heroPosition: s.pos,
      hand: cardsFromString(handTypeToCards(s.hand)),
      effectiveBB: s.effBB,
      profile: BASELINE_PROFILE,
      variant: "holdem",
      rng: seededRng(0xC0FFEE),
      ...s.opts,
    };
    const d = preflopDecision(ctx);
    const ok = matches(s.expect, d.action);
    byTier[s.tier].total++;
    if (ok) {
      matched++;
      byTier[s.tier].matched++;
    } else {
      misses.push({ hand: s.hand, pos: s.pos, effBB: s.effBB, expect: s.expect, got: d.action, ref: s.ref, tier: s.tier });
    }
  }

  for (const t of ["exato", "consenso"] as Tier[]) {
    const b = byTier[t];
    b.score = b.total > 0 ? b.matched / b.total : 1;
  }

  return { total: spots.length, matched, score: spots.length ? matched / spots.length : 1, misses, byTier };
}

/** Resumo honesto de uma linha pra a UI de transparência do motor. */
export function externalBenchmarkSummary(): string {
  const r = runExternalBenchmark();
  const pct = Math.round(r.score * 100);
  return `Testado contra referência independente em ${r.total} spots de push/fold: bate em ${pct}%.`;
}

// Reexporta pra a UI/testes que quiserem a família da ação do motor.
export { actionFamily };

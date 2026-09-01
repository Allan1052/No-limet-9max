// ---------------------------------------------------------------------------
// BENCHMARK EXTERNO — transparência do motor (melhoria nº 6 da auditoria).
//
// O SELO interno (gtoBenchmark) é um teste de regressão CURADO por nós. Este
// aqui é diferente de propósito: compara as decisões do motor com uma
// REFERÊNCIA INDEPENDENTE — push/fold no estilo Nash, charts de RFI
// consolidados e teoria pré-flop padrão.
//
// O objetivo NÃO é dar 100%. É ser HONESTO: mostrar onde o motor bate com a
// referência e onde ainda APROXIMA. Por isso separamos dois níveis:
//
//   • "exato"    → decisões quase universais.
//   • "consenso" → decisões padrão da teoria, fora das fronteiras.
//
// Fronteiras (mãos que charts razoáveis tratam de forma mista/discordante)
// ficam DE FORA: uma divergência artificial seria pior que cobertura menor.
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

const SHORT_STACKS = [8, 10, 12, 15, 18, 20];
const DEEP_STACKS = [25, 30, 35, 40, 45];

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
  for (const effBB of [18, 20]) {
    for (const hand of ["72o", "82o", "62o"]) {
      out.push({ hand, pos: "BTN", effBB, expect: "fold", tier: "exato", ref: "Universal (lixo folda BTN 18–20bb)" });
    }
  }
  return out;
}

const NASH_JAMS: ExtBenchSpot[] = [
  { hand: "A2s", pos: "BTN", effBB: 10, expect: "aggro", tier: "consenso", ref: "Nash push/fold (BTN 10bb)" },
  { hand: "A2o", pos: "BTN", effBB: 10, expect: "aggro", tier: "consenso", ref: "Nash push/fold (BTN 10bb)" },
  { hand: "K7o", pos: "BTN", effBB: 10, expect: "aggro", tier: "consenso", ref: "Nash push/fold (BTN 10bb)" },
  { hand: "Q9o", pos: "BTN", effBB: 10, expect: "aggro", tier: "consenso", ref: "Nash push/fold (BTN 10bb)" },
  { hand: "J9o", pos: "BTN", effBB: 10, expect: "aggro", tier: "consenso", ref: "Nash push/fold (BTN 10bb)" },
  { hand: "T8s", pos: "BTN", effBB: 12, expect: "aggro", tier: "consenso", ref: "Nash push/fold (BTN 12bb)" },
  { hand: "55", pos: "BTN", effBB: 15, expect: "aggro", tier: "consenso", ref: "Nash push/fold (BTN 15bb)" },
  { hand: "22", pos: "BTN", effBB: 12, expect: "aggro", tier: "consenso", ref: "Nash push/fold (BTN 12bb)" },
  { hand: "K9o", pos: "SB", effBB: 12, expect: "aggro", tier: "consenso", ref: "Nash push/fold (SB 12bb)" },
  { hand: "Q8o", pos: "SB", effBB: 10, expect: "aggro", tier: "consenso", ref: "Nash push/fold (SB 10bb)" },
  { hand: "J7s", pos: "SB", effBB: 12, expect: "aggro", tier: "consenso", ref: "Nash push/fold (SB 12bb)" },
  { hand: "A2o", pos: "SB", effBB: 15, expect: "aggro", tier: "consenso", ref: "Nash push/fold (SB 15bb)" },
  { hand: "99", pos: "UTG", effBB: 12, expect: "aggro", tier: "consenso", ref: "Consenso push/fold (UTG 12bb)" },
  { hand: "AJs", pos: "UTG", effBB: 12, expect: "aggro", tier: "consenso", ref: "Consenso push/fold (UTG 12bb)" },
  { hand: "TT", pos: "CO", effBB: 15, expect: "aggro", tier: "consenso", ref: "Consenso push/fold (CO 15bb)" },
  { hand: "AQo", pos: "CO", effBB: 12, expect: "aggro", tier: "consenso", ref: "Consenso push/fold (CO 12bb)" },
];

const NASH_FOLDS: ExtBenchSpot[] = [
  { hand: "72o", pos: "SB", effBB: 20, expect: "fold", tier: "consenso", ref: "Nash push/fold (SB 20bb folda 72o)" },
  { hand: "82o", pos: "BTN", effBB: 20, expect: "fold", tier: "consenso", ref: "Nash push/fold (BTN 20bb folda 82o)" },
  { hand: "J2o", pos: "UTG", effBB: 15, expect: "fold", tier: "consenso", ref: "Consenso (UTG 15bb folda J2o)" },
  { hand: "Q4o", pos: "UTG", effBB: 12, expect: "fold", tier: "consenso", ref: "Consenso (UTG 12bb folda Q4o)" },
  { hand: "K3o", pos: "CO", effBB: 15, expect: "fold", tier: "consenso", ref: "Consenso (CO 15bb folda K3o)" },
];

const BB_DEFENSE: ExtBenchSpot[] = [
  { hand: "QJs", pos: "BB", effBB: 20, expect: "defend", tier: "consenso", ref: "Teoria BB defense vs BTN", opts: { raiserPosition: "BTN", openSizeBB: 2.2 } },
  { hand: "T9s", pos: "BB", effBB: 20, expect: "defend", tier: "consenso", ref: "Teoria BB defense vs BTN", opts: { raiserPosition: "BTN", openSizeBB: 2.2 } },
  { hand: "72o", pos: "BB", effBB: 20, expect: "fold", tier: "consenso", ref: "Teoria BB folda lixo vs UTG", opts: { raiserPosition: "UTG", openSizeBB: 2.5 } },
  { hand: "J3o", pos: "BB", effBB: 20, expect: "fold", tier: "consenso", ref: "Teoria BB folda lixo vs UTG", opts: { raiserPosition: "UTG", openSizeBB: 2.5 } },
];

function deepRfiSpots(): ExtBenchSpot[] {
  const out: ExtBenchSpot[] = [];
  const ref = "Charts de RFI consolidados 25–45bb (teoria padrão)";
  for (const pos of ["UTG", "CO", "BTN", "SB"] as Pos[]) {
    for (const effBB of DEEP_STACKS) {
      for (const hand of ["AA", "KK", "QQ", "JJ", "AKs", "AKo"]) {
        out.push({ hand, pos, effBB, expect: "aggro", tier: "exato", ref });
      }
    }
  }
  for (const pos of ["UTG", "CO", "BTN"] as Pos[]) {
    for (const effBB of DEEP_STACKS) {
      for (const hand of ["72o", "82o", "62o"]) {
        out.push({ hand, pos, effBB, expect: "fold", tier: "exato", ref });
      }
    }
  }
  return out;
}

function mediumDeepBlindDefense(): ExtBenchSpot[] {
  const out: ExtBenchSpot[] = [];
  for (const effBB of [25, 30, 40, 45]) {
    for (const hand of ["AQo", "AJs", "KQo", "KJs", "QJs", "JTs", "T9s", "98s", "88", "77"]) {
      out.push({
        hand, pos: "BB", effBB, expect: "defend", tier: "consenso",
        ref: "Teoria padrão BB defense vs BTN 2.2x (25–45bb)",
        opts: { raiserPosition: "BTN", openSizeBB: 2.2 },
      });
    }
    for (const hand of ["72o", "82o", "J3o", "Q4o"]) {
      out.push({
        hand, pos: "BB", effBB, expect: "fold", tier: "consenso",
        ref: "Teoria padrão BB defense vs UTG 2.5x (25–45bb)",
        opts: { raiserPosition: "UTG", openSizeBB: 2.5 },
      });
    }
  }
  for (const effBB of [30, 40]) {
    for (const hand of ["AA", "KK", "QQ", "AKs", "AKo"]) {
      out.push({
        hand, pos: "SB", effBB, expect: "aggro", tier: "exato",
        ref: "Teoria padrão SB vs BTN: premium 3-beta",
        opts: { raiserPosition: "BTN", openSizeBB: 2.2 },
      });
    }
    for (const hand of ["72o", "82o", "J3o"]) {
      out.push({
        hand, pos: "SB", effBB, expect: "fold", tier: "consenso",
        ref: "Teoria padrão SB vs BTN: lixo absoluto folda",
        opts: { raiserPosition: "BTN", openSizeBB: 2.2 },
      });
    }
  }
  return out;
}

function facingThreeBetSpots(): ExtBenchSpot[] {
  const out: ExtBenchSpot[] = [];
  const configs: Array<{ pos: Pos; raiserPosition: Pos; ref: string }> = [
    { pos: "BTN", raiserPosition: "BB", ref: "Teoria padrão BTN vs 3-bet BB" },
    { pos: "CO", raiserPosition: "BTN", ref: "Teoria padrão CO vs 3-bet BTN" },
  ];
  for (const { pos, raiserPosition, ref } of configs) {
    for (const effBB of [30, 40, 45]) {
      for (const hand of ["AA", "KK"]) {
        out.push({
          hand, pos, effBB, expect: "aggro", tier: "exato", ref: `${ref}: AA/KK 4-bet`,
          opts: { raiserPosition, openSizeBB: 2.2, threeBet: true, betLevelFaced: 2 },
        });
      }
      for (const hand of ["A5o", "K5o", "Q7o", "72o"]) {
        out.push({
          hand, pos, effBB, expect: "fold", tier: "consenso", ref: `${ref}: offsuit fraco folda`,
          opts: { raiserPosition, openSizeBB: 2.2, threeBet: true, betLevelFaced: 2 },
        });
      }
    }
  }
  return out;
}

const OPEN_SIZE_SENSITIVITY: ExtBenchSpot[] = [
  { hand: "Q5o", pos: "BB", effBB: 35, expect: "defend", tier: "consenso", ref: "BB defense vs BTN 2.2x — charts por sizing", opts: { raiserPosition: "BTN", openSizeBB: 2.2 } },
  { hand: "Q5o", pos: "BB", effBB: 35, expect: "fold", tier: "consenso", ref: "BB defense vs BTN 3.0x — charts por sizing", opts: { raiserPosition: "BTN", openSizeBB: 3.0 } },
  { hand: "J6o", pos: "BB", effBB: 30, expect: "defend", tier: "consenso", ref: "BB defense vs BTN 2.2x — charts por sizing", opts: { raiserPosition: "BTN", openSizeBB: 2.2 } },
  { hand: "J6o", pos: "BB", effBB: 30, expect: "fold", tier: "consenso", ref: "BB defense vs BTN 3.0x — charts por sizing", opts: { raiserPosition: "BTN", openSizeBB: 3.0 } },
  { hand: "T7o", pos: "BB", effBB: 40, expect: "defend", tier: "consenso", ref: "BB defense vs BTN 2.2x — charts por sizing", opts: { raiserPosition: "BTN", openSizeBB: 2.2 } },
  { hand: "T7o", pos: "BB", effBB: 40, expect: "fold", tier: "consenso", ref: "BB defense vs BTN 3.0x — charts por sizing", opts: { raiserPosition: "BTN", openSizeBB: 3.0 } },
  { hand: "96o", pos: "BB", effBB: 45, expect: "defend", tier: "consenso", ref: "BB defense vs BTN 2.2x — charts por sizing", opts: { raiserPosition: "BTN", openSizeBB: 2.2 } },
  { hand: "96o", pos: "BB", effBB: 45, expect: "fold", tier: "consenso", ref: "BB defense vs BTN 3.0x — charts por sizing", opts: { raiserPosition: "BTN", openSizeBB: 3.0 } },
  { hand: "KQo", pos: "BB", effBB: 35, expect: "defend", tier: "exato", ref: "Teoria padrão: KQo nunca folda BB vs BTN 3x", opts: { raiserPosition: "BTN", openSizeBB: 3.0 } },
  { hand: "72o", pos: "BB", effBB: 35, expect: "fold", tier: "exato", ref: "Teoria padrão: 72o folda BB vs BTN 2.2x", opts: { raiserPosition: "BTN", openSizeBB: 2.2 } },
];

const ANTE_SPOTS: ExtBenchSpot[] = [
  { hand: "A5s", pos: "UTG", effBB: 30, expect: "aggro", tier: "consenso", ref: "RFI com ante 1bb — teoria padrão (UTG A5s abre)", opts: { anteBB: 1 } },
  { hand: "KTs", pos: "UTG", effBB: 35, expect: "aggro", tier: "consenso", ref: "RFI com ante 1bb — teoria padrão (UTG KTs abre)", opts: { anteBB: 1 } },
  { hand: "A9o", pos: "CO", effBB: 30, expect: "aggro", tier: "consenso", ref: "RFI com ante 1bb — teoria padrão (CO A9o abre)", opts: { anteBB: 1 } },
  { hand: "K9s", pos: "CO", effBB: 40, expect: "aggro", tier: "consenso", ref: "RFI com ante 1bb — teoria padrão (CO K9s abre)", opts: { anteBB: 1 } },
  { hand: "Q9s", pos: "CO", effBB: 45, expect: "aggro", tier: "consenso", ref: "RFI com ante 1bb — teoria padrão (CO Q9s abre)", opts: { anteBB: 1 } },
  { hand: "J8s", pos: "BTN", effBB: 30, expect: "aggro", tier: "consenso", ref: "RFI com ante 1bb — teoria padrão (BTN J8s abre)", opts: { anteBB: 1 } },
  { hand: "T8s", pos: "BTN", effBB: 35, expect: "aggro", tier: "consenso", ref: "RFI com ante 1bb — teoria padrão (BTN T8s abre)", opts: { anteBB: 1 } },
  { hand: "A8o", pos: "BTN", effBB: 40, expect: "aggro", tier: "consenso", ref: "RFI com ante 1bb — teoria padrão (BTN A8o abre)", opts: { anteBB: 1 } },
  { hand: "K7s", pos: "BTN", effBB: 45, expect: "aggro", tier: "consenso", ref: "RFI com ante 1bb — teoria padrão (BTN K7s abre)", opts: { anteBB: 1 } },
  { hand: "72o", pos: "UTG", effBB: 30, expect: "fold", tier: "exato", ref: "RFI com ante 1bb — lixo absoluto segue fold UTG", opts: { anteBB: 1 } },
  { hand: "82o", pos: "UTG", effBB: 40, expect: "fold", tier: "exato", ref: "RFI com ante 1bb — lixo absoluto segue fold UTG", opts: { anteBB: 1 } },
  { hand: "62o", pos: "CO", effBB: 45, expect: "fold", tier: "exato", ref: "RFI com ante 1bb — lixo absoluto segue fold CO", opts: { anteBB: 1 } },
];

export const EXTERNAL_SPOTS: ExtBenchSpot[] = [
  ...premiumJams(),
  ...trashFoldsEarly(),
  ...NASH_JAMS,
  ...NASH_FOLDS,
  ...BB_DEFENSE,
  ...deepRfiSpots(),
  ...mediumDeepBlindDefense(),
  ...facingThreeBetSpots(),
  ...OPEN_SIZE_SENSITIVITY,
  ...ANTE_SPOTS,
];

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
  byTier: Record<Tier, { total: number; matched: number; score: number }>;
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

export function externalBenchmarkSummary(): string {
  const r = runExternalBenchmark();
  const pct = Math.round(r.score * 100);
  return `Testado contra referência independente em ${r.total} spots pré-flop: bate em ${pct}%.`;
}

export { actionFamily };

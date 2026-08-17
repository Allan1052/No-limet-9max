// ---------------------------------------------------------------------------
// SELO DE CONFIANÇA — Banco de calibração GTO do pré-flop.
//
// A promessa "equity real" só vira NOTA 10 quando dá pra PROVAR que a decisão
// do motor bate com a teoria estabelecida. O motor de EQUITY já é validado
// contra números exatos (AA vs KK = 82% etc., em engine/equity.test.ts). Aqui
// validamos as DECISÕES: um conjunto curado de spots onde a jogada GTO é
// consensual (aberturas RFI por posição, push/fold curto, defesa vs abertura,
// resposta a 3-bet). Cada spot tem a FAMÍLIA de jogada esperada:
//
//   • "aggro"  → precisa ser raise/jam/3bet (mão de valor/abertura clara)
//   • "fold"   → precisa foldar (lixo claro)
//   • "defend" → precisa NÃO foldar (call OU raise — GTO mistura, então o pino
//                honesto é "continua")
//
// O placar de concordância (agreementScore) é o número que o app pode exibir:
// "o motor bate com o GTO em X% dos spots-referência". Curado e EXPANSÍVEL —
// quanto mais spots, mais forte o selo. Um spot que o motor erra ou revela um
// leak real (valioso) ou uma entrada ruim do banco (corrige-se).
// ---------------------------------------------------------------------------

import { cardsFromString, seededRng } from "../../engine/cards";
import { preflopDecision, type PreflopContext } from "../preflop";
import { BASELINE_PROFILE } from "../../bots/profiles";

type Family = "aggro" | "fold" | "defend";
type Pos = PreflopContext["heroPosition"];

export interface BenchSpot {
  hand: string; // handType, ex.: "AA", "AKs", "72o"
  pos: Pos;
  effBB: number;
  expect: Family;
  note: string;
  opts?: Partial<PreflopContext>;
}

/** handType ("AKs"/"72o"/"AA") → string de 2 cartas ("AsKs"/"7s2h"/"AsAh"). */
export function handTypeToCards(ht: string): string {
  const hi = ht[0];
  const lo = ht[1];
  if (hi === lo) return `${hi}s${lo}h`; // par
  const suited = ht.endsWith("s");
  return suited ? `${hi}s${lo}s` : `${hi}s${lo}h`;
}

/** Família da ação do motor. */
export function actionFamily(action: string): Family {
  if (action === "raise" || action === "jam" || action === "3bet") return "aggro";
  if (action === "fold") return "fold";
  return "defend"; // call/limp
}

/** Um spot "bate" se a família do motor está no conjunto aceito pela referência. */
export function matches(expect: Family, action: string): boolean {
  const fam = actionFamily(action);
  if (expect === "fold") return fam === "fold";
  if (expect === "aggro") return fam === "aggro";
  return fam !== "fold"; // "defend": qualquer coisa menos foldar
}

// ---------------------------------------------------------------------------
// O BANCO. Spots de consenso — evitando de propósito as fronteiras que o GTO
// mistura muito (ex.: JJ/AQs vs 3-bet OOP), onde "certo" é ambíguo.
// ---------------------------------------------------------------------------
export const GTO_SPOTS: BenchSpot[] = [
  // ---- RFI 100bb: abertura por posição (sem raiser na frente) ----
  // UTG abre apertado (~top 12-15%).
  { hand: "AA", pos: "UTG", effBB: 100, expect: "aggro", note: "UTG abre AA" },
  { hand: "KK", pos: "UTG", effBB: 100, expect: "aggro", note: "UTG abre KK" },
  { hand: "QQ", pos: "UTG", effBB: 100, expect: "aggro", note: "UTG abre QQ" },
  { hand: "JJ", pos: "UTG", effBB: 100, expect: "aggro", note: "UTG abre JJ" },
  { hand: "TT", pos: "UTG", effBB: 100, expect: "aggro", note: "UTG abre TT" },
  { hand: "AKs", pos: "UTG", effBB: 100, expect: "aggro", note: "UTG abre AKs" },
  { hand: "AKo", pos: "UTG", effBB: 100, expect: "aggro", note: "UTG abre AKo" },
  { hand: "AQs", pos: "UTG", effBB: 100, expect: "aggro", note: "UTG abre AQs" },
  { hand: "72o", pos: "UTG", effBB: 100, expect: "fold", note: "UTG folda 72o" },
  { hand: "J4o", pos: "UTG", effBB: 100, expect: "fold", note: "UTG folda J4o" },
  { hand: "K5o", pos: "UTG", effBB: 100, expect: "fold", note: "UTG folda K5o" },
  { hand: "96o", pos: "UTG", effBB: 100, expect: "fold", note: "UTG folda 96o" },
  { hand: "Q7o", pos: "UTG", effBB: 100, expect: "fold", note: "UTG folda Q7o" },

  // CO abre mais largo (~25-30%).
  { hand: "99", pos: "CO", effBB: 100, expect: "aggro", note: "CO abre 99" },
  { hand: "88", pos: "CO", effBB: 100, expect: "aggro", note: "CO abre 88" },
  { hand: "AJo", pos: "CO", effBB: 100, expect: "aggro", note: "CO abre AJo" },
  { hand: "KQo", pos: "CO", effBB: 100, expect: "aggro", note: "CO abre KQo" },
  { hand: "A9s", pos: "CO", effBB: 100, expect: "aggro", note: "CO abre A9s" },
  { hand: "KTs", pos: "CO", effBB: 100, expect: "aggro", note: "CO abre KTs" },
  { hand: "T9s", pos: "CO", effBB: 100, expect: "aggro", note: "CO abre T9s" },
  { hand: "72o", pos: "CO", effBB: 100, expect: "fold", note: "CO folda 72o" },
  { hand: "J5o", pos: "CO", effBB: 100, expect: "fold", note: "CO folda J5o" },
  { hand: "84o", pos: "CO", effBB: 100, expect: "fold", note: "CO folda 84o" },

  // BTN abre muito largo (~45%).
  { hand: "A2s", pos: "BTN", effBB: 100, expect: "aggro", note: "BTN abre A2s" },
  { hand: "K7s", pos: "BTN", effBB: 100, expect: "aggro", note: "BTN abre K7s" },
  { hand: "Q9s", pos: "BTN", effBB: 100, expect: "aggro", note: "BTN abre Q9s" },
  { hand: "J8s", pos: "BTN", effBB: 100, expect: "aggro", note: "BTN abre J8s" },
  { hand: "T8s", pos: "BTN", effBB: 100, expect: "aggro", note: "BTN abre T8s" },
  { hand: "54s", pos: "BTN", effBB: 100, expect: "aggro", note: "BTN abre 54s" },
  { hand: "A8o", pos: "BTN", effBB: 100, expect: "aggro", note: "BTN abre A8o" },
  { hand: "KTo", pos: "BTN", effBB: 100, expect: "aggro", note: "BTN abre KTo" },
  { hand: "55", pos: "BTN", effBB: 100, expect: "aggro", note: "BTN abre 55" },
  { hand: "22", pos: "BTN", effBB: 100, expect: "aggro", note: "BTN abre 22" },
  { hand: "72o", pos: "BTN", effBB: 100, expect: "fold", note: "BTN folda 72o" },
  { hand: "82o", pos: "BTN", effBB: 100, expect: "fold", note: "BTN folda 82o" },
  { hand: "J2o", pos: "BTN", effBB: 100, expect: "fold", note: "BTN folda J2o" },

  // ---- Push/fold curto (≤10bb): jam ou fold ----
  { hand: "AA", pos: "UTG", effBB: 10, expect: "aggro", note: "UTG 10bb jama AA" },
  { hand: "KK", pos: "UTG", effBB: 10, expect: "aggro", note: "UTG 10bb jama KK" },
  { hand: "AKs", pos: "UTG", effBB: 10, expect: "aggro", note: "UTG 10bb jama AKs" },
  { hand: "TT", pos: "UTG", effBB: 10, expect: "aggro", note: "UTG 10bb jama TT" },
  { hand: "72o", pos: "UTG", effBB: 10, expect: "fold", note: "UTG 10bb folda 72o" },
  { hand: "K4o", pos: "UTG", effBB: 10, expect: "fold", note: "UTG 10bb folda K4o" },
  { hand: "AA", pos: "BTN", effBB: 10, expect: "aggro", note: "BTN 10bb jama AA" },
  { hand: "ATo", pos: "BTN", effBB: 10, expect: "aggro", note: "BTN 10bb jama ATo" },
  { hand: "KQo", pos: "BTN", effBB: 10, expect: "aggro", note: "BTN 10bb jama KQo" },
  { hand: "A5s", pos: "BTN", effBB: 10, expect: "aggro", note: "BTN 10bb jama A5s" },
  { hand: "66", pos: "BTN", effBB: 10, expect: "aggro", note: "BTN 10bb jama 66" },
  { hand: "72o", pos: "BTN", effBB: 10, expect: "fold", note: "BTN 10bb folda 72o" },
  { hand: "83o", pos: "BTN", effBB: 10, expect: "fold", note: "BTN 10bb folda 83o" },

  // ---- Defesa vs abertura (100bb): BB/SB enfrentam raiser ----
  { hand: "AA", pos: "BB", effBB: 100, expect: "aggro", note: "BB 3bet AA vs BTN", opts: { raiserPosition: "BTN", openSizeBB: 2.5 } },
  { hand: "KK", pos: "BB", effBB: 100, expect: "aggro", note: "BB 3bet KK vs BTN", opts: { raiserPosition: "BTN", openSizeBB: 2.5 } },
  { hand: "AKs", pos: "BB", effBB: 100, expect: "aggro", note: "BB 3bet AKs vs BTN", opts: { raiserPosition: "BTN", openSizeBB: 2.5 } },
  { hand: "72o", pos: "BB", effBB: 100, expect: "fold", note: "BB folda 72o vs UTG", opts: { raiserPosition: "UTG", openSizeBB: 2.5 } },
  { hand: "J4o", pos: "BB", effBB: 100, expect: "fold", note: "BB folda J4o vs UTG", opts: { raiserPosition: "UTG", openSizeBB: 2.5 } },
  { hand: "QJs", pos: "BB", effBB: 100, expect: "defend", note: "BB defende QJs vs BTN", opts: { raiserPosition: "BTN", openSizeBB: 2.5 } },
  { hand: "T9s", pos: "BB", effBB: 100, expect: "defend", note: "BB defende T9s vs BTN", opts: { raiserPosition: "BTN", openSizeBB: 2.5 } },

  // ---- vs 3-bet (herói abriu, leva 3-bet): 4-bet de valor ou fold ----
  { hand: "AA", pos: "CO", effBB: 100, expect: "aggro", note: "CO 4bet AA vs 3bet", opts: { raiserPosition: "BTN", openSizeBB: 8, threeBet: true, betLevelFaced: 2 } },
  { hand: "KK", pos: "CO", effBB: 100, expect: "aggro", note: "CO 4bet KK vs 3bet", opts: { raiserPosition: "BTN", openSizeBB: 8, threeBet: true, betLevelFaced: 2 } },
  { hand: "AKs", pos: "CO", effBB: 100, expect: "aggro", note: "CO 4bet AKs vs 3bet", opts: { raiserPosition: "BTN", openSizeBB: 8, threeBet: true, betLevelFaced: 2 } },
  { hand: "72o", pos: "CO", effBB: 100, expect: "fold", note: "CO folda 72o vs 3bet", opts: { raiserPosition: "BTN", openSizeBB: 8, threeBet: true, betLevelFaced: 2 } },
  { hand: "KJo", pos: "CO", effBB: 100, expect: "fold", note: "CO folda KJo vs 3bet", opts: { raiserPosition: "BTN", openSizeBB: 8, threeBet: true, betLevelFaced: 2 } },
];

export interface CalibrationResult {
  total: number;
  matched: number;
  score: number; // 0..1
  misses: Array<{ note: string; expect: Family; got: string }>;
}

/** Roda o motor em cada spot e mede a concordância com a referência GTO. */
export function runCalibration(spots: BenchSpot[] = GTO_SPOTS): CalibrationResult {
  let matched = 0;
  const misses: CalibrationResult["misses"] = [];
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
    if (matches(s.expect, d.action)) matched++;
    else misses.push({ note: s.note, expect: s.expect, got: d.action });
  }
  return { total: spots.length, matched, score: matched / spots.length, misses };
}

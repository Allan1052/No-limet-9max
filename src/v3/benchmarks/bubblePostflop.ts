import type { EvidenceSource } from "../evidence";

export interface BubblePostflopBenchmark {
  id: string;
  stage: "BUBBLE";
  fieldSize: 1000;
  heroPosition: "BTN";
  heroStackBB: 18;
  villainPosition: "BB";
  villainStackBB: 26;
  board: string;

  btnEquity?: number;
  bbEquity?: number;
  btnEquityGreaterThan?: number;
  btnEvShare?: number;
  btnCbetPattern?:
    | "BASICALLY_MIN_BETS_ENTIRE_RANGE"
    | "CONSIDERABLY_LESS_OFTEN_THAN_A62";
  btnCbetFreq?: undefined;

  btnForcedCheckCbetApprox?: number;
  btnEarlierForcedCheckCbet?: number;
  bbDonkFreqApprox?: number;
  bbDonkSizePot?: number;

  btnHasSlightEquityAdvantage?: true;
  bbEvShareApprox?: number;
  bbEquilibriumLeadFreq?: number;
  btnExploitCheckbackFreqVsNeverDonk?: number;

  completeHandMatrix: false;
  handActionFreq?: undefined;
  evidence: EvidenceSource;
  notes: string[];
}

const SOURCE_NOTE =
  "GTO Wizard — Short Stack Stealing on the Bubble (2024-11-05)";

const evidence = (): EvidenceSource => ({
  level: "CERTIFIED",
  solver: "GTO_WIZARD",
  note: SOURCE_NOTE,
});

export const BUBBLE_POSTFLOP_BENCHMARKS: BubblePostflopBenchmark[] = [
  {
    id: "BPF1_BTN18_BB26_A62",
    stage: "BUBBLE",
    fieldSize: 1000,
    heroPosition: "BTN",
    heroStackBB: 18,
    villainPosition: "BB",
    villainStackBB: 26,
    board: "As6d2d",
    btnEquity: 0.685,
    bbEquity: 0.315,
    btnCbetPattern: "BASICALLY_MIN_BETS_ENTIRE_RANGE",
    completeHandMatrix: false,
    evidence: evidence(),
    notes: [
      "Published BTN range equity is 68.5% versus BB 31.5% on A♠6♦2♦.",
      "The source describes BTN as basically min-betting its entire range when checked to; no exact c-bet frequency is inferred.",
    ],
  },
  {
    id: "BPF2_BTN18_BB26_AQ2",
    stage: "BUBBLE",
    fieldSize: 1000,
    heroPosition: "BTN",
    heroStackBB: 18,
    villainPosition: "BB",
    villainStackBB: 26,
    board: "AsQh2d",
    btnEquityGreaterThan: 0.74,
    btnEvShare: 0.85,
    btnCbetPattern: "CONSIDERABLY_LESS_OFTEN_THAN_A62",
    completeHandMatrix: false,
    evidence: evidence(),
    notes: [
      "Published BTN equity is greater than 74% and BTN captures 85% of EV on A♠Q♥2♦.",
      "The source says BTN c-bets considerably less often than on A♠6♦2♦; no exact c-bet frequency is inferred.",
    ],
  },
  {
    id: "BPF3_BTN18_BB26_853",
    stage: "BUBBLE",
    fieldSize: 1000,
    heroPosition: "BTN",
    heroStackBB: 18,
    villainPosition: "BB",
    villainStackBB: 26,
    board: "8d5h3h",
    btnEquityGreaterThan: 0.55,
    btnForcedCheckCbetApprox: 0.12,
    btnEarlierForcedCheckCbet: 0.63,
    bbDonkFreqApprox: 0.5,
    bbDonkSizePot: 0.2,
    completeHandMatrix: false,
    evidence: evidence(),
    notes: [
      "Published BTN equity is greater than 55% on 8♦5♥3♥.",
      "When BB is forced to check, BTN c-bets about 12% near the bubble versus 63% earlier in the tournament.",
      "In equilibrium BB donks about half its range for 20% pot; the forced-check BTN frequency is a separate simplification, not the equilibrium baseline.",
    ],
  },
  {
    id: "BPF4_BTN18_BB26_854",
    stage: "BUBBLE",
    fieldSize: 1000,
    heroPosition: "BTN",
    heroStackBB: 18,
    villainPosition: "BB",
    villainStackBB: 26,
    board: "8d5h4h",
    btnHasSlightEquityAdvantage: true,
    bbEvShareApprox: 0.58,
    bbEquilibriumLeadFreq: 1,
    btnExploitCheckbackFreqVsNeverDonk: 1,
    completeHandMatrix: false,
    evidence: evidence(),
    notes: [
      "Published BTN range has a slight equity advantage while BB captures nearly 58% of EV on 8♦5♥4♥.",
      "The equilibrium BB strategy leads its entire range.",
      "If BB is constrained to never donk, BTN can best-respond by checking back its entire range; this is an exploit/forced-strategy result, not the equilibrium baseline.",
    ],
  },
];

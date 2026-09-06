import type { ExternalBenchmarkFixture } from "./types";

// ---------------------------------------------------------------------------
// Fixtures PRÉ-FLOP de STACK CURTO sob ICM (bolha / mesa final, <10bb),
// transcritos do artigo "Playing Under 10bb – Part 2: ICM" (GTO Wizard) via o
// molde. Contexto completo + células PURAS => LIVE_READY.
//
// Nota honesta: são spots de ICM. Nas células PURAS de RFI (shove forte / fold
// lixo) o V2 já bate (chipEV coincide). No BB 4bb vs UTG open (mesa final) o V2
// empurra mais largo que o solver — divergência DIRIGIDA POR ICM, não bug cru;
// será o V3 (com a premiação) a dar a resposta certa ao ligar no live.
// ---------------------------------------------------------------------------
export const ICM_SHORT_STACK_FIXTURES: ExternalBenchmarkFixture[] = [
  {
    id: "BUB1_HJ8_RFI_PURE",
    node: "HJ_RFI",
    evidence: { level: "CERTIFIED", solver: "GTO_WIZARD", note: "Artigo 'Playing Under 10bb – Part 2: ICM', imagens 1-2 (setup + grade ICM do HJ 8bb)" },
    context: {
      format: "VANILLA", stage: "BUBBLE",
      positions: ["UTG", "UTG1", "LJ", "HJ", "CO", "BTN", "SB", "BB"],
      stacksBB: { UTG: 32, UTG1: 14, LJ: 29, HJ: 8, CO: 17, BTN: 23, SB: 10.5, BB: 25 },
      effectiveStackBB: 8,
      coverage: [
        { covers: "UTG", covered: "HJ" }, { covers: "UTG1", covered: "HJ" },
        { covers: "LJ", covered: "HJ" }, { covers: "CO", covered: "HJ" },
        { covers: "BTN", covered: "HJ" }, { covers: "SB", covered: "HJ" },
        { covers: "BB", covered: "HJ" },
      ],
    },
    priorActions: [],
    tolerance: 0.005,
    handActionFreq: {
      AKs: { shove: 1 }, AQs: { shove: 1 }, AKo: { shove: 1 },
      KK: { shove: 1 }, QQ: { shove: 1 }, JJ: { shove: 1 }, TT: { shove: 1 },
      "72o": { fold: 1 }, "62o": { fold: 1 }, "52o": { fold: 1 }, "42o": { fold: 1 }, "32o": { fold: 1 },
    },
    notes: [
      "Ante 1bb. Risk Premium do short (8bb): 18.9%. Shove global ICM ~12% (barra parcial, fica em nota).",
      "AA omitido de propósito: o texto diz que prefere induzir com open não-all-in.",
      "Só células inequivocamente puras; fronteiras/misturas omitidas.",
    ],
  },
  {
    id: "BUB2_CO4_RFI_PURE",
    node: "CO_RFI",
    evidence: { level: "CERTIFIED", solver: "GTO_WIZARD", note: "Artigo 'Playing Under 10bb – Part 2: ICM', imagens 3-4 (setup + grade ICM do CO 4bb)" },
    context: {
      format: "VANILLA", stage: "BUBBLE",
      positions: ["UTG", "UTG1", "LJ", "HJ", "CO", "BTN", "SB", "BB"],
      stacksBB: { UTG: 24, UTG1: 18, LJ: 22, HJ: 50, CO: 4, BTN: 12, SB: 13.5, BB: 15 },
      effectiveStackBB: 4,
      coverage: [
        { covers: "UTG", covered: "CO" }, { covers: "UTG1", covered: "CO" },
        { covers: "LJ", covered: "CO" }, { covers: "HJ", covered: "CO" },
        { covers: "BTN", covered: "CO" }, { covers: "SB", covered: "CO" },
        { covers: "BB", covered: "CO" },
      ],
    },
    priorActions: [],
    tolerance: 0.005,
    handActionFreq: {
      AKs: { shove: 1 }, AQs: { shove: 1 }, AKo: { shove: 1 },
      KK: { shove: 1 }, QQ: { shove: 1 }, JJ: { shove: 1 }, TT: { shove: 1 },
      "72o": { fold: 1 }, "62o": { fold: 1 }, "52o": { fold: 1 }, "42o": { fold: 1 }, "32o": { fold: 1 },
    },
    notes: ["Ante 1bb. Risk Premium do CO: 19.2%. Só células puras; fronteiras omitidas."],
  },
  {
    id: "FT_BB4_VS_UTG2_PURE",
    node: "BB_VS_UTG_RAISE",
    evidence: { level: "CERTIFIED", solver: "GTO_WIZARD", note: "Artigo 'Playing Under 10bb – Part 2: ICM', imagens 28-29; solução expõe stacks e preflop_actions R2-F-F-F-F-F-F-C" },
    context: {
      format: "VANILLA", stage: "FINAL_TABLE",
      positions: ["UTG", "UTG1", "LJ", "HJ", "CO", "BTN", "SB", "BB"],
      stacksBB: { UTG: 17.125, UTG1: 35.125, LJ: 48.125, HJ: 24.125, CO: 39.125, BTN: 45.125, SB: 22.125, BB: 4.125 },
      effectiveStackBB: 4.125,
      coverage: [
        { covers: "UTG", covered: "BB" }, { covers: "UTG1", covered: "BB" },
        { covers: "LJ", covered: "BB" }, { covers: "HJ", covered: "BB" },
        { covers: "CO", covered: "BB" }, { covers: "BTN", covered: "BB" },
        { covers: "SB", covered: "BB" },
      ],
    },
    priorActions: ["UTG_RAISE_2"],
    tolerance: 0.005,
    handActionFreq: {
      AKs: { shove: 1 }, AQs: { shove: 1 }, AJs: { shove: 1 }, AKo: { shove: 1 }, AQo: { shove: 1 },
      KK: { shove: 1 }, QQ: { shove: 1 }, JJ: { shove: 1 }, TT: { shove: 1 },
      KJs: { call: 1 }, KTs: { call: 1 }, QJs: { call: 1 }, QTs: { call: 1 }, JTs: { call: 1 }, T9s: { call: 1 }, "98s": { call: 1 },
      K9o: { fold: 1 }, Q8o: { fold: 1 }, J8o: { fold: 1 }, T8o: { fold: 1 },
      "72o": { fold: 1 }, "62o": { fold: 1 }, "52o": { fold: 1 }, "42o": { fold: 1 }, "32o": { fold: 1 },
    },
    notes: [
      "BB 4.125bb (título arredonda pra 4bb). Open de UTG = 2bb. Mesa final.",
      "Células com divisão de cor omitidas; só regiões visualmente puras.",
      "ICM: V2 (chipEV) empurra mais largo que o solver aqui — divergência dirigida por ICM.",
    ],
  },
];

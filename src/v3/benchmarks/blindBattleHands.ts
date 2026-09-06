import type { ExternalBenchmarkFixture } from "./types";

// ---------------------------------------------------------------------------
// Biblioteca de fixtures PRÉ-FLOP com dado MÃO-A-MÃO (schema ExternalBenchmark),
// transcritos do GTO Wizard via o molde de transcrição. É esta lista que cresce
// conforme o ChatGPT alimenta spots — e que o auditor "V2 × gabarito" varre.
//
// Regra: só entra aqui o que passa no validateCertifiedFixture (o teste cobra).
// Barra global (actionFreq) é opcional; o que dirige o live são as células.
// ---------------------------------------------------------------------------
export const BLIND_BATTLE_HAND_FIXTURES: ExternalBenchmarkFixture[] = [
  {
    id: "FTBB4",
    node: "BB_VS_SB_RAISE",
    evidence: {
      level: "CERTIFIED",
      solver: "GTO_WIZARD",
      note: "Artigo 'ICM and Blind Battles: The Big Blind', imagem 5",
    },
    context: {
      format: "VANILLA",
      stage: "FINAL_TABLE",
      positions: ["SB", "BB"],
      stacksBB: { SB: 20, BB: 20 },
      effectiveStackBB: 20,
      coverage: [],
    },
    priorActions: ["SB_RAISE_3"],
    tolerance: 0.005,
    handActionFreq: {
      AA: { raise: 1 },
      AKs: { raise: 1 },
      AQs: { raise: 1 },
      AKo: { shove: 1 },
      AQo: { shove: 1 },
      AJo: { shove: 1 },
      TT: { call: 1 },
      "94s": { fold: 1 },
      "93s": { fold: 1 },
      "92s": { fold: 1 },
      "84s": { fold: 1 },
      "83s": { fold: 1 },
      "82s": { fold: 1 },
      "73s": { fold: 1 },
      "72s": { fold: 1 },
      "62s": { fold: 1 },
    },
    notes: [
      "Somente células visualmente inteiras foram tratadas como puras.",
      "Células com mais de uma cor foram omitidas (sem frequência numérica legível).",
      "Vermelho-claro = 3-bet não all-in; vermelho-escuro = shove; verde = call; azul = fold.",
      "Tamanho do 3-bet não all-in não legível: actionSizing omitido.",
      "Barra global do node não exposta numericamente nesta imagem: actionFreq omitido.",
    ],
  },
  {
    id: "BUB3_LJ8_VS_UTG1_SHOVE",
    node: "LJ_VS_UTG1_SHOVE",
    evidence: {
      level: "CERTIFIED",
      solver: "GTO_WIZARD",
      note: "Artigo 'Playing Under 10bb – Part 2: ICM', imagens 26-28",
    },
    context: {
      format: "VANILLA",
      stage: "BUBBLE",
      positions: ["UTG1", "LJ"],
      stacksBB: { UTG1: 11, LJ: 8 },
      effectiveStackBB: 8,
      coverage: [{ covers: "UTG1", covered: "LJ" }],
    },
    priorActions: ["UTG1_SHOVE"],
    tolerance: 0.005,
    handActionFreq: {
      TT: { fold: 1 },
      AQs: { fold: 1 },
    },
    notes: [
      "TT e AQs são folds explicitamente declarados pelo texto (não inferidos pela cor).",
      "LJ ~15% de Risk Premium contra cada jogador → ~65% de equity exigida antes do dead money.",
      "Só as duas células explicitamente certificadas pelo texto entraram.",
      "É spot de BOLHA/ICM: auditar contra o V2 exige a estrutura de premiação (payouts); sem ela, a comparação seria chipEV e não bate com a decisão sob ICM.",
    ],
  },
];

import type { ExternalBenchmarkFixture } from "./types";

// ---------------------------------------------------------------------------
// BANCO DE EVIDÊNCIAS — fixtures CERTIFICADOS pela fonte (GTO Wizard) porém com
// contexto incompleto e/ou sem célula pura por mão. São guardados pra referência
// e pra completar depois, mas NUNCA dirigem o live (regra do Allan/ChatGPT:
// "quantidade de material não pode diminuir a qualidade do motor").
//
// O auditor e o bridge NÃO consomem esta lista — só a biblioteca live-ready.
// Cada item, quando completado (stacks + células), migra pra blindBattleHands.
// ---------------------------------------------------------------------------
export const EVIDENCE_BANK: ExternalBenchmarkFixture[] = [
  {
    id: "BUB1_HJ8_RFI",
    node: "HJ_RFI",
    evidence: { level: "CERTIFIED", solver: "GTO_WIZARD", note: "Artigo 'Playing Under 10bb – Part 2: ICM', imagens 1-2" },
    context: {
      format: "VANILLA", stage: "BUBBLE",
      positions: ["UTG", "UTG1", "LJ", "HJ", "CO", "BTN", "SB", "BB"],
      stacksBB: { UTG: 32, UTG1: 14, LJ: 29, HJ: 8, CO: 17, BTN: 23, SB: 10.5, BB: 25 },
      effectiveStackBB: 8, coverage: [],
    },
    priorActions: [],
    tolerance: 0.005,
    handActionFreq: {},
    notes: [
      "Shove global ~12% sob ICM (barra parcial — não é a barra completa, por isso fica em notes, não em actionFreq).",
      "ChipEV comparativo ~30% (não faz parte da estratégia certificada).",
      "AA prefere induzir ação (texto).",
      "Grade com múltiplos tons de vermelho: sem frequência numérica pra distinguir shove puro de open não-all-in — nenhuma célula promovida.",
      "Ante 1bb. Todos cobrem o HJ.",
    ],
  },
  {
    id: "BUB2_CO4_RFI",
    node: "CO_RFI",
    evidence: { level: "CERTIFIED", solver: "GTO_WIZARD", note: "Artigo 'Playing Under 10bb – Part 2: ICM', imagens 3-4" },
    context: {
      format: "VANILLA", stage: "BUBBLE",
      positions: ["UTG", "UTG1", "LJ", "HJ", "CO", "BTN", "SB", "BB"],
      stacksBB: { UTG: 24, UTG1: 18, LJ: 22, HJ: 50, CO: 4, BTN: 12, SB: 13.5, BB: 15 },
      effectiveStackBB: 4, coverage: [],
    },
    priorActions: [],
    tolerance: 0.005,
    handActionFreq: {},
    notes: [
      "CO short 4bb. Ante 1bb. Risk Premium do CO ~19.2%.",
      "CO shova mais amplo que o HJ de 8bb do exemplo anterior.",
      "Sem conversão de células só pela cor — pureza/frequência não inequívocas.",
    ],
  },
  {
    id: "BUB4_HJ8_VS_OPEN",
    node: "HJ_VS_OPEN",
    evidence: { level: "CERTIFIED", solver: "GTO_WIZARD", note: "Artigo 'Playing Under 10bb – Part 2: ICM', imagens 31-32" },
    context: {
      format: "VANILLA", stage: "BUBBLE",
      positions: ["OPENER", "HJ"], stacksBB: { HJ: 8 }, effectiveStackBB: 8, coverage: [],
    },
    priorActions: ["OPEN_2BB"],
    tolerance: 0.005,
    handActionFreq: {},
    notes: [
      "HJ sempre SHOVA quando decide continuar (linear, mãos mais fortes).",
      "'always shove' = tipo de ação das mãos que entram, não 100% das 169 mãos.",
      "Composição das células não promovida (imagem sem resolução suficiente).",
      "Falta o stack do OPENER e dos demais — não usar como contexto live exato.",
    ],
  },
  {
    id: "FT8_BB8_VS_UTG_OPEN",
    node: "BB_VS_UTG_OPEN",
    evidence: { level: "CERTIFIED", solver: "GTO_WIZARD", note: "Artigo 'Playing Under 10bb – Part 2: ICM', imagens 39-40" },
    context: {
      format: "VANILLA", stage: "FINAL_TABLE",
      positions: ["UTG", "BB"], stacksBB: { BB: 8 }, effectiveStackBB: 8, coverage: [],
    },
    priorActions: ["UTG_RAISE_2BB"],
    tolerance: 0.005,
    handActionFreq: {},
    notes: [
      "Defesa muito mais tight que ChipEV; suited fracas somem da defesa.",
      "Faltam o stack completo de UTG e os demais — não promover pro matching live.",
    ],
  },
];

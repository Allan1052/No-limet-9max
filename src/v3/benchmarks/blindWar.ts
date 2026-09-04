import type { ExternalBenchmarkFixture } from "./types";

const source = (timestamp: string) => ({
  level: "CERTIFIED" as const,
  solver: "GTO_WIZARD" as const,
  videoId: "YwMJwdM4Msc",
  timestamp,
});

export const BLIND_WAR_BENCHMARKS: ExternalBenchmarkFixture[] = [
  {
    id: "BW1",
    node: "SB_RFI",
    evidence: source("00:20-00:55"),
    context: {
      format: "PKO",
      fieldRemainingPct: 50,
      positions: ["SB", "BB"],
      stacksBB: { SB: 33, BB: 20 },
      effectiveStackBB: 20,
      coverage: [{ covers: "SB", covered: "BB" }],
    },
    priorActions: [],
    actionFreq: { shove: 0.180, raise: 0.250, limp: 0.439, fold: 0.131 },
    tolerance: 0.005,
  },
  {
    id: "BW2",
    node: "BB_VS_SB_LIMP",
    evidence: source("01:14-02:20"),
    context: {
      format: "PKO",
      fieldRemainingPct: 50,
      positions: ["SB", "BB"],
      stacksBB: { SB: 33, BB: 20 },
      effectiveStackBB: 20,
      coverage: [{ covers: "SB", covered: "BB" }],
    },
    priorActions: ["SB_LIMP"],
    actionFreq: { shove: 0.103, raise: 0.332, check: 0.565 },
    tolerance: 0.005,
  },
  {
    id: "BW3",
    node: "BB_VS_SB_LIMP",
    evidence: source("05:21-06:12"),
    context: {
      format: "PKO",
      fieldRemainingPct: 50,
      positions: ["SB", "BB"],
      stacksBB: { SB: 27, BB: 53 },
      effectiveStackBB: 27,
      coverage: [{ covers: "BB", covered: "SB" }],
    },
    priorActions: ["SB_LIMP"],
    actionFreq: { raise: 0.424, shove: 0.032, check: 0.544 },
    tolerance: 0.005,
    notes: ["Coverage identity is inverted relative to BW2."],
  },
  {
    id: "BW4",
    node: "SB_RFI",
    evidence: source("07:22-08:08"),
    context: {
      format: "VANILLA",
      fieldRemainingPct: 50,
      positions: ["SB", "BB"],
      stacksBB: { SB: 33, BB: 20 },
      effectiveStackBB: 20,
      coverage: [{ covers: "SB", covered: "BB" }],
    },
    priorActions: [],
    actionFreq: { shove: 0.136, raise: 0.186, limp: 0.500, fold: 0.178 },
    tolerance: 0.005,
  },
  {
    id: "BW5",
    node: "SB_RFI",
    evidence: source("32:28-33:15"),
    context: {
      format: "VANILLA",
      fieldRemainingPct: 25,
      positions: ["SB", "BB"],
      stacksBB: { SB: 40, BB: 40 },
      effectiveStackBB: 40,
      coverage: [],
    },
    priorActions: [],
    actionFreq: { shove: 0.000, raise: 0.119, limp: 0.763, fold: 0.117 },
    actionSizeBB: { raise: 3 },
    handActionFreq: {
      // Pure cells visually certified in the official GTO Wizard 40bb / 25%-field SB grid.
      T3s: { raise: 1 },
      A4s: { limp: 1 },
      "72o": { fold: 1 },
    },
    tolerance: 0.005,
    notes: [
      "High-ICM benchmark; visible frequencies sum to 99.9% due to solver rounding.",
      "Hand-level pure cells cross-checked against the official GTO Wizard article 'ICM and Blind Battles: The Small Blind', image 6 (40bb symmetric stacks, 25% field remaining). Mixed/ambiguous cells remain uncertified.",
      "Raise size is certified at R3 = 3bb for this exact node; no sizing is inferred for other Blind War fixtures.",
    ],
  },
];

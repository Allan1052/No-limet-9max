// ---------------------------------------------------------------------------
// ACELERADOR V3 — Auditor automático "V2 × gabarito" (parte 2 do acelerador).
//
// Ideia: cada fixture certificado com dado MÃO-A-MÃO é um gabarito. Este módulo
// pega esses gabaritos, constrói o MESMO spot no motor V2 e compara a decisão —
// apontando sozinho onde o V2 diverge do solver. Conforme o ChatGPT alimenta
// mais spots (via o molde de transcrição), este auditor cresce junto e vira a
// lista de "onde consertar o V2" (a trilha #1) e "onde o V3 vai agregar" (#2).
//
// É uma ferramenta de análise (não dirige nenhuma decisão no jogo). Só compara
// nós que o V2 CONSEGUE reproduzir hoje (ex.: SB_RFI). Nós que dependem de
// semântica que o V2 não tem (ex.: enfrentar um limp) saem como NOT_COMPARABLE —
// honesto, sem forçar comparação.
// ---------------------------------------------------------------------------
import { createTable } from "../../game/engine";
import { seededRng, type Card } from "../../engine/cards";
import { handTypeCombos } from "../../ranges/types";
import { preflopContextFor } from "../../bots/preflopBot";
import { preflopDecision } from "../../ranges/preflop";
import { BASELINE_PROFILE } from "../../bots/profiles";
import type { ExternalBenchmarkFixture, HandActionFreq } from "../benchmarks/types";
import { BLIND_WAR_BENCHMARKS } from "../benchmarks/blindWar";
import { BLIND_BATTLE_HAND_FIXTURES } from "../benchmarks/blindBattleHands";
import { ICM_SHORT_STACK_FIXTURES } from "../benchmarks/icmShortStack";

/** Todos os fixtures pré-flop com potencial dado mão-a-mão (o que o auditor varre). */
export const CERTIFIED_PREFLOP_FIXTURES: ExternalBenchmarkFixture[] = [
  ...BLIND_WAR_BENCHMARKS,
  ...BLIND_BATTLE_HAND_FIXTURES,
  ...ICM_SHORT_STACK_FIXTURES,
];

export type AuditStatus = "AGREE" | "DIVERGE" | "NOT_COMPARABLE";

export interface AuditRow {
  fixtureId: string;
  node: string;
  hand: string;
  certified: string; // ação certificada (pura) OU "misto:<ação principal>"
  v2: string; // ação do V2 (ou "-")
  status: AuditStatus;
  reason?: string;
}

export interface AuditSummary {
  comparableHands: number;
  agree: number;
  diverge: number;
  notComparable: number;
  rows: AuditRow[];
}

/** Ação pura certificada de uma mão (freq ~1), ou null se for mista. */
function pureCertifiedAction(mix: HandActionFreq): string | null {
  const entries = Object.entries(mix).filter(([, f]) => f > 0);
  if (entries.length === 1 && entries[0][1] >= 0.999) return entries[0][0];
  return null;
}

/** Ação de maior frequência (pra rotular mãos mistas). */
function dominantAction(mix: HandActionFreq): string {
  return Object.entries(mix).sort((a, b) => b[1] - a[1])[0][0];
}

/** Normaliza a ação do V2 para o vocabulário do solver (V2 não tem "limp"). */
function normalizeV2Action(action: string): string {
  if (action === "3bet") return "raise";
  if (action === "jam") return "shove";
  return action; // fold | raise | call | check
}

// Base: mesa SB×BB (blind battle), todos os outros fora. bb=100 fichas.
const BB_CHIPS = 100;
function blindBattleTable(eff: number, heroSeat: 7 | 8) {
  const t = createTable(
    { smallBlind: BB_CHIPS / 2, bigBlind: BB_CHIPS, ante: 0 },
    Array.from({ length: 9 }, (_, i) => ({ name: `P${i}`, stack: eff * BB_CHIPS, isHero: i === heroSeat })),
    6,
  );
  for (const p of t.players) {
    p.holeCards = [];
    p.committed = 0;
    p.totalCommitted = 0;
    if (p.seat === 7 || p.seat === 8) {
      p.status = "active";
      p.acted = false;
    } else {
      p.status = "out";
      p.acted = true;
    }
  }
  // blinds
  t.players[7].committed = BB_CHIPS / 2;
  t.players[7].totalCommitted = BB_CHIPS / 2;
  t.players[7].stack = Math.round((eff - 0.5) * BB_CHIPS);
  t.players[8].committed = BB_CHIPS;
  t.players[8].totalCommitted = BB_CHIPS;
  t.players[8].stack = (eff - 1) * BB_CHIPS;
  t.street = "preflop";
  t.buttonSeat = 6;
  t.handOver = false;
  return t;
}

/** Lê o tamanho do raise dos priorActions ("SB_RAISE_3"/"UTG_RAISE_2" -> 3/2). */
function raiseSizeFromPriors(priorActions: string[], fallback = 2.5): number {
  for (const a of priorActions) {
    const m = /_RAISE_(\d+(?:\.\d+)?)/.exec(a);
    if (m) return Number(m[1]);
  }
  return fallback;
}

/**
 * Constrói o spot no V2 e devolve a ação do V2 pra uma mão. Suporta os nós que o
 * V2 CONSEGUE reproduzir hoje: SB_RFI (SB abre) e BB_VS_SB_RAISE (BB defende o
 * open do SB). Outros nós -> null (NOT_COMPARABLE).
 */
function v2ActionForNode(fixture: ExternalBenchmarkFixture, hand: string): string | null {
  const eff = fixture.context.effectiveStackBB;
  const combo: Card[] = handTypeCombos(hand)[0];

  if (fixture.node === "SB_RFI") {
    const t = blindBattleTable(eff, 7);
    t.players[7].holeCards = combo; // SB herói
    t.currentBet = BB_CHIPS;
    t.preflopRaises = 0;
    t.lastAggressor = -1;
    t.preflopAggressor = -1;
    t.toAct = 7;
    const ctx = preflopContextFor(t, 7, BASELINE_PROFILE, {});
    ctx.rng = seededRng(20260906);
    return normalizeV2Action(preflopDecision(ctx).action);
  }

  if (fixture.node === "BB_VS_SB_RAISE") {
    const raiseTo = raiseSizeFromPriors(fixture.priorActions);
    const t = blindBattleTable(eff, 8);
    // SB abriu (raise): committed = raiseTo
    t.players[7].committed = Math.round(raiseTo * BB_CHIPS);
    t.players[7].totalCommitted = Math.round(raiseTo * BB_CHIPS);
    t.players[7].stack = Math.round((eff - raiseTo) * BB_CHIPS);
    t.players[8].holeCards = combo; // BB herói
    t.currentBet = Math.round(raiseTo * BB_CHIPS);
    t.preflopRaises = 1;
    t.lastAggressor = 7;
    t.preflopAggressor = 7;
    t.toAct = 8;
    const ctx = preflopContextFor(t, 8, BASELINE_PROFILE, {});
    ctx.rng = seededRng(20260906);
    return normalizeV2Action(preflopDecision(ctx).action);
  }

  // ----- Nós de anel completo (usam as posições/stacks do próprio fixture) -----
  // RFI de qualquer posição (ex.: HJ_RFI, CO_RFI): folded-to-hero.
  const rfiMatch = /^([A-Z0-9]+)_RFI$/.exec(fixture.node);
  if (rfiMatch) return fullRingRfi(fixture, rfiMatch[1], combo);
  // BB defendendo o open de qualquer posição (ex.: BB_VS_UTG_RAISE).
  const bbVsMatch = /^BB_VS_([A-Z0-9]+)_RAISE$/.exec(fixture.node);
  if (bbVsMatch) return fullRingBbVsOpen(fixture, bbVsMatch[1], combo);

  return null;
}

/** Monta uma mesa de anel completo a partir das posições/stacks do fixture. */
function fullRingFromFixture(fixture: ExternalBenchmarkFixture) {
  const pos = fixture.context.positions;
  const seatOf: Record<string, number> = {};
  pos.forEach((p, i) => (seatOf[p] = i));
  const btn = seatOf["BTN"] ?? pos.length - 3;
  const t = createTable(
    { smallBlind: BB_CHIPS / 2, bigBlind: BB_CHIPS, ante: 0 },
    pos.map((p) => ({ name: p, stack: Math.round((fixture.context.stacksBB[p] ?? 10) * BB_CHIPS) })),
    btn,
  );
  for (const p of t.players) {
    p.holeCards = [];
    p.committed = 0;
    p.totalCommitted = 0;
    p.status = "active";
    p.acted = false;
  }
  const sb = seatOf["SB"];
  const bb = seatOf["BB"];
  if (sb !== undefined) {
    t.players[sb].committed = BB_CHIPS / 2;
    t.players[sb].totalCommitted = BB_CHIPS / 2;
    t.players[sb].stack -= BB_CHIPS / 2;
  }
  if (bb !== undefined) {
    t.players[bb].committed = BB_CHIPS;
    t.players[bb].totalCommitted = BB_CHIPS;
    t.players[bb].stack -= BB_CHIPS;
  }
  t.street = "preflop";
  t.currentBet = BB_CHIPS;
  t.preflopRaises = 0;
  t.lastAggressor = -1;
  t.preflopAggressor = -1;
  t.buttonSeat = btn;
  t.handOver = false;
  return { t, seatOf };
}

function fullRingRfi(fixture: ExternalBenchmarkFixture, position: string, combo: Card[]): string | null {
  const { t, seatOf } = fullRingFromFixture(fixture);
  const hs = seatOf[position];
  if (hs === undefined) return null;
  // Folded-to-hero: todos ANTES do herói na ordem de ação (índice < hs) foldaram.
  for (let s = 0; s < hs; s++) {
    t.players[s].status = "folded";
    t.players[s].acted = true;
  }
  t.players[hs].holeCards = combo;
  t.toAct = hs;
  const ctx = preflopContextFor(t, hs, BASELINE_PROFILE, {});
  ctx.rng = seededRng(20260906);
  return normalizeV2Action(preflopDecision(ctx).action);
}

function fullRingBbVsOpen(fixture: ExternalBenchmarkFixture, raiser: string, combo: Card[]): string | null {
  const { t, seatOf } = fullRingFromFixture(fixture);
  const rs = seatOf[raiser];
  const hero = seatOf["BB"];
  if (rs === undefined || hero === undefined) return null;
  const raiseTo = raiseSizeFromPriors(fixture.priorActions, 2);
  t.players[rs].committed = Math.round(raiseTo * BB_CHIPS);
  t.players[rs].totalCommitted = Math.round(raiseTo * BB_CHIPS);
  t.players[rs].stack = Math.round(((fixture.context.stacksBB[raiser] ?? 10) - raiseTo) * BB_CHIPS);
  for (const p of t.players) {
    if (p.seat !== rs && p.seat !== hero) {
      p.status = "folded";
      p.acted = true;
    }
  }
  t.players[hero].holeCards = combo;
  t.currentBet = Math.round(raiseTo * BB_CHIPS);
  t.preflopRaises = 1;
  t.lastAggressor = rs;
  t.preflopAggressor = rs;
  t.toAct = hero;
  const ctx = preflopContextFor(t, hero, BASELINE_PROFILE, {});
  ctx.rng = seededRng(20260906);
  return normalizeV2Action(preflopDecision(ctx).action);
}

/** Audita um único fixture (com dado mão-a-mão) contra o V2. */
export function auditFixtureAgainstV2(fixture: ExternalBenchmarkFixture): AuditRow[] {
  const rows: AuditRow[] = [];
  if (!fixture.handActionFreq) return rows;

  for (const [hand, mix] of Object.entries(fixture.handActionFreq) as Array<[string, HandActionFreq]>) {
    const pure = pureCertifiedAction(mix);
    const certifiedLabel = pure ?? `misto:${dominantAction(mix)}`;
    const v2 = v2ActionForNode(fixture, hand);

    if (v2 === null) {
      const isShoveNode = /SHOVE/i.test(fixture.node);
      rows.push({
        fixtureId: fixture.id,
        node: fixture.node,
        hand,
        certified: certifiedLabel,
        v2: "-",
        status: "NOT_COMPARABLE",
        reason: isShoveNode
          ? `Nó "${fixture.node}" é defesa contra all-in sob ICM: comparar com o V2 exige a estrutura de premiação (payouts), que o fixture não traz.`
          : `O V2 ainda não reproduz o nó "${fixture.node}" nesta versão do auditor.`,
      });
      continue;
    }

    if (pure === null) {
      // Célula mista certificada: o V2 dá uma resposta única — registramos como
      // não-comparável direto (é material pra trilha #2, estratégia mista).
      rows.push({
        fixtureId: fixture.id,
        node: fixture.node,
        hand,
        certified: certifiedLabel,
        v2,
        status: "NOT_COMPARABLE",
        reason: "Célula MISTA no solver (frequências) — o V2 só sabe dar uma resposta. Material pra estratégia mista (#2).",
      });
      continue;
    }

    const agree = v2 === pure;
    rows.push({
      fixtureId: fixture.id,
      node: fixture.node,
      hand,
      certified: pure,
      v2,
      status: agree ? "AGREE" : "DIVERGE",
      reason: agree
        ? undefined
        : pure === "limp"
          ? "O solver dá LIMP; o V2 não sabe limpar (aumenta ou folda)."
          : `O solver joga ${pure}; o V2 joga ${v2}.`,
    });
  }
  return rows;
}

/** Roda o auditor em todos os fixtures pré-flop com gabarito mão-a-mão. */
export function auditV2AgainstCertified(
  fixtures: ExternalBenchmarkFixture[] = CERTIFIED_PREFLOP_FIXTURES,
): AuditSummary {
  const rows: AuditRow[] = [];
  for (const f of fixtures) rows.push(...auditFixtureAgainstV2(f));
  const agree = rows.filter((r) => r.status === "AGREE").length;
  const diverge = rows.filter((r) => r.status === "DIVERGE").length;
  const notComparable = rows.filter((r) => r.status === "NOT_COMPARABLE").length;
  return { comparableHands: agree + diverge, agree, diverge, notComparable, rows };
}

/** Relatório em texto (pro Allan/log), agrupado por status. */
export function formatAuditReport(summary: AuditSummary): string {
  const lines: string[] = [];
  lines.push(`=== Auditor V2 × gabarito V3 ===`);
  lines.push(
    `Comparáveis: ${summary.comparableHands} mãos | concorda: ${summary.agree} | diverge: ${summary.diverge} | não-comparável: ${summary.notComparable}`,
  );
  const div = summary.rows.filter((r) => r.status === "DIVERGE");
  if (div.length) {
    lines.push(`\nDivergências (onde o V3 vai agregar / onde revisar o V2):`);
    for (const r of div) lines.push(`  [${r.fixtureId}] ${r.hand}: solver=${r.certified} · V2=${r.v2} — ${r.reason}`);
  }
  return lines.join("\n");
}

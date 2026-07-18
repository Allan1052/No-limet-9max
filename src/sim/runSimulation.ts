// ---------------------------------------------------------------------------
// Simulação em massa (headless, sem interface).
//
// Roda milhares de mãos com os 8 perfis (+ um jogador de linha de base) e agrega
// as estatísticas por perfil: VPIP, PFR, 3-bet% e resultado em bb/100. Serve
// para VALIDAR estatisticamente que os perfis jogam como deveriam — algo que
// poucas mãos não mostram, mas milhares sim.
//
// Cada mão recomeça com os stacks cheios (estilo cash), para que todos os 9
// perfis joguem todas as mãos e a amostra fique limpa e comparável.
// ---------------------------------------------------------------------------

import { seededRng, type Card } from "../engine/cards";
import {
  createTable,
  startHand,
  applyAction,
  moveButton,
  freshShuffledDeck,
} from "../game/engine";
import { botPreflopAction } from "../bots/preflopBot";
import { botPostflopAction } from "../bots/postflopBot";
import { PROFILES } from "../bots/profiles";
import {
  beginHand,
  emptyStats,
  recordPreflopAction,
  type PerHandFlags,
  type PlayerStats,
} from "../feedback/stats";

export interface SimProfileResult {
  id: string;
  name: string;
  hands: number;
  vpip: number; // %
  pfr: number; // %
  threeBet: number; // %
  /** Resultado em big blinds por 100 mãos (positivo = ganhando do campo). */
  bb100: number;
}

export interface SimReport {
  hands: number;
  chipConserved: boolean;
  byProfile: SimProfileResult[];
}

export interface SimOptions {
  startingStack?: number;
  smallBlind?: number;
  bigBlind?: number;
  /** Iterações de Monte Carlo por decisão pós-flop (baixo = mais rápido). */
  equityIterations?: number;
  seed?: number;
}

export function runSimulation(numHands: number, opts: SimOptions = {}): SimReport {
  const startingStack = opts.startingStack ?? 200 * (opts.bigBlind ?? 50);
  const smallBlind = opts.smallBlind ?? 25;
  const bigBlind = opts.bigBlind ?? 50;
  const iters = opts.equityIterations ?? 300;
  const rng = seededRng(opts.seed ?? 12345);

  // 9 assentos: os 8 perfis + um jogador de linha de base (sem profileId).
  const seats = [
    ...PROFILES.map((p) => ({ name: p.name, stack: startingStack, profileId: p.id })),
    { name: "Base (GTO)", stack: startingStack },
  ];
  const table = createTable({ smallBlind, bigBlind }, seats, 0);
  const idBySeat: Record<number, string> = {};
  const nameBySeat: Record<number, string> = {};
  table.players.forEach((p) => {
    idBySeat[p.seat] = p.profileId ?? "baseline";
    nameBySeat[p.seat] = p.name;
  });

  const stats: Record<number, PlayerStats> = {};
  const net: Record<number, number> = {};
  for (const p of table.players) {
    stats[p.seat] = emptyStats();
    net[p.seat] = 0;
  }

  let chipConserved = true;

  for (let h = 0; h < numHands; h++) {
    // Recompõe os stacks (cash): todos jogam todas as mãos.
    for (const p of table.players) p.stack = startingStack;

    const deck: Card[] = freshShuffledDeck(rng);
    startHand(table, deck);

    const perHand: Record<number, PerHandFlags> = {};
    for (const p of table.players) {
      if (p.status !== "out") perHand[p.seat] = beginHand(stats[p.seat]);
    }

    let guard = 0;
    while (!table.handOver) {
      if (guard++ > 3000) throw new Error("mão não terminou");
      const seat = table.toAct;
      if (table.street === "preflop") {
        const facingRaise = table.currentBet > table.bigBlind;
        const action = botPreflopAction(table, seat);
        recordPreflopAction(stats[seat], perHand[seat], action.type, facingRaise);
        applyAction(table, action);
      } else {
        applyAction(table, botPostflopAction(table, seat, rng, iters));
      }
    }

    // Conservação: soma dos stacks deve voltar ao total inicial.
    const total = table.players.reduce((s, p) => s + p.stack, 0);
    if (total !== startingStack * table.players.length) chipConserved = false;

    // Resultado da mão por assento (delta em relação ao stack inicial).
    for (const p of table.players) net[p.seat] += p.stack - startingStack;

    moveButton(table);
  }

  const byProfile: SimProfileResult[] = table.players.map((p) => {
    const s = stats[p.seat];
    return {
      id: idBySeat[p.seat],
      name: nameBySeat[p.seat],
      hands: s.handsDealt,
      vpip: pct(s.vpip, s.handsDealt),
      pfr: pct(s.pfr, s.handsDealt),
      threeBet: pct(s.threeBet, s.threeBetOpp),
      bb100: s.handsDealt > 0 ? (net[p.seat] / s.handsDealt / bigBlind) * 100 : 0,
    };
  });

  return { hands: numHands, chipConserved, byProfile };
}

function pct(n: number, d: number): number {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

/** Formata o relatório como tabela de texto (para o terminal). */
export function formatReport(report: SimReport): string {
  const lines: string[] = [];
  lines.push(`\n===== SIMULAÇÃO: ${report.hands} mãos =====`);
  lines.push(`Fichas conservadas em todas as mãos: ${report.chipConserved ? "sim" : "NÃO"}`);
  lines.push("");
  lines.push(pad("Perfil", 26) + pad("VPIP", 7) + pad("PFR", 7) + pad("3B", 7) + pad("bb/100", 9));
  lines.push("-".repeat(56));
  for (const r of report.byProfile) {
    lines.push(
      pad(r.name, 26) +
        pad(`${r.vpip}%`, 7) +
        pad(`${r.pfr}%`, 7) +
        pad(`${r.threeBet}%`, 7) +
        pad(r.bb100.toFixed(1), 9),
    );
  }
  return lines.join("\n");
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

// ---------------------------------------------------------------------------
// Auditoria GTO — 4 Estágios de Torneio
// 1. Early game  (100bb, 9 jogadores, stacks iguais)
// 2. Mid game    (45bb, 6 jogadores, stacks variados)
// 3. Late game   (22bb, 4 jogadores, stacks curtos)
// 4. Final table (8bb, 3 jogadores, ICM pesado)
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { preflopDecision } from "../ranges/preflop";
import { BASELINE_PROFILE } from "../bots/profiles";
import { allHandTypes, type Position } from "../ranges/types";
import { makeCard, type Card } from "../engine/cards";

function handFromText(text: string): [Card, Card] {
  if (text.length === 2) {
    const r = 2 + "23456789TJQKA".indexOf(text[0]);
    return [makeCard(r, 0), makeCard(r, 1)];
  }
  if (text.endsWith("s")) {
    const hi = 2 + "23456789TJQKA".indexOf(text[0]);
    const lo = 2 + "23456789TJQKA".indexOf(text[1]);
    return [makeCard(hi, 0), makeCard(lo, 0)];
  }
  if (text.endsWith("o")) {
    const hi = 2 + "23456789TJQKA".indexOf(text[0]);
    const lo = 2 + "23456789TJQKA".indexOf(text[1]);
    return [makeCard(hi, 0), makeCard(lo, 1)];
  }
  throw new Error(`Mão inválida: ${text}`);
}

const hands = allHandTypes();

const report: string[] = [];
function log(msg: string) {
  report.push(msg);
  console.log(msg);
}

const positions = ["UTG", "UTG1", "MP", "LJ", "HJ", "CO", "BTN", "SB", "BB"] as Position[];

// GTO referência: RFI por posição e stack depth
const RFI_REF: Record<string, Record<Position, number>> = {
  "100bb": { UTG: 0.15, UTG1: 0.15, MP: 0.18, LJ: 0.21, HJ: 0.26, CO: 0.31, BTN: 0.48, SB: 0.44, BB: 0 },
  "45bb":  { UTG: 0.14, UTG1: 0.14, MP: 0.17, LJ: 0.20, HJ: 0.25, CO: 0.30, BTN: 0.46, SB: 0.42, BB: 0 },
  "22bb":  { UTG: 0.13, UTG1: 0.13, MP: 0.16, LJ: 0.19, HJ: 0.23, CO: 0.28, BTN: 0.44, SB: 0.40, BB: 0 },
  "8bb":   { UTG: 0.16, UTG1: 0.16, MP: 0.20, LJ: 0.24, HJ: 0.30, CO: 0.38, BTN: 0.52, SB: 0.48, BB: 0 },
};

// GTO referência: SB defend vs BTN por stack
const SB_DEFEND_REF: Record<string, number> = {
  "100bb": 0.52,
  "45bb":  0.50,
  "22bb":  0.48,
  "8bb":   0.55,
};

// GTO referência: BB defend vs BTN por stack
const BB_DEFEND_REF: Record<string, number> = {
  "100bb": 0.42,
  "45bb":  0.40,
  "22bb":  0.38,
  "8bb":   0.45,
};

// Mãos premium que DEVEM ser 3-bet/jam OOP contra raiser
const SHOULD_3BET_OOP = ["AA", "KK", "QQ", "AKo", "AKs", "AQs", "JJ", "TT"];

function getRFI(pos: Position, bb: number) {
  return hands.filter((h) => {
    const cards = handFromText(h);
    const dec = preflopDecision({
      heroPosition: pos,
      hand: cards,
      effectiveBB: bb,
      profile: BASELINE_PROFILE,
      variant: "holdem",
    });
    return dec.action === "raise" || dec.action === "jam";
  }).length / hands.length;
}

function getDefend(hero: Position, raiser: Position, bb: number) {
  return hands.filter((h) => {
    const cards = handFromText(h);
    const dec = preflopDecision({
      heroPosition: hero,
      hand: cards,
      effectiveBB: bb,
      profile: BASELINE_PROFILE,
      raiserPosition: raiser,
      openSizeBB: 2.3,
      variant: "holdem",
    });
    return dec.action !== "fold";
  }).length / hands.length;
}

function checkPremiums(hero: Position, raiser: Position, bb: number) {
  const results: { hand: string; action: string; correct: boolean }[] = [];
  for (const h of SHOULD_3BET_OOP) {
    const cards = handFromText(h);
    const dec = preflopDecision({
      heroPosition: hero,
      hand: cards,
      effectiveBB: bb,
      profile: BASELINE_PROFILE,
      raiserPosition: raiser,
      openSizeBB: 2.3,
      variant: "holdem",
    });
    const isCorrect = dec.action === "3bet" || dec.action === "jam";
    results.push({ hand: h, action: dec.action, correct: isCorrect });
  }
  return results;
}

// =====================================================
describe("=== AUDITORIA GTO — 4 Estágios de Torneio ===", () => {

  // --- ESTÁGIO 1: EARLY GAME (100bb, 9 jogadores) ---
  describe("1. Early Game — 100bb, 9 jogadores", () => {
    const bb = 100;
    const ref = RFI_REF["100bb"];

    it("RFI ranges", () => {
      log("\n\n========== EARLY GAME (100bb) ==========");
      for (const pos of positions) {
        if (pos === "BB") continue;
        const app = getRFI(pos, bb);
        const gto = ref[pos];
        const diff = Math.abs(app - gto);
        log(`  ${pos}: App=${Math.round(app * 100)}% GTO=${Math.round(gto * 100)}% diff=${Math.round(diff * 1000) / 10}% ${diff < 0.05 ? "✅" : "⚠️"}`);
      }
    });

    it("SB defend vs BTN", () => {
      const app = getDefend("SB", "BTN", bb);
      const gto = SB_DEFEND_REF["100bb"];
      log(`\n  SB vs BTN: App=${Math.round(app * 100)}% GTO=${Math.round(gto * 100)}% ${Math.abs(app - gto) < 0.1 ? "✅" : "⚠️"}`);
    });

    it("BB defend vs BTN", () => {
      const app = getDefend("BB", "BTN", bb);
      const gto = BB_DEFEND_REF["100bb"];
      log(`\n  BB vs BTN: App=${Math.round(app * 100)}% GTO=${Math.round(gto * 100)}% ${Math.abs(app - gto) < 0.1 ? "✅" : "⚠️"}`);
    });

    it("Premiums nunca foldam OOP", () => {
      log("\n  --- Premiums SB vs LJ ---");
      const results = checkPremiums("SB", "LJ", bb);
      for (const r of results) {
        log(`    ${r.hand}: ${r.action} ${r.correct ? "✅" : "❌"}`);
        expect(r.correct).toBe(true);
      }
    });

    it("Premiums BB vs BTN", () => {
      log("\n  --- Premiums BB vs BTN ---");
      const results = checkPremiums("BB", "BTN", bb);
      for (const r of results) {
        log(`    ${r.hand}: ${r.action} ${r.correct ? "✅" : "❌"}`);
        expect(r.correct).toBe(true);
      }
    });

    it("Premiums CO vs BTN", () => {
      log("\n  --- Premiums CO vs BTN ---");
      const results = checkPremiums("CO", "BTN", bb);
      for (const r of results) {
        log(`    ${r.hand}: ${r.action} ${r.correct ? "✅" : "❌"}`);
        expect(r.correct).toBe(true);
      }
    });
  });

  // --- ESTÁGIO 2: MID GAME (45bb, 6 jogadores) ---
  describe("2. Mid Game — 45bb, 6 jogadores", () => {
    const bb = 45;
    const ref = RFI_REF["45bb"];

    it("RFI ranges", () => {
      log("\n\n========== MID GAME (45bb) ==========");
      for (const pos of positions) {
        if (pos === "BB") continue;
        const app = getRFI(pos, bb);
        const gto = ref[pos];
        const diff = Math.abs(app - gto);
        log(`  ${pos}: App=${Math.round(app * 100)}% GTO=${Math.round(gto * 100)}% diff=${Math.round(diff * 1000) / 10}% ${diff < 0.06 ? "✅" : "⚠️"}`);
      }
    });

    it("Premiums SB vs LJ (45bb)", () => {
      log("\n  --- Premiums SB vs LJ (45bb) ---");
      const results = checkPremiums("SB", "LJ", bb);
      for (const r of results) {
        log(`    ${r.hand}: ${r.action} ${r.correct ? "✅" : "❌"}`);
        expect(r.correct).toBe(true);
      }
    });

    it("Premiums BB vs BTN (45bb)", () => {
      log("\n  --- Premiums BB vs BTN (45bb) ---");
      const results = checkPremiums("BB", "BTN", bb);
      for (const r of results) {
        log(`    ${r.hand}: ${r.action} ${r.correct ? "✅" : "❌"}`);
        expect(r.correct).toBe(true);
      }
    });
  });

  // --- ESTÁGIO 3: LATE GAME (22bb, 4 jogadores) ---
  describe("3. Late Game — 22bb, 4 jogadores", () => {
    const bb = 22;
    const ref = RFI_REF["22bb"];

    it("RFI ranges", () => {
      log("\n\n========== LATE GAME (22bb) ==========");
      for (const pos of positions) {
        if (pos === "BB") continue;
        const app = getRFI(pos, bb);
        const gto = ref[pos];
        const diff = Math.abs(app - gto);
        log(`  ${pos}: App=${Math.round(app * 100)}% GTO=${Math.round(gto * 100)}% diff=${Math.round(diff * 1000) / 10}% ${diff < 0.08 ? "✅" : "⚠️"}`);
      }
    });

    it("Premiums SB vs LJ (22bb)", () => {
      log("\n  --- Premiums SB vs LJ (22bb) ---");
      const results = checkPremiums("SB", "LJ", bb);
      for (const r of results) {
        log(`    ${r.hand}: ${r.action} ${r.correct ? "✅" : "❌"}`);
        expect(r.correct).toBe(true);
      }
    });

    it("Premiums BB vs BTN (22bb)", () => {
      log("\n  --- Premiums BB vs BTN (22bb) ---");
      const results = checkPremiums("BB", "BTN", bb);
      for (const r of results) {
        log(`    ${r.hand}: ${r.action} ${r.correct ? "✅" : "❌"}`);
        expect(r.correct).toBe(true);
      }
    });
  });

  // --- ESTÁGIO 4: FINAL TABLE (8bb, 3 jogadores, ICM pesado) ---
  describe("4. Final Table — 8bb, 3 jogadores, ICM", () => {
    const bb = 8;
    const ref = RFI_REF["8bb"];

    it("RFI ranges (push/fold)", () => {
      log("\n\n========== FINAL TABLE (8bb) ==========");
      for (const pos of positions) {
        if (pos === "BB") continue;
        const app = getRFI(pos, bb);
        const gto = ref[pos];
        const diff = Math.abs(app - gto);
        log(`  ${pos}: App=${Math.round(app * 100)}% GTO=${Math.round(gto * 100)}% diff=${Math.round(diff * 1000) / 10}% ${diff < 0.1 ? "✅" : "⚠️"}`);
      }
    });

    it("Premiums SB vs LJ (8bb)", () => {
      log("\n  --- Premiums SB vs LJ (8bb) ---");
      const results = checkPremiums("SB", "LJ", bb);
      for (const r of results) {
        log(`    ${r.hand}: ${r.action} ${r.correct ? "✅" : "❌"}`);
        expect(r.correct).toBe(true);
      }
    });

    it("Premiums BB vs BTN (8bb)", () => {
      log("\n  --- Premiums BB vs BTN (8bb) ---");
      const results = checkPremiums("BB", "BTN", bb);
      for (const r of results) {
        log(`    ${r.hand}: ${r.action} ${r.correct ? "✅" : "❌"}`);
        expect(r.correct).toBe(true);
      }
    });

    it("BTN shove range (8bb)", () => {
      const shove = hands.filter((h) => {
        const cards = handFromText(h);
        const dec = preflopDecision({
          heroPosition: "BTN",
          hand: cards,
          effectiveBB: bb,
          profile: BASELINE_PROFILE,
          variant: "holdem",
        });
        return dec.action === "jam" || dec.action === "raise";
      });
      const pct = shove.length / hands.length;
      log(`\n  BTN 8bb shove: ${shove.length} mãos (${Math.round(pct * 100)}%)`);
      log(`  GTO referência: ~52-55%`);
      log(`  Top: ${shove.slice(0, 15).join(", ")}`);
    });

    it("UTG shove range (8bb)", () => {
      const shove = hands.filter((h) => {
        const cards = handFromText(h);
        const dec = preflopDecision({
          heroPosition: "UTG",
          hand: cards,
          effectiveBB: bb,
          profile: BASELINE_PROFILE,
          variant: "holdem",
        });
        return dec.action === "jam" || dec.action === "raise";
      });
      const pct = shove.length / hands.length;
      log(`\n  UTG 8bb shove: ${shove.length} mãos (${Math.round(pct * 100)}%)`);
      log(`  GTO referência: ~16-18%`);
      log(`  Top: ${shove.slice(0, 15).join(", ")}`);
    });

    it("SB call range vs BTN jam (8bb)", () => {
      const call = hands.filter((h) => {
        const cards = handFromText(h);
        const dec = preflopDecision({
          heroPosition: "SB",
          hand: cards,
          effectiveBB: bb,
          profile: BASELINE_PROFILE,
          raiserPosition: "BTN",
          openSizeBB: bb, // BTN jammou
          variant: "holdem",
        });
        return dec.action === "call";
      });
      const pct = call.length / hands.length;
      log(`\n  SB call vs BTN jam (8bb): ${call.length} mãos (${Math.round(pct * 100)}%)`);
      log(`  GTO referência: ~25-30%`);
      log(`  Top: ${call.slice(0, 10).join(", ")}`);
    });
  });

  // --- SALVAR RELATÓRIO ---
  it("salva relatório completo", () => {
    // Grava relativo ao cwd (não a um caminho absoluto da máquina local), e nunca
    // falha o teste se o disco estiver read-only — é só um artefato de relatório.
    try {
      const { writeFileSync } = require("fs");
      const { tmpdir } = require("os");
      const { join } = require("path");
      writeFileSync(join(tmpdir(), "multi-stage-audit-report.txt"), report.join("\n"));
      log("\n\n=== Relatório multi-estágio salvo em <tmp>/multi-stage-audit-report.txt ===");
    } catch {
      log("\n\n=== Relatório não gravado (disco read-only) — segue o jogo ===");
    }
  });
});

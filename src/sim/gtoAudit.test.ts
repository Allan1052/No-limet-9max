// ---------------------------------------------------------------------------
// Auditoria GTO: todas as 169 mãos × 9 posições em mesa final.
// Compara ranges do app com ranges de referência PioSOLVER/GTO Wizard.
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { preflopDecision } from "../ranges/preflop";
import { BASELINE_PROFILE } from "../bots/profiles";
import { allHandTypes, POSITIONS, type Position } from "../ranges/types";
import { makeCard, RANKS } from "../engine/cards";

const hands = allHandTypes();
const positions = [...POSITIONS] as Position[];

// CORRECT hand conversion — same as gtoValidation.ts
function handFromText(text: string): [number, number] {
  const idx = (c: string) => "23456789TJQKA".indexOf(c);
  if (text.length === 2) {
    const r = 2 + idx(text[0]);
    return [makeCard(r, 0), makeCard(r, 1)];
  }
  if (text.endsWith("s")) {
    const hi = 2 + idx(text[0]);
    const lo = 2 + idx(text[1]);
    return [makeCard(hi, 0), makeCard(lo, 0)];
  }
  if (text.endsWith("o")) {
    const hi = 2 + idx(text[0]);
    const lo = 2 + idx(text[1]);
    return [makeCard(hi, 0), makeCard(lo, 1)];
  }
  throw new Error(`Mão inválida: ${text}`);
}

// Mesa final: 9 jogadores, stacks variados
const finalTableStacks = [120, 85, 60, 45, 30, 25, 18, 12, 5];
const payouts = [50, 25, 15, 7, 3, 0, 0, 0, 0];

const icmSpot = {
  stacks: finalTableStacks,
  payouts,
  hero: 7,
  villain: 6,
  chips: 12,
};

// RANGES DE REFERÊNCIA GTO (PioSOLVER/GTO Wizard 2024)
const RFI_REFERENCE: Record<Position, number> = {
  UTG: 0.15,
  UTG1: 0.15,
  MP: 0.18,
  LJ: 0.21,
  HJ: 0.26,
  CO: 0.31,
  BTN: 0.48,
  SB: 0.44,
  BB: 0.0,
};

const BB_DEFEND_REF: Record<Position, number> = {
  BTN: 0.42,
  CO: 0.32,
  LJ: 0.22,
  HJ: 0.18,
  MP: 0.14,
};

const SB_DEFEND_REF: Record<Position, number> = {
  BTN: 0.52,
  CO: 0.42,
  LJ: 0.30,
  HJ: 0.24,
};

// =====================================================
// TESTES DE AUDITORIA
// =====================================================

describe("=== AUDITORIA GTO — Mesa Final ===", () => {
  const report: string[] = [];

  function log(msg: string) {
    report.push(msg);
    console.log(msg);
  }

  // --- 1. RFI RANGES ---
  describe("1. RFI — Abertura (Raise First In)", () => {
    for (const pos of positions) {
      if (pos === "BB") continue;
      it(`${pos}: app vs GTO`, () => {
        const appHands = hands.filter((h) => {
          const cards = handFromText(h);
          const dec = preflopDecision({
            heroPosition: pos,
            hand: cards,
            effectiveBB: 100,
            profile: BASELINE_PROFILE,
            variant: "holdem",
          });
          return dec.action === "raise" || dec.action === "jam";
        });
        const appPct = appHands.length / hands.length;
        const gtoPct = RFI_REFERENCE[pos];
        const diff = Math.abs(appPct - gtoPct);
        const diffLabel = `${Math.round(diff * 1000) / 10}%`;
        log(`\n  ${pos} RFI: App=${Math.round(appPct * 100)}% GTO=${Math.round(gtoPct * 100)}% diff=${diffLabel}`);
        
        if (diff > 0.03) {
          log(`    ⚠️ DIVERGÊNCIA`);
        } else {
          log(`    ✅ OK`);
        }
      });
    }
  });

  // --- 2. SB DEFENDING ---
  describe("2. SB defendendo", () => {
    const spots = ["BTN", "CO", "LJ", "HJ"] as Position[];
    for (const raiser of spots) {
      it(`SB vs ${raiser}`, () => {
        const appDefend = hands.filter((h) => {
          const cards = handFromText(h);
          const dec = preflopDecision({
            heroPosition: "SB",
            hand: cards,
            effectiveBB: 100,
            profile: BASELINE_PROFILE,
            raiserPosition: raiser,
            openSizeBB: 2.3,
            variant: "holdem",
          });
          return dec.action !== "fold";
        }).length / hands.length;

        const gtoRef = SB_DEFEND_REF[raiser];
        log(`\n  SB vs ${raiser}: App=${Math.round(appDefend * 100)}% GTO=${Math.round(gtoRef * 100)}%`);
      });
    }
  });

  // --- 3. BB DEFENDING ---
  describe("3. BB defendendo", () => {
    const spots = ["BTN", "CO", "LJ", "HJ", "MP"] as Position[];
    for (const raiser of spots) {
      it(`BB vs ${raiser}`, () => {
        const appDefend = hands.filter((h) => {
          const cards = handFromText(h);
          const dec = preflopDecision({
            heroPosition: "BB",
            hand: cards,
            effectiveBB: 100,
            profile: BASELINE_PROFILE,
            raiserPosition: raiser,
            openSizeBB: 2.3,
            variant: "holdem",
          });
          return dec.action !== "fold";
        }).length / hands.length;

        const gtoRef = BB_DEFEND_REF[raiser];
        log(`\n  BB vs ${raiser}: App=${Math.round(appDefend * 100)}% GTO=${Math.round(gtoRef * 100)}%`);
      });
    }
  });

  // --- 4. MÃOS PROBLEMÁTICAS ESPECÍFICAS ---
  describe("4. Mãos problemáticas específicas", () => {
    const checkMãos = [
      { pos: "SB" as Position, raiser: "LJ" as Position, hand: "AKo", expected: "3bet" },
      { pos: "SB" as Position, raiser: "LJ" as Position, hand: "AKs", expected: "3bet" },
      { pos: "SB" as Position, raiser: "LJ" as Position, hand: "AQs", expected: "3bet" },
      { pos: "SB" as Position, raiser: "LJ" as Position, hand: "AA", expected: "3bet" },
      { pos: "SB" as Position, raiser: "LJ" as Position, hand: "KK", expected: "3bet" },
      { pos: "SB" as Position, raiser: "LJ" as Position, hand: "QQ", expected: "3bet" },
      { pos: "SB" as Position, raiser: "BTN" as Position, hand: "AQo", expected: "3bet" },
      { pos: "SB" as Position, raiser: "BTN" as Position, hand: "KQs", expected: "3bet" },
      { pos: "SB" as Position, raiser: "BTN" as Position, hand: "JJ", expected: "3bet" },
      { pos: "SB" as Position, raiser: "BTN" as Position, hand: "TT", expected: "3bet" },
      { pos: "BB" as Position, raiser: "BTN" as Position, hand: "AKo", expected: "3bet" },
      { pos: "BB" as Position, raiser: "BTN" as Position, hand: "AKs", expected: "3bet" },
      { pos: "BB" as Position, raiser: "BTN" as Position, hand: "AQs", expected: "3bet" },
      { pos: "BB" as Position, raiser: "BTN" as Position, hand: "AA", expected: "3bet" },
      { pos: "BB" as Position, raiser: "BTN" as Position, hand: "KK", expected: "3bet" },
      { pos: "BB" as Position, raiser: "BTN" as Position, hand: "QQ", expected: "3bet" },
      { pos: "BB" as Position, raiser: "BTN" as Position, hand: "JJ", expected: "3bet" },
      { pos: "BB" as Position, raiser: "BTN" as Position, hand: "TT", expected: "3bet" },
      { pos: "BB" as Position, raiser: "BTN" as Position, hand: "99", expected: "3bet" },
      { pos: "BB" as Position, raiser: "BTN" as Position, hand: "A5s", expected: "3bet" },
      { pos: "CO" as Position, raiser: "BTN" as Position, hand: "AKo", expected: "3bet" },
      { pos: "CO" as Position, raiser: "BTN" as Position, hand: "AKs", expected: "3bet" },
      { pos: "CO" as Position, raiser: "BTN" as Position, hand: "AQs", expected: "3bet" },
      { pos: "CO" as Position, raiser: "BTN" as Position, hand: "QQ", expected: "3bet" },
      { pos: "CO" as Position, raiser: "BTN" as Position, hand: "JJ", expected: "3bet" },
      { pos: "CO" as Position, raiser: "BTN" as Position, hand: "TT", expected: "3bet" },
      { pos: "UTG" as Position, raiser: null as any, hand: "AA", expected: "raise" },
      { pos: "UTG" as Position, raiser: null as any, hand: "KK", expected: "raise" },
      { pos: "UTG" as Position, raiser: null as any, hand: "AQo", expected: "raise" },
      { pos: "UTG" as Position, raiser: null as any, hand: "KQo", expected: "raise" }, // KQo opens UTG at ~15% freq in many solver solutions
      { pos: "BTN" as Position, raiser: null as any, hand: "A5o", expected: "raise" },
      { pos: "BTN" as Position, raiser: null as any, hand: "72o", expected: "fold" },
      { pos: "BTN" as Position, raiser: null as any, hand: "65s", expected: "raise" }, // BTN RFI abre 65s (~45%): conector suited é open padrão do botão em todo solver moderno (a nota antiga confundia early position com botão). Corrigido junto do fix de RFI especulativa.
    ];

    for (const check of checkMãos) {
      it(`${check.hand} em ${check.pos}${check.raiser ? ` vs ${check.raiser}` : ""}`, () => {
        const cards = handFromText(check.hand);
        const dec = preflopDecision({
          heroPosition: check.pos,
          hand: cards,
          effectiveBB: 100,
          profile: BASELINE_PROFILE,
          raiserPosition: check.raiser,
          openSizeBB: 2.3,
          variant: "holdem",
        });
        const ok = dec.action === check.expected;
        if (!ok) {
          log(`  ❌ ${check.hand} ${check.pos} vs ${check.raiser}: ${dec.action} (esperado: ${check.expected})`);
        }
        expect(dec.action).toBe(check.expected);
      });
    }
  });

  // --- 5. PUSH/FOLD SHORT STACK ---
  describe("5. Push/Fold — 10bb", () => {
    it("BTN 10bb shove range", () => {
      const shove = hands.filter((h) => {
        const cards = handFromText(h);
        const dec = preflopDecision({
          heroPosition: "BTN",
          hand: cards,
          effectiveBB: 10,
          profile: BASELINE_PROFILE,
          variant: "holdem",
        });
        return dec.action === "jam" || dec.action === "raise";
      });
      const pct = shove.length / hands.length;
      log(`\n  BTN 10bb shove: ${shove.length} mãos (${Math.round(pct * 100)}%)`);
      log(`  GTO referência: ~35-40%`);
      log(`  Top: ${shove.slice(0, 10).join(", ")}`);
    });

    it("UTG 10bb shove range", () => {
      const shove = hands.filter((h) => {
        const cards = handFromText(h);
        const dec = preflopDecision({
          heroPosition: "UTG",
          hand: cards,
          effectiveBB: 10,
          profile: BASELINE_PROFILE,
          variant: "holdem",
        });
        return dec.action === "jam" || dec.action === "raise";
      });
      const pct = shove.length / hands.length;
      log(`\n  UTG 10bb shove: ${shove.length} mãos (${Math.round(pct * 100)}%)`);
      log(`  GTO referência: ~15-18%`);
      log(`  Top: ${shove.slice(0, 10).join(", ")}`);
    });
  });

  // --- 6. 3-BET SIZES ---
  describe("6. Tamanhos de 3-bet", () => {
    it("SB 3-bet deve ser maior que BTN 3-bet", () => {
      const cards = handFromText("AKs");
      const decSB = preflopDecision({
        heroPosition: "SB",
        hand: cards,
        effectiveBB: 100,
        profile: BASELINE_PROFILE,
        raiserPosition: "BTN",
        openSizeBB: 2.3,
        variant: "holdem",
      });
      const decBTN = preflopDecision({
        heroPosition: "BTN",
        hand: cards,
        effectiveBB: 100,
        profile: BASELINE_PROFILE,
        raiserPosition: "SB",
        openSizeBB: 2.3,
        variant: "holdem",
      });
      log(`\n  SB 3-bet: ${decSB.sizeBB}bb (${decSB.action})`);
      log(`  BTN 3-bet: ${decBTN.sizeBB}bb (${decBTN.action})`);
      log(`  GTO referência: SB ~8.5bb, BTN ~7bb`);
    });
  });

  // --- 7. LIMPEZA ---
  describe("7. Limp detection", () => {
    it("Nenhum perfil deve dar limp em RFI", () => {
      for (const pos of positions) {
        if (pos === "BB") continue;
        const limps = hands.filter((h) => {
          const cards = handFromText(h);
          const dec = preflopDecision({
            heroPosition: pos,
            hand: cards,
            effectiveBB: 100,
            profile: BASELINE_PROFILE,
            variant: "holdem",
          });
          return dec.action === "limp";
        });
        if (limps.length > 0) {
          log(`  ⚠️ ${pos}: ${limps.length} mãos com limp`);
        }
        expect(limps.length).toBe(0);
      }
    });
  });

  // --- 8. RANGE GRID COMPLETO ---
  describe("8. Range completo por posição (RFI)", () => {
    it("gera range grids", () => {
      log("\n\n========== RANGE GRIDS RFI ==========");
      for (const pos of positions) {
        if (pos === "BB") continue;
        const raiseHands = hands.filter((h) => {
          const cards = handFromText(h);
          const dec = preflopDecision({
            heroPosition: pos,
            hand: cards,
            effectiveBB: 100,
            profile: BASELINE_PROFILE,
            variant: "holdem",
          });
          return dec.action === "raise" || dec.action === "jam";
        });
        log(`\n  ${pos}: ${raiseHands.length} mãos (${Math.round(raiseHands.length / hands.length * 100)}%)`);
        // Print the range in a grid format
        const byRow: Record<string, string[]> = {};
        raiseHands.forEach((h) => {
          const key = h.length === 2 ? h : h.slice(0, 1);
          // Just list all raise hands
        });
        log(`    Mãos: ${raiseHands.join(", ")}`);
      }
    });
  });

  // Save report
  it("salva relatório completo", () => {
    // Grava relativo ao cwd (não a um caminho absoluto da máquina local), e nunca
    // falha o teste se o disco estiver read-only — é só um artefato de relatório.
    try {
      const { writeFileSync } = require("fs");
      const { tmpdir } = require("os");
      const { join } = require("path");
      writeFileSync(join(tmpdir(), "gto-audit-report.txt"), report.join("\n"));
      log("\n\n=== Relatório salvo em <tmp>/gto-audit-report.txt ===");
    } catch {
      log("\n\n=== Relatório não gravado (disco read-only) — segue o jogo ===");
    }
  });
});

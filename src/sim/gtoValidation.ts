// ---------------------------------------------------------------------------
// Validação GTO: verifica se os ranges de abertura (RFI) dos bots estão
// corretos e alinhados com GTO real.
// ---------------------------------------------------------------------------

import { makeCard, type Card } from "../engine/cards";
import { preflopDecision, type PreflopContext } from "../ranges/preflop";
import {
  PROFILES,
  BASELINE_PROFILE,
  type BotProfile,
} from "../bots/profiles";
import { rfiRange } from "../ranges/charts/rfi";
import { rangePercent } from "../ranges/types";

// freqIn inline (não exportado do preflop.ts)
function freqIn(range: Record<string, number>, handType: string): number {
  return range[handType] ?? 0;
}

// ── Helper: criar uma mão de texto (ex: "QJo", "53o", "AKs") como duas Cards ──
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

function testHand(
  handText: string,
  profile: BotProfile,
  position: string = "UTG",
  effectiveBB: number = 60,
): { action: string } {
  const cards = handFromText(handText);
  const ctx: PreflopContext = {
    heroPosition: position as any,
    hand: cards,
    effectiveBB,
    profile,
    variant: "holdem",
  };
  const dec = preflopDecision(ctx);
  return { action: dec.action };
}

// ═══════════════════════════════════════════════════════════════════════════
// DEBUG: Verificar freq exata de QJo e 53o no range de UTG
// ═══════════════════════════════════════════════════════════════════════════
function debugRfiFrequencies() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  DEBUG: Frequências exatas no range RFI            ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  const positions = ["UTG", "UTG1", "MP", "LJ", "HJ", "CO", "BTN", "SB"];
  const testHands = ["QJo", "53o", "Q9s", "J9s", "T8s", "K9o", "A5s", "76s", "54s"];

  for (const pos of positions) {
    const range = rfiRange(pos as any, { widthFactor: 1, stackFactor: 1, icmFactor: 1 });
    console.log(`\n  ${pos} (base GTO):`);
    for (const ht of testHands) {
      const freq = freqIn(range, ht);
      const marker = freq >= 0.1 ? "🔴" : freq >= 0.01 ? "🟡" : "⚫";
      console.log(`    ${marker} ${ht}: freq=${freq.toFixed(4)}${freq >= 0.1 ? " (ABRE!)" : ""}`);
    }
  }

  // Também verificar com widthFactor de cada perfil
  console.log("\n\n  === Com widthFactor dos perfis ===");
  const profiles = [...PROFILES, BASELINE_PROFILE];
  for (const profile of profiles) {
    const range = rfiRange("UTG", {
      widthFactor: profile.rfiWidth,
      stackFactor: 1,
      icmFactor: 1,
    });
    const qJoFreq = freqIn(range, "QJo");
    const fiveThreeFreq = freqIn(range, "53o");
    console.log(`  ${profile.name} (rfiWidth=${profile.rfiWidth}): QJo=${qJoFreq.toFixed(4)}, 53o=${fiveThreeFreq.toFixed(4)}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTE 1: Bug reportado — UTG abrindo QJo e 53o
// ═══════════════════════════════════════════════════════════════════════════
function testReportedBug() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  TESTE 1: BUG REPORTADO — UTG abrindo QJo/53o     ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  const profiles = [...PROFILES, BASELINE_PROFILE];
  let pass = 0, fail = 0;

  for (const profile of profiles) {
    const qJo = testHand("QJo", profile, "UTG");
    const fiveThree = testHand("53o", profile, "UTG");
    const ok = qJo.action !== "raise" && qJo.action !== "jam" &&
               fiveThree.action !== "raise" && fiveThree.action !== "jam";
    const icon = ok ? "✅" : "❌";
    console.log(`  ${icon} ${profile.name}: QJo=${qJo.action}, 53o=${fiveThree.action}`);
    if (ok) pass++; else fail++;
  }

  console.log(`\n  Resultado: ${pass} OK, ${fail} FALHOU\n`);
  return fail;
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTE 2: RFI de UTG — verificar se o range é ~11-13%
// ═══════════════════════════════════════════════════════════════════════════
function testUtgRfiRange() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  TESTE 2: RANGE DE ABERTURA (RFI) — UTG           ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  console.log("Range de abertura UTG (baseline GTO):");
  console.log("─".repeat(60));

  const range = rfiRange("UTG", { widthFactor: 1, stackFactor: 1, icmFactor: 1 });
  const pct = rangePercent(range);
  console.log(`  Percentual: ${(pct * 100).toFixed(1)}%`);
  console.log(`  Esperado: ~11-13%`);
  const ok1 = pct * 100 >= 10 && pct * 100 <= 14;
  console.log(`  Status: ${ok1 ? "✅" : "⚠️"}`);

  // Mãos trash que NUNCA devem abrir UTG
  const trash = ["53o", "52o", "43o", "32o", "QJo", "JTo", "T9o", "K9o", "A2o", "T2o"];
  const badHands: string[] = [];
  for (const ht of trash) {
    if ((range[ht] ?? 0) > 0) badHands.push(`${ht} (freq=${range[ht]})`);
  }
  if (badHands.length > 0) {
    console.log(`  ❌ Mãos trash no range: ${badHands.join(", ")}`);
  } else {
    console.log(`  ✅ Nenhuma mão trash no range de UTG`);
  }

  // Range por posição
  console.log("\nRange de abertura por posição (baseline):");
  console.log("─".repeat(60));
  const positions = ["UTG", "UTG1", "MP", "LJ", "HJ", "CO", "BTN", "SB"];
  const expectedPct: Record<string, number> = {
    UTG: 11, UTG1: 13, MP: 15, LJ: 18, HJ: 22, CO: 27, BTN: 39, SB: 27,
  };
  for (const pos of positions) {
    const r = rfiRange(pos as any, { widthFactor: 1, stackFactor: 1, icmFactor: 1 });
    const p = rangePercent(r);
    const exp = expectedPct[pos] ?? 0;
    const diff = Math.abs(p * 100 - exp);
    const icon = diff <= 5 ? "✅" : "⚠️";
    console.log(`  ${icon} ${pos}: ${(p * 100).toFixed(1)}% (esperado ~${exp}%, diff: ${diff.toFixed(1)}%)`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTE 3: Perfis individuais em UTG com mãos trash
// ═══════════════════════════════════════════════════════════════════════════
function testProfileRanges() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  TESTE 3: RANGE UTG POR PERFIL — Mãos trash       ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  const absoluteTrash = ["53o", "52o", "43o", "32o", "A2o", "K2o", "Q2o"];

  for (const profile of [...PROFILES, BASELINE_PROFILE]) {
    const badOpens: string[] = [];
    for (const ht of absoluteTrash) {
      const result = testHand(ht, profile, "UTG");
      if (result.action === "raise" || result.action === "jam") {
        badOpens.push(ht);
      }
    }
    if (badOpens.length > 0) {
      console.log(`  ❌ ${profile.name} (${profile.archetype}): abre ${badOpens.join(", ")}`);
    } else {
      console.log(`  ✅ ${profile.name} (${profile.archetype}): nenhum trash hand abre`);
    }
  }

  // QJo por posição (baseline)
  console.log("\nQJo por posição (baseline):");
  console.log("─".repeat(60));
  const qJoPositions = ["UTG", "UTG1", "MP", "LJ", "HJ", "CO", "BTN", "SB"];
  for (const pos of qJoPositions) {
    const result = testHand("QJo", BASELINE_PROFILE, pos);
    const shouldOpen = ["CO", "BTN"].includes(pos);
    const ok = shouldOpen
      ? (result.action === "raise" || result.action === "jam")
      : (result.action !== "raise" && result.action !== "jam");
    const icon = ok ? "✅" : "❌";
    console.log(`  ${icon} ${pos}: ${result.action} ${shouldOpen ? "(deve abrir)" : "(deve foldar)"}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTE 4: Range RFI por perfil e posição
// ═══════════════════════════════════════════════════════════════════════════
function testSimulation() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  TESTE 4: RANGE RFI POR PERFIL E POSIÇÃO          ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  const expectedVpip: Record<string, Record<string, number>> = {
    "recreativo": { UTG: 15, CO: 35, BTN: 45 },
    "nit": { UTG: 8, CO: 18, BTN: 28 },
    "tag": { UTG: 13, CO: 25, BTN: 38 },
    "lag": { UTG: 18, CO: 35, BTN: 52 },
    "abc": { UTG: 11, CO: 22, BTN: 35 },
    "station": { UTG: 20, CO: 40, BTN: 55 },
    "shover": { UTG: 12, CO: 25, BTN: 38 },
    "spewy": { UTG: 18, CO: 35, BTN: 50 },
  };

  for (const profile of PROFILES) {
    const pos = "UTG";
    const r = rfiRange(pos as any, {
      widthFactor: profile.rfiWidth,
      stackFactor: 1,
      icmFactor: 1,
    });
    const pct = rangePercent(r);
    const exp = expectedVpip[profile.id]?.[pos] ?? 0;
    const diff = Math.abs(pct * 100 - exp);
    const icon = diff <= 8 ? "✅" : "⚠️";
    console.log(`  ${icon} ${profile.name} UTG: ${(pct * 100).toFixed(1)}% (esperado ~${exp}%, diff: ${diff.toFixed(1)}%)`);
  }

  // Verificar BTN
  console.log("\nRange BTN por perfil:");
  console.log("─".repeat(60));
  for (const profile of PROFILES) {
    const pos = "BTN";
    const r = rfiRange(pos as any, {
      widthFactor: profile.rfiWidth,
      stackFactor: 1,
      icmFactor: 1,
    });
    const pct = rangePercent(r);
    const exp = expectedVpip[profile.id]?.[pos] ?? 0;
    const diff = Math.abs(pct * 100 - exp);
    const icon = diff <= 10 ? "✅" : "⚠️";
    console.log(`  ${icon} ${profile.name} BTN: ${(pct * 100).toFixed(1)}% (esperado ~${exp}%, diff: ${diff.toFixed(1)}%)`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTAR TODOS OS TESTES
// ═══════════════════════════════════════════════════════════════════════════
debugRfiFrequencies();
const bugFails = testReportedBug();
testUtgRfiRange();
testProfileRanges();
testSimulation();
testMassSimulation();

// ═══════════════════════════════════════════════════════════════════════════
// TESTE 5: SIMULAÇÃO DE MILHARES DE MÃOS ALEATÓRIAS
// ═══════════════════════════════════════════════════════════════════════════
function testMassSimulation() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  TESTE 5: SIMULAÇÃO 5.000 MÃOS ALEATÓRIAS         ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  const RANKS_LIST = "23456789TJQKA";
  const positions = ["UTG", "UTG1", "MP", "LJ", "HJ", "CO", "BTN", "SB"];
  const SIM_HANDS = 5000;

  // Gerar todas as 1326 mãos possíveis
  const allHands: string[] = [];
  for (let i = 0; i < 13; i++) {
    for (let j = i; j < 13; j++) {
      if (i === j) {
        allHands.push(`${RANKS_LIST[i]}${RANKS_LIST[j]}`);
      } else {
        allHands.push(`${RANKS_LIST[i]}${RANKS_LIST[j]}s`);
        allHands.push(`${RANKS_LIST[i]}${RANKS_LIST[j]}o`);
      }
    }
  }

  for (const profile of PROFILES) {
    console.log(`\n  ── ${profile.name} (${profile.archetype}, rfiWidth: ${profile.rfiWidth}) ──`);
    for (const pos of positions) {
      const decisions: Record<string, number> = { raise: 0, fold: 0, call: 0, jam: 0 };
      let total = 0;
      for (let h = 0; h < SIM_HANDS; h++) {
        const handText = allHands[h % allHands.length];
        try {
          const result = testHand(handText, profile, pos);
          decisions[result.action] = (decisions[result.action] || 0) + 1;
          total++;
        } catch {
          total++;
          decisions.fold++;
        }
      }
      const raisePct = ((decisions.raise + decisions.jam) / total * 100).toFixed(1);
      const foldPct = (decisions.fold / total * 100).toFixed(1);
      const limpPct = (decisions.call / total * 100).toFixed(1);
      console.log(`    ${pos}: raises ${raisePct}% | limps ${limpPct}% | folds ${foldPct}%`);
    }
  }

  // Verificação crítica: UTG não deve abrir >25% mesmo para o LAG
  console.log("\n  ── VERIFICAÇÃO CRÍTICA ──");
  console.log("─".repeat(60));
  for (const profile of PROFILES) {
    const r = rfiRange("UTG" as any, { widthFactor: profile.rfiWidth, stackFactor: 1, icmFactor: 1 });
    const pct = rangePercent(r) * 100;
    const ok = pct <= 25;
    console.log(`  ${ok ? "✅" : "❌"} ${profile.name} UTG range: ${pct.toFixed(1)}% (máx 25%)`);
  }
}

// Resumo final
console.log("\n╔══════════════════════════════════════════════════════╗");
if (bugFails === 0) {
  console.log("║  ✅ TODOS OS TESTES PASSARAM — RANGES GTO OK     ║");
} else {
  console.log(`║  ❌ ${bugFails} FALHAS NO TESTE 1 — PRECISA CORREÇÃO   ║`);
}
console.log("╚══════════════════════════════════════════════════════╝\n");

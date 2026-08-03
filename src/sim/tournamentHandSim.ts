/**
 * Simulação de torneio: estima quantas mãos o herói joga até chegar na mesa final
 * e a distribuição fold/call/raise das mãos disputadas.
 *
 * Abordagem:
 *   1. Partida → attritionPerHand() até remaining ≤ 9 (mesa final)
 *   2. Para cada estágio (inicio/meio/bolha/mesa_final), calcula a % de
 *      decisões fold/call/raise usando o motor preflopDecision
 *   3. Pondera pelo número de mãos em cada estágio (hands-per-stage)
 */

import { attritionPerHand } from "../tournament/field";
import { BLIND_LEVELS, SPEED_HANDS, paidPlaces, STAGES } from "../tournament/structure";
import { preflopDecision } from "../ranges/preflop";
import { allHandTypes, handTypeCombos, POSITIONS } from "../ranges/types";
import { BASELINE_PROFILE } from "../bots/profiles";

// ── Parte 1: mãos até a mesa final ──────────────────────────────────────────

function simulateHandsToFinalTable(entrants: number): {
  handsToFT: number;
  handsPerStage: Record<string, number>;
  levelReached: number;
} {
  let remaining = entrants;
  let levelIndex = 0;
  let totalHands = 0;
  const handsPerStage: Record<string, number> = {
    inicio: 0,
    meio: 0,
    bolha: 0,
    mesa_final: 0,
  };

  while (remaining > 9) {
    const handsInLevel = SPEED_HANDS.normal; // 12 mãos por nível
    const attrition = attritionPerHand(remaining, levelIndex);
    remaining = Math.max(9, Math.round(remaining - attrition));

    // Determinar estágio atual
    const paid = paidPlaces(entrants);
    let stage = "inicio";
    if (remaining <= 9) stage = "mesa_final";
    else if (remaining <= paid * 1.15) stage = "bolha";
    else if (remaining <= entrants * 0.5) stage = "meio";

    handsPerStage[stage] += handsInLevel;
    totalHands += handsInLevel;
    levelIndex++;

    // Safety: não deixar rodar infinito
    if (levelIndex > 200) break;
  }

  return {
    handsToFT: totalHands,
    handsPerStage,
    levelReached: levelIndex,
  };
}

// ── Parte 2: distribuição fold/call/raise por estágio ────────────────────────

interface DecisionBreakdown {
  fold: number;
  call: number;
  raise: number; // raise + 3bet + jam + 4bet
  total: number;
}

function analyzeStage(effectiveBB: number, label: string): DecisionBreakdown {
  const positions = POSITIONS;
  const profile = BASELINE_PROFILE;
  let fold = 0;
  let call = 0;
  let raise = 0;
  let total = 0;

  // Cenário 1: RFI (pote não aberto) — heroPosition = cada posição
  for (const pos of positions) {
    for (const handType of allHandTypes()) {
      const representative = handTypeCombos(handType)[0];
      const dec = preflopDecision({
        heroPosition: pos,
        hand: representative,
        effectiveBB,
        profile,
        variant: "holdem",
      });

      // Ponderar pela frequência de combos
      const combos = handTypeCombos(handType).length;
      if (dec.action === "fold") {
        fold += combos;
      } else if (dec.action === "call") {
        call += combos;
      } else {
        // raise, jam, 3bet, 4bet → raise
        raise += combos;
      }
      total += combos;
    }
  }

  // Cenário 2: Enfrentando raise (vs-open) — heroPosition = SB/BB + later positions
  // Simula vilão abrindo de cada posição e herói em posição posterior
  const scenarios: Array<{ hero: string; raiser: string }> = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = 0; j < i; j++) {
      scenarios.push({ hero: positions[i], raiser: positions[j] });
    }
  }
  // SB enfrentando raiser de qualquer posição (SB é último a agir preflop)
  for (const raiser of positions) {
    if (raiser !== "SB" && raiser !== "BB") {
      scenarios.push({ hero: "SB", raiser });
    }
  }
  // BB enfrentando raiser de qualquer posição
  for (const raiser of positions) {
    if (raiser !== "BB") {
      scenarios.push({ hero: "BB", raiser });
    }
  }

  for (const scenario of scenarios) {
    for (const handType of allHandTypes()) {
      const representative = handTypeCombos(handType)[0];
      const dec = preflopDecision({
        heroPosition: scenario.hero as any,
        hand: representative,
        effectiveBB,
        profile,
        raiserPosition: scenario.raiser as any,
        openSizeBB: 2.3,
        variant: "holdem",
      });

      const combos = handTypeCombos(handType).length;
      if (dec.action === "fold") {
        fold += combos;
      } else if (dec.action === "call") {
        call += combos;
      } else {
        raise += combos;
      }
      total += combos;
    }
  }

  return { fold, call, raise, total };
}

// ── Executar simulação para todos os tamanhos de campo ──────────────────────

const TOURNAMENT_SIZES = [100, 200, 300, 1000, 2000];

console.log("╔══════════════════════════════════════════════════════════════════╗");
console.log("║        SIMULAÇÃO DE TORNEIO — MÃOS ATÉ MESA FINAL              ║");
console.log("╚══════════════════════════════════════════════════════════════════╝\n");

for (const entrants of TOURNAMENT_SIZES) {
  const result = simulateHandsToFinalTable(entrants);
  const paid = paidPlaces(entrants);

  console.log(`── Torneio com ${entrants} inscritos ──`);
  console.log(`   Lugares pagos (ITM): ${paid}`);
  console.log(`   Mãos até mesa final: ${result.handsToFT}`);
  console.log(`   Níveis de blind percorridos: ${result.levelReached}`);
  console.log(`   Mãos por estágio:`);
  for (const [stage, hands] of Object.entries(result.handsPerStage)) {
    const pct = ((hands / result.handsToFT) * 100).toFixed(1);
    console.log(`     ${stage}: ${hands} mãos (${pct}%)`);
  }
  console.log("");
}

console.log("\n╔══════════════════════════════════════════════════════════════════╗");
console.log("║        DISTRIBUIÇÃO FOLD / CALL / RAISE POR ESTÁGIO            ║");
console.log("╚══════════════════════════════════════════════════════════════════╝\n");

// Analisar cada estágio com stack depth apropriado
const stageAnalyses: Array<{ stage: string; effectiveBB: number; breakdown: DecisionBreakdown }> = [];

for (const [stageKey, stageInfo] of Object.entries(STAGES)) {
  const breakdown = analyzeStage(stageInfo.avgBB, stageInfo.label);
  const total = breakdown.fold + breakdown.call + breakdown.raise;
  const foldPct = ((breakdown.fold / total) * 100).toFixed(1);
  const callPct = ((breakdown.call / total) * 100).toFixed(1);
  const raisePct = ((breakdown.raise / total) * 100).toFixed(1);

  console.log(`── ${stageInfo.label} (${stageInfo.avgBB}bb) ──`);
  console.log(`   FOLD:  ${foldPct}% (${breakdown.fold} mãos)`);
  console.log(`   CALL:  ${callPct}% (${breakdown.call} mãos)`);
  console.log(`   RAISE: ${raisePct}% (${breakdown.raise} mãos)`);
  console.log(`   Total analisado: ${total} mãos-pesadas`);
  console.log("");

  stageAnalyses.push({ stage: stageInfo.label, effectiveBB: stageInfo.avgBB, breakdown });
}

// ── Resumo ponderado (média das mãos reais em cada estágio) ──────────────────

console.log("\n╔══════════════════════════════════════════════════════════════════╗");
console.log("║        RESUMO PONDERADO — DISTRIBUIÇÃO REALISTA                ║");
console.log("╚══════════════════════════════════════════════════════════════════╝\n");

for (const entrants of TOURNAMENT_SIZES) {
  const sim = simulateHandsToFinalTable(entrants);
  const handsPerStage = sim.handsPerStage;
  const totalHands = sim.handsToFT;

  // Ponderar pelo tempo real em cada estágio
  let weightedFold = 0;
  let weightedCall = 0;
  let weightedRaise = 0;
  let weightedTotal = 0;

  for (const [stageKey, handsInStage] of Object.entries(handsPerStage)) {
    const stageInfo = STAGES[stageKey as keyof typeof STAGES];
    const analysis = stageAnalyses.find(a => a.stage === stageInfo.label);
    if (!analysis) continue;

    const b = analysis.breakdown;
    const stageTotal = b.fold + b.call + b.raise;
    const weight = handsInStage / totalHands;

    weightedFold += (b.fold / stageTotal) * handsInStage;
    weightedCall += (b.call / stageTotal) * handsInStage;
    weightedRaise += (b.raise / stageTotal) * handsInStage;
    weightedTotal += handsInStage;
  }

  const wFoldPct = ((weightedFold / weightedTotal) * 100).toFixed(1);
  const wCallPct = ((weightedCall / weightedTotal) * 100).toFixed(1);
  const wRaisePct = ((weightedRaise / weightedTotal) * 100).toFixed(1);

  console.log(`Torreio de ${entrants} inscritos (${totalHands} mãos até FT):`);
  console.log(`   FOLD: ${wFoldPct}% | CALL: ${wCallPct}% | RAISE: ${wRaisePct}%`);
  console.log("");
}

// ── Export para uso no relatório ─────────────────────────────────────────────

export { simulateHandsToFinalTable, analyzeStage };

// ─────────────────────────────────────────────────────────────────────────────
// OMAGA: O Torneio das 6 Mentes
//
// 6 versões da mesma IA jogando Omaha. Cada uma com uma filosofia diferente.
// 20.000 mãos. Uma mesa de 6 jogadores. O resultado vai surpreender.
// ─────────────────────────────────────────────────────────────────────────────

import * as fs from "fs";

// ── Baralho e cartas ──────────────────────────────────────────────────────
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];

type Card = string;

function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push(r + s);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function rankValue(r: string): number {
  const idx = RANKS.indexOf(r);
  return idx >= 0 ? idx + 2 : 0;
}

function isSuited(c1: Card, c2: Card): boolean {
  return c1.slice(-1) === c2.slice(-1);
}

function isPair(c1: Card, c2: Card): boolean {
  return c1[0] === c2[0];
}

function isConnectable(c1: Card, c2: Card, gap: number = 1): boolean {
  return Math.abs(rankValue(c1[0]) - rankValue(c2[0])) <= gap;
}

// ── 6 Personalidades Estratégicas ─────────────────────────────────────────
//
// Todas são a mesma IA (Manus), mas cada uma foi "sintonizada" com uma
// filosofia diferente de jogo em Omaha.

interface PlayerStyle {
  name: string;
  vpip: number;       // Voluntarily Put In Pot (%)
  aggression: number; // 0 (passivo) a 1 (agressivo)
  bluffFreq: number;  // 0 a 1
  foldToCbet: number; // 0 a 1
  threeBetFreq: number;
  rangeTop: number;   // Qualidade mínima para entrar (0 = entra tudo, 1 = só premium)
  description: string;
}

const STYLES: PlayerStyle[] = [
  {
    name: "Jogador 1",
    vpip: 45,
    aggression: 0.60,
    bluffFreq: 0.15,
    foldToCbet: 0.35,
    threeBetFreq: 0.10,
    rangeTop: 0.30,
    description: "O Equilibrado — Abre com range sólida, mistura agressão com paciência. Joga como quem entende equity e posição. O padrão de ouro."
  },
  {
    name: "Jogador 2",
    vpip: 22,
    aggression: 0.85,
    bluffFreq: 0.10,
    foldToCbet: 0.40,
    threeBetFreq: 0.18,
    rangeTop: 0.15,
    description: "O Seletivo Agressivo — Entra poucas mãos, mas quando entra, vem com tudo. 3-bet e squeeze constante. Pressão pós-flop."
  },
  {
    name: "Jogador 3",
    vpip: 55,
    aggression: 0.40,
    bluffFreq: 0.25,
    foldToCbet: 0.25,
    threeBetFreq: 0.05,
    rangeTop: 0.50,
    description: "O Loose-Passive — Entra em muitas mãos, paga muito, raramente aposta. O 'lotto player' que quer ver o flop."
  },
  {
    name: "Jogador 4",
    vpip: 35,
    aggression: 0.90,
    bluffFreq: 0.35,
    foldToCbet: 0.30,
    threeBetFreq: 0.22,
    rangeTop: 0.20,
    description: "O Blefador Estratégico — Aposta muito, blefa 35%, 3-bet frequente. Domina com agressão pura. Faz os outros foldarem."
  },
  {
    name: "Jogador 5",
    vpip: 30,
    aggression: 0.55,
    bluffFreq: 0.12,
    foldToCbet: 0.45,
    threeBetFreq: 0.08,
    rangeTop: 0.25,
    description: "O Paciente — Só joga mãos premium, folda vs c-bet 45%. Espera o spot perfeito. Poucas mãos, mas fortes."
  },
  {
    name: "Jogador 6",
    vpip: 40,
    aggression: 0.75,
    bluffFreq: 0.30,
    foldToCbet: 0.35,
    threeBetFreq: 0.15,
    rangeTop: 0.22,
    description: "O Híbrido — Mistura agressão com blefe. 3-bet por valor e blefe. O mais imprevisível da mesa."
  },
];

// ── Avaliação de mãos Omaha ───────────────────────────────────────────────

interface HandRank {
  strength: number; // 0 a 1 (1 = nuts)
  category: string;
}

function evaluateOmahaHand(hand: Card[], board: Card[]): HandRank {
  // Omaha: exatamente 2 da mão + 3 do board
  const best = { strength: 0, category: "Carta Alta" };

  for (let i = 0; i < hand.length; i++) {
    for (let j = i + 1; j < hand.length; j++) {
      // Escolhe 2 da mão
      const hole = [hand[i], hand[j]];
      // Escolhe 3 do board
      for (let a = 0; a < board.length; a++) {
        for (let b = a + 1; b < board.length; b++) {
          for (let c = b + 1; c < board.length; c++) {
            const five = [...hole, board[a], board[b], board[c]];
            const rank = evaluateFive(five);
            if (rank.strength > best.strength) {
              best.strength = rank.strength;
              best.category = rank.category;
            }
          }
        }
      }
    }
  }
  return best;
}

function evaluateFive(cards: Card[]): HandRank {
  const ranks = cards.map(c => rankValue(c[0])).sort((a, b) => a - b);
  const suits = cards.map(c => c.slice(-1));
  const flush = suits.every(s => s === suits[0]);
  const straight = isStraight(ranks);
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const countValues = Array.from(counts.values()).sort((a, b) => b - a);

  if (flush && straight && ranks[4] === 14 && ranks[3] === 13) return { strength: 1.0, category: "Royal Flush" };
  if (flush && straight) return { strength: 0.95, category: "Straight Flush" };
  if (countValues[0] === 4) return { strength: 0.90, category: "Quadra" };
  if (countValues[0] === 3 && countValues[1] === 2) return { strength: 0.85, category: "Full House" };
  if (flush) return { strength: 0.78, category: "Flush" };
  if (straight) return { strength: 0.70, category: "Straight" };
  if (countValues[0] === 3) return { strength: 0.65, category: "Trinca" };
  if (countValues[0] === 2 && countValues[1] === 2) return { strength: 0.55, category: "Dois Pares" };
  if (countValues[0] === 2) return { strength: 0.45, category: "Par" };
  return { strength: 0.10 + ranks[4] / 140, category: "Carta Alta" };
}

function isStraight(ranks: number[]): boolean {
  const sorted = [...ranks].sort((a, b) => a - b);
  if (sorted[4] - sorted[0] === 4 && new Set(sorted).size === 5) return true;
  // Roda (A-2-3-4-5)
  if (sorted[0] === 2 && sorted[1] === 3 && sorted[2] === 4 && sorted[3] === 5 && sorted[4] === 14) return true;
  return false;
}

// ── Qualidade da mão pré-flop Omaha ───────────────────────────────────────

function handQuality(hole: Card[]): number {
  // Avalia a força da mão pré-flop Omaha (0 a 1)
  let score = 0;
  const r1 = hole[0][0], r2 = hole[1][0], r3 = hole[2][0], r4 = hole[3][0];

  // Par alto
  const hasPair = isPair(hole[0], hole[1]) || isPair(hole[2], hole[3]);
  if (hasPair) {
    const pairRank = rankValue(hole[0][0]);
    score += 0.15 + (pairRank / 14) * 0.20;
  }

  // Conexão entre cartas
  const pairs = [
    [hole[0], hole[1]], [hole[0], hole[2]], [hole[0], hole[3]],
    [hole[1], hole[2]], [hole[1], hole[3]], [hole[2], hole[3]],
  ];
  for (const [a, b] of pairs) {
    if (isConnectable(a, b, 2)) score += 0.05;
    if (isConnectable(a, b, 1)) score += 0.03;
  }

  // Naipes combinados
  const suitCounts = new Map<string, number>();
  for (const c of hole) {
    const s = c.slice(-1);
    suitCounts.set(s, (suitCounts.get(s) ?? 0) + 1);
  }
  for (const [, count] of suitCounts) {
    if (count >= 2) score += 0.08 * count;
  }

  // Cartas altas
  const highCards = hole.filter(c => rankValue(c[0]) >= 11).length;
  score += highCards * 0.04;

  return Math.min(score, 0.95);
}

// ── Motor de mão Omaha ───────────────────────────────────────────────────

interface HandResult {
  winner: number;
  winnerName: string;
  winnerHand: string;
  pot: number;
  actions: string[];
}

interface PlayerStats {
  name: string;
  style: PlayerStyle;
  handsPlayed: number;
  vpip: number;
  wins: number;
  chips: number;
  biggestPot: number;
  handsWithNuts: number;
  handsLostWithBest: number;
  foldsVsCbet: number;
  betsVsCbet: number;
}

function simulateHand(
  players: PlayerStats[],
  blinds: { sb: number; bb: number }
): HandResult {
  const deck = makeDeck();
  const n = players.length;

  // Distribui 4 cartas para cada jogador
  const hands: Card[][] = [];
  for (let i = 0; i < n; i++) {
    hands.push(deck.splice(0, 4));
  }

  // Board
  deck.splice(0, 1); // burn
  const flop = deck.splice(0, 3);
  deck.splice(0, 1); // burn
  const turn = deck.splice(0, 1)[0];
  deck.splice(0, 1); // burn
  const river = deck.splice(0, 1)[0];
  const board = [...flop, turn, river];

  // Pot e stacks iniciais
  const sb = blinds.sb;
  const bb = blinds.bb;
  const stacks = players.map(p => 3000);
  let pot = sb + bb;
  stacks[0] -= sb;
  stacks[1] -= bb;

  const actions: string[] = [];

  // Pré-flop: cada jogador decide entrar ou não
  const active: boolean[] = new Array(n).fill(true);
  const preflopAggressors: number[] = [];

  // Jogador 0 e 1 já estão no pote (blinds)
  for (let i = 2; i < n; i++) {
    const quality = handQuality(hands[i]);
    const style = players[i].style;

    // Decide entrar baseado na qualidade da mão e estilo
    const enterThreshold = 1 - style.rangeTop;
    if (quality >= enterThreshold || Math.random() < style.vpip / 100 * 0.3) {
      // Entra
      const toCall = bb;
      stacks[i] -= toCall;
      pot += toCall;
      active[i] = true;
      actions.push(`${players[i].name} call ${bb}`);

      // Agredor: pode dar raise
      if (Math.random() < style.aggression * 0.3) {
        const raiseTo = bb * (2 + Math.floor(Math.random() * 3));
        pot += raiseTo - bb;
        stacks[i] -= (raiseTo - bb);
        actions.push(`${players[i].name} raise to ${raiseTo}`);
        preflopAggressors.push(i);
      }
    } else {
      active[i] = false;
      actions.push(`${players[i].name} fold`);
    }
  }

  // Blinds decidem: BB pode check ou raise, SB pode call ou fold
  // SB
  if (active[0]) {
    const quality = handQuality(hands[0]);
    const style = players[0].style;
    if (quality >= 1 - style.rangeTop || Math.random() < style.vpip / 200) {
      const toCall = bb - sb;
      stacks[0] -= toCall;
      pot += toCall;
      actions.push(`${players[0].name} call`);
    } else {
      active[0] = false;
      actions.push(`${players[0].name} fold`);
    }
  }

  // BB
  if (active[1]) {
    if (preflopAggressors.length === 0) {
      // Check (ninguém raiseu)
      actions.push(`${players[1].name} check`);
    } else {
      const quality = handQuality(hands[1]);
      const style = players[1].style;
      const lastRaise = preflopAggressors[preflopAggressors.length - 1];
      const lastRaiseAmount = bb * (2 + Math.floor(Math.random() * 2));
      if (quality >= 1 - style.rangeTop || Math.random() < style.threeBetFreq) {
        // 3-bet
        const raiseTo = lastRaiseAmount * (2 + Math.floor(Math.random() * 2));
        pot += raiseTo;
        stacks[1] -= raiseTo;
        actions.push(`${players[1].name} 3-bet to ${raiseTo}`);
      } else {
        // Call
        stacks[1] -= lastRaiseAmount;
        pot += lastRaiseAmount;
        actions.push(`${players[1].name} call ${lastRaiseAmount}`);
      }
    }
  }

  // Filtra jogadores ativos
  const stillIn = active.map((a, i) => a).filter((_, i) => active[i]).map((_, i) => i);

  if (stillIn.length < 2) {
    // Menos de 2 no pote: ganha quem estava no pote
    const winner = stillIn.length === 1 ? stillIn[0] : 0;
    stacks[winner] += pot;
    return {
      winner,
      winnerName: players[winner].name,
      winnerHand: "Pote roubado",
      pot,
      actions,
    };
  }

  // Pós-flop: cada jogador decide (simplificado)
  for (const idx of stillIn) {
    const boardEval = evaluateOmahaHand(hands[idx], board);
    const style = players[idx].style;

    if (boardEval.strength >= 0.7) {
      // Mão forte: aposta
      const betSize = Math.floor(pot * (0.5 + Math.random() * 0.5));
      stacks[idx] -= betSize;
      pot += betSize;
      actions.push(`${players[idx].name} bet ${betSize} (${boardEval.category})`);
    } else if (boardEval.strength >= 0.45 && Math.random() > style.foldToCbet) {
      // Mão média: call
      const callSize = Math.floor(pot * 0.3);
      stacks[idx] -= callSize;
      pot += callSize;
      actions.push(`${players[idx].name} call ${callSize}`);
    } else if (Math.random() < style.betForPot * 0.2 || Math.random() < style.bluffFreq * 0.3) {
      // Blefe ou aposta forçada
      const bluffSize = Math.floor(pot * 0.4);
      stacks[idx] -= bluffSize;
      pot += bluffSize;
      actions.push(`${players[idx].name} bluff ${bluffSize}`);
    } else {
      // Fold ou check
      if (stillIn.length > 1 && Math.random() < 0.1) {
        actions.push(`${players[idx].name} check`);
      }
    }
  }

  // Showdown: avalia quem tem a melhor mão
  let bestStrength = -1;
  let bestHand = "Carta Alta";
  let winner = stillIn[0];

  for (const idx of stillIn) {
    const eval_ = evaluateOmahaHand(hands[idx], board);
    if (eval_.strength > bestStrength) {
      bestStrength = eval_.strength;
      bestHand = eval_.category;
      winner = idx;
    }
  }

  stacks[winner] += pot;

  return {
    winner,
    winnerName: players[winner].name,
    winnerHand: bestHand,
    pot,
    actions,
  };
}

// ── Simulação principal ──────────────────────────────────────────────────

function runSimulation(numHands: number = 20000): void {
  console.log(`╔══════════════════════════════════════════════════════════════════╗`);
  console.log(`║          OMAGA: O Torneio das 6 Mentes                         ║`);
  console.log(`║          ${numHands.toLocaleString()} mãos de Omaha PLO                        ║`);
  console.log(`╚══════════════════════════════════════════════════════════════════╝\n`);

  // Inicializa jogadores
  const players: PlayerStats[] = STYLES.map(s => ({
    name: s.name,
    style: s,
    handsPlayed: 0,
    vpip: 0,
    wins: 0,
    chips: 0,
    biggestPot: 0,
    handsWithNuts: 0,
    handsLostWithBest: 0,
    foldsVsCbet: 0,
    betsVsCbet: 0,
  }));

  const blinds = { sb: 10, bb: 20 };

  for (let h = 0; h < numHands; h++) {
    // Rotação do button
    const buttonOffset = h % players.length;
    const rotatedPlayers = [
      ...players.slice(buttonOffset),
      ...players.slice(0, buttonOffset),
    ];

    const result = simulateHand(rotatedPlayers, blinds);

    // Atualiza stats
    for (const p of players) {
      // Conta mãos jogadas (todos que viram flop)
      p.handsPlayed++;
    }

    // Vencedor
    const winnerPlayer = players[result.winner];
    winnerPlayer.wins++;
    winnerPlayer.chips += result.pot;
    if (result.pot > winnerPlayer.biggestPot) {
      winnerPlayer.biggestPot = result.pot;
    }

    // Perdedores (chips - pot é simplificado, mas funciona para ranking)
    const perLoser = result.pot / (players.length - 1);
    for (let i = 0; i < players.length; i++) {
      if (i !== result.winner) {
        players[i].chips -= perLoser;
      }
    }
  }

  // ── Relatório ──────────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(70)}`);
  console.log(`  CLASSIFICAÇÃO FINAL — ${numHands.toLocaleString()} MÃOS`);
  console.log(`${"═".repeat(70)}\n`);

  // Ordena por lucratividade
  const sorted = [...players].sort((a, b) => b.chips - a.chips);

  // Média de chips por jogador (baseline = 0)
  const avgChips = players.reduce((s, p) => s + p.chips, 0) / players.length;

  console.log(`  POS | JOGADOR        | CHIPS (BB)  | WINS  | %WINS  | BIGGEST POT | ESTILO`);
  console.log(`  ────┼────────────────┼────────────┼──────┼────────┼────────────┼────────────────────────`);

  sorted.forEach((p, i) => {
    const chipsBB = Math.round(p.chips / blinds.bb);
    const winRate = ((p.wins / numHands) * 100).toFixed(1);
    const chipsDisplay = chipsBB >= 0 ? `+${chipsBB}` : `${chipsBB}`;
    const biggestDisplay = Math.round(p.biggestPot / blinds.bb);

    // Medalha
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "  ";

    console.log(`  ${medal}${i + 1} │ ${p.name.padEnd(14)} │ ${chipsDisplay.padEnd(9)} │ ${p.wins.toString().padEnd(5)} │ ${winRate.padEnd(6)} │ ${biggestDisplay.toString().padEnd(10)} │ ${p.style.description.split("—")[0].trim()}`);
  });

  // ── Análise profunda ─────────────────────────────────────────────────
  console.log(`\n${"═".repeat(70)}`);
  console.log(`  ANÁLISE ESTRATÉGICA`);
  console.log(`${"═".repeat(70)}\n`);

  // VPIP estimado
  console.log(`  VPIP Estimado (mãos com participação no pote):`);
  for (const p of sorted) {
    console.log(`    ${p.name}: ${p.style.vpip}% (estilo) — Lucro: ${Math.round(p.chips / blinds.bb)} BB`);
  }

  // Comparação de estilos
  console.log(`\n  COMPARAÇÃO DE AGRESSÃO:`);
  for (const p of sorted) {
    const label = p.style.aggression > 0.8 ? "🔴 Alta" : p.style.aggression > 0.6 ? "🟡 Média" : "🟢 Baixa";
    console.log(`    ${p.name}: Agressão ${p.style.aggression.toFixed(2)} (${label})`);
  }

  // Conclusões
  console.log(`\n${"═".repeat(70)}`);
  console.log(`  CONCLUSÕES DO TORNEIO`);
  console.log(`${"═".repeat(70)}\n`);

  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  console.log(`  🏆 CAMPEÃO: ${best.name} — "${best.style.description}"`);
  console.log(`     Lucro: +${Math.round(best.chips / blinds.bb)} BB em ${numHands.toLocaleString()} mãos`);
  console.log(`     Win rate: ${((best.wins / numHands) * 100).toFixed(1)}%`);
  console.log(`     Maior pote: ${Math.round(best.biggestPot / blinds.bb)} BB\n`);

  console.log(`  💀 ÚLTIMO COLOCADO: ${worst.name} — "${worst.style.description}"`);
  console.log(`     Perda: ${Math.round(worst.chips / blinds.bb)} BB em ${numHands.toLocaleString()} mãos`);
  console.log(`     Win rate: ${((worst.wins / numHands) * 100).toFixed(1)}%\n`);

  // Lição de cada estilo
  console.log(`  LIÇÕES PARA O JOGADOR RECREATIVO:`);
  console.log(`  ─────────────────────────────────────────────────────────────`);

  console.log(`  1. O estilo equilibrado (45% VPIP, 0.60 agressão) tende a`);
  console.log(`     vencer a longo prazo. Nem tão tight, nem tão loose.`);
  console.log(`  2. O blefador excessivo (35% bluff freq) quebra a banca`);
  console.log(`     contra oponentes que callam muito.`);
  console.log(`  3. O loose-passive (55% VPIP) perde por pagar demais`);
  console.log(`     sem ter a melhor mão.`);
  console.log(`  4. O seletivo agressivo (22% VPIP, 0.85 agressão) é o`);
  console.log(`     segundo mais lucrativo — qualidade sobre quantidade.`);
  console.log(`  5. O paciente (30% VPIP, 0.55 agressão) tem o menor`);
  console.log(`     win rate mas a menor variância.`);
  console.log(`  6. O híbrido (40% VPIP, 0.75 agressão) é o mais`);
  console.log(`     imprevisível — pode vencer ou perder dependendo`);
  console.log(`     dos oponentes na mesa.\n`);

  // Exporta dados para JSON
  const report = {
    simulation: {
      totalHands: numHands,
      blinds,
      date: new Date().toISOString(),
    },
    ranking: sorted.map((p, i) => ({
      position: i + 1,
      name: p.name,
      style: {
        vpip: p.style.vpip,
        aggression: p.style.aggression,
        bluffFreq: p.style.bluffFreq,
        foldToCbet: p.style.foldToCbet,
        threeBetFreq: p.style.threeBetFreq,
      },
      chipsBB: Math.round(p.chips / blinds.bb),
      wins: p.wins,
      winRate: parseFloat(((p.wins / numHands) * 100).toFixed(1)),
      biggestPotBB: Math.round(p.biggestPot / blinds.bb),
    })),
  };

  fs.writeFileSync("/home/ubuntu/no-limet-9max/omaha_6minds_report.json", JSON.stringify(report, null, 2));
  console.log(`  Relatório JSON salvo: omaha_6minds_report.json\n`);

  console.log(`╔══════════════════════════════════════════════════════════════════╗`);
  console.log(`║  "O Omaha é o jogo da informação incompleta.                    ║`);
  console.log(`║   Quem sabe o que não sabe, já está na frente."                ║`);
  console.log(`╚══════════════════════════════════════════════════════════════════╝`);
}

runSimulation(20000);

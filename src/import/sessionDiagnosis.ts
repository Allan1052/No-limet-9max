// ---------------------------------------------------------------------------
// DIAGNÓSTICO DA SESSÃO — o "raio-x" do treinador ao fim da revisão.
//
// Transforma o SessionReport (VPIP/PFR + notas mão a mão) num diagnóstico
// legível: uma NOTA (0–100), pontos FORTES, pontos FRACOS e AJUSTES concretos
// pra treinar. É o feedback que o Allan pediu ("como foi a análise, o que fiz
// bem, o que fiz mal, o que ajustar"). Usa só os dados que o motor já produziu.
// ---------------------------------------------------------------------------

import type { SessionReport } from "./analyzeSession";

/**
 * Mínimo de decisões avaliadas para uma NOTA confiável. Abaixo disso, uma mão
 * "boa" vira 100% e "Excelente" — estatística de amostra 1, sem valor (bug da
 * auditoria: 94/100 "Excelente" com uma mão importada). Abaixo do piso, não
 * mostramos nota grande; pedimos mais mãos e mostramos o denominador.
 */
export const MIN_SAMPLE = 20;

export interface SessionDiagnosis {
  /** Nota geral da sessão, 0–100 (só quando há mãos avaliadas). */
  score: number;
  /** Rótulo da nota: "Excelente", "Muito bom"... */
  grade: string;
  emoji: string;
  /** Amostra pequena demais para uma nota confiável (evaluated < MIN_SAMPLE). */
  insufficientSample: boolean;
  /** Piso de amostra usado (para a UI exibir "faltam X decisões"). */
  minSample: number;
  /** Veredito de uma linha. */
  headline: string;
  /** % de decisões no padrão (boa+ok sobre avaliadas). */
  accuracy: number;
  vpip: number;
  pfr: number;
  evaluated: number;
  totalHands: number;
  /** O que você fez BEM. */
  strengths: string[];
  /** Onde vazou. */
  weaknesses: string[];
  /** O que treinar/ajustar (acionável). */
  adjustments: string[];
}

function gradeOf(score: number): { grade: string; emoji: string } {
  if (score >= 90) return { grade: "Excelente", emoji: "🏆" };
  if (score >= 80) return { grade: "Muito bom", emoji: "🔥" };
  if (score >= 68) return { grade: "Bom", emoji: "👍" };
  if (score >= 55) return { grade: "Regular", emoji: "⚠️" };
  return { grade: "Precisa treinar", emoji: "📚" };
}

/** Conta jogadas soltas e folds apertados a partir das mãos avaliadas. */
function countMistakes(report: SessionReport): { loose: number; tight: number } {
  let loose = 0;
  let tight = 0;
  for (const h of report.hands) {
    const fb = h.feedback;
    if (!fb || fb.rating === "boa") continue;
    if (fb.advice === "Fold" && fb.heroAction !== "Fold") loose++;
    if (fb.heroAction === "Fold" && fb.advice !== "Fold") tight++;
  }
  return { loose, tight };
}

export function buildSessionDiagnosis(report: SessionReport): SessionDiagnosis {
  const { vpip, pfr, evaluated, totalHands, counts } = report;
  const good = counts.boa + counts.ok;
  const accuracy = evaluated ? good / evaluated : 0;
  const { loose, tight } = countMistakes(report);
  const gap = vpip - pfr;

  // ── NOTA ──
  let score = Math.round(accuracy * 100);
  score -= Math.min(24, counts.ruim * 4); // erros claros pesam
  score -= Math.min(8, counts.imprecisa * 1.5);
  if (vpip > 34 || vpip < 13) score -= 6; // seleção de mãos desregulada
  if (gap > 12 && vpip >= 18) score -= 6; // passivo demais
  score = Math.max(0, Math.min(100, Math.round(score)));
  const insufficientSample = evaluated < MIN_SAMPLE;
  const { grade, emoji } = insufficientSample
    ? { grade: "Amostra insuficiente", emoji: "📊" }
    : gradeOf(score);

  // ── PONTOS FORTES ──
  const strengths: string[] = [];
  if (accuracy >= 0.8 && evaluated >= 5) {
    strengths.push(`Disciplina pré-flop: ${Math.round(accuracy * 100)}% das decisões no padrão.`);
  }
  if (vpip >= 17 && vpip <= 28 && gap <= 8) {
    strengths.push(`Agressão saudável (VPIP ${vpip}% / PFR ${pfr}%) — você entra levantando, não pagando.`);
  }
  if (counts.ruim === 0 && evaluated >= 5) {
    strengths.push("Nenhum erro grave de EV no pré-flop nesta sessão.");
  }
  if (loose === 0 && vpip >= 15 && evaluated >= 8) {
    strengths.push("Boa seleção de mãos: você não entrou em lixo fora do range.");
  }
  if (tight === 0 && evaluated >= 8 && vpip >= 15) {
    strengths.push("Você não largou mãos lucrativas com medo — defesa correta.");
  }
  if (counts.boa >= Math.max(3, evaluated * 0.5)) {
    strengths.push(`${counts.boa} decisão(ões) nota máxima ✅ — consistência.`);
  }

  // ── PONTOS FRACOS ──
  const weaknesses: string[] = [];
  if (evaluated < 5) {
    weaknesses.push("Poucas mãos pra um raio-x forte — importe uma sessão maior.");
  }
  if (vpip > 32) {
    weaknesses.push(`VPIP alto (${vpip}%): você entra em mãos demais, principalmente fora de posição.`);
  } else if (vpip < 15 && evaluated >= 8) {
    weaknesses.push(`VPIP baixo (${vpip}%): apertado demais — está perdendo blinds fáceis.`);
  }
  if (gap > 12 && vpip >= 18) {
    weaknesses.push(`Passivo (VPIP ${vpip}% / PFR ${pfr}%): você paga mais do que levanta.`);
  }
  if (loose >= Math.max(2, evaluated * 0.1)) {
    weaknesses.push(`${loose} jogada(s) solta(s): continuou com mãos fora do range da posição.`);
  }
  if (tight >= Math.max(2, evaluated * 0.1)) {
    weaknesses.push(`${tight} fold(s) apertado(s): largou mãos que davam pra seguir com lucro.`);
  }
  if (counts.ruim > 0) {
    weaknesses.push(`${counts.ruim} erro(s) claro(s) de EV — as mãos 🔴 no replay.`);
  }

  // ── AJUSTES (acionáveis) ──
  const adjustments: string[] = [];
  if (vpip > 32 || loose >= 2) {
    adjustments.push("Aperte as aberturas fora de posição: no UTG/MP, abra só o topo do range.");
  }
  if (gap > 12 && vpip >= 18) {
    adjustments.push("Troque calls passivos por 3-bet ou fold — pagar OOP é o vazamento nº 1 do recreativo.");
  }
  if (vpip < 15 && evaluated >= 8) {
    adjustments.push("Abra mais o botão e o CO, e defenda o BB pelo preço — dá pra roubar mais blinds.");
  }
  if (tight >= 2) {
    adjustments.push("Reveja os folds apertados: com stack raso, muitas mãos passam a ser call/jam.");
  }
  if (counts.ruim > 0) {
    adjustments.push("Refaça as mãos 🔴 no modo Treino até acertar o padrão sem pensar.");
  }
  if (adjustments.length === 0) {
    adjustments.push("Base pré-flop sólida — suba o nível estudando o pós-flop (Rua por Rua) e os sizings.");
  }

  // ── HEADLINE ──
  let headline: string;
  if (insufficientSample) {
    const faltam = MIN_SAMPLE - evaluated;
    headline = evaluated === 0
      ? "Nenhuma decisão sua foi avaliada ainda — importe mãos em que você agiu no pré-flop."
      : `Só ${evaluated} decisão(ões) avaliada(s). Importe ~${faltam} a mais (mín. ${MIN_SAMPLE}) para uma nota confiável — com poucas mãos, um acerto vira "100%" à toa.`;
  } else if (score >= 80) {
    headline = weaknesses.length
      ? `Pré-flop forte (${score}/100) — ajuste um detalhe e fica redondo.`
      : `Pré-flop muito sólido (${score}/100). Hora de focar no pós-flop.`;
  } else if (score >= 55) {
    headline = `Pré-flop ok (${score}/100), mas há vazamentos que custam fichas.`;
  } else {
    headline = `Pré-flop com furos (${score}/100) — os ajustes abaixo mudam seu resultado.`;
  }

  if (strengths.length === 0) {
    strengths.push("Você revisou a sessão inteira — o primeiro passo de todo jogador que evolui. 👊");
  }

  // AMOSTRA INSUFICIENTE (P0 da auditoria da Manus): com <20 decisões, NÃO
  // afirmar comportamento ("VPIP alto", "passivo"...) nem sugerir ajuste forte —
  // com 1 mão, "100%" é só o denominador, não um diagnóstico. Zera os rótulos
  // comportamentais e deixa só o convite pra importar mais.
  if (insufficientSample) {
    return {
      score,
      grade,
      emoji,
      insufficientSample,
      minSample: MIN_SAMPLE,
      headline,
      accuracy,
      vpip,
      pfr,
      evaluated,
      totalHands,
      strengths: ["Boa — você já está revisando as mãos. Traga mais decisões pra um raio-x confiável. 👊"],
      weaknesses: [],
      adjustments: [`Importe pelo menos ${MIN_SAMPLE} decisões avaliadas: com poucas mãos, qualquer número (até 100%) é só o denominador, não o seu jogo.`],
    };
  }

  return {
    score,
    grade,
    emoji,
    insufficientSample,
    minSample: MIN_SAMPLE,
    headline,
    accuracy,
    vpip,
    pfr,
    evaluated,
    totalHands,
    strengths,
    weaknesses,
    adjustments,
  };
}

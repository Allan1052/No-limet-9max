// ---------------------------------------------------------------------------
// Anatomia do torneio — o "raio-X" da forma como o herói jogou.
//
// Sites de resultados (BSOP, Hendon Mob, SharkScope) mostram PLACAR — posição
// e prêmio. Quem mostra a ANATOMIA são os rastreadores pagos (PokerTracker,
// DriveHUD). O Call ou Fold é o primeiro app gratuito a entregar isso ao
// recreativo: ao final do torneio, o jogador vê quantas mãos disputou, a
// distribuição das suas ações (Fold/Call/Raise/Re-raise) e a comparação com a
// anatomia de referência de MTT — os mesmos números do Reel "A Anatomia".
// ---------------------------------------------------------------------------

export interface AnatomyCounts {
  /** Contagens brutas por família de ação (check conta com fold: "não investiu"). */
  folds: number;
  calls: number;
  raises: number;
  reRaises: number;
  total: number; // folds + calls + raises
}

export interface AnatomyResult {
  counts: AnatomyCounts;
  /** % de cada ação (soma 100% de folds+calls+raises; re-raise é subgrupo de raise). */
  foldPct: number;
  callPct: number;
  raisePct: number;
  reRaisePctOfRaises: number;
  /** Anatomia de referência (MTT de pro — mesma régua do Reel "A Anatomia"). */
  ref: { fold: number; call: number; raise: number };
  /** Frase de leitura automática, na voz recreativa da marca. */
  note: string;
}

/**
 * Deriva a anatomia a partir do histórico de decisões do herói (feedback items
 * gravados em todo torneio — já existem na sessão, nada novo precisa ser
 * rastreado).
 */
export function anatomyFromDecisions(
  decisions: Array<{ heroAction: string }>,
): AnatomyResult {
  const counts: AnatomyCounts = { folds: 0, calls: 0, raises: 0, reRaises: 0, total: 0 };
  let lastWasRaise = false; // raise seguido de outro raise do mesmo jogador = re-raise
  for (const d of decisions) {
    const a = d.heroAction;
    if (a === "fold") {
      counts.folds++;
      counts.total++;
      lastWasRaise = false;
    } else if (a === "call") {
      counts.calls++;
      counts.total++;
      lastWasRaise = false;
    } else if (a === "check") {
      // Check = não investiu fichas — a anatomia trata junto com fold, porque
      // ambos preservam a stack; quem faz a stack derreter é o call.
      counts.folds++; // "não investiu"
      counts.total++;
      lastWasRaise = false;
    } else {
      // raise, bet, 3bet, jam, allin — toda ação agressiva
      counts.raises++;
      counts.total++;
      if (lastWasRaise) counts.reRaises++;
      lastWasRaise = true;
    }
  }
  const n = counts.total;
  const pct = (v: number) => (n > 0 ? Math.round((v / n) * 100) : 0);
  // Mesmo padrão do Reel "A Anatomia": o recreativo médio paga 3x mais do que
  // devia (24% call vs 7% ideal) — e é o buraco por onde a stack derrete.
  const ref = { fold: 11, call: 7, raise: 82 };
  return {
    counts,
    foldPct: pct(counts.folds),
    callPct: pct(counts.calls),
    raisePct: pct(counts.raises),
    reRaisePctOfRaises: counts.raises > 0 ? Math.round((counts.reRaises / counts.raises) * 100) : 0,
    ref,
    note: readableNote(counts, ref),
  };
}

/**
 * Lê a anatomia do recreativo: o número que mais importa é o CALL — o
 * recreativo paga bem mais do que devia, e é ali que a stack derrete.
 */
function readableNote(c: AnatomyCounts, ref: { fold: number; call: number; raise: number }): string {
  const n = c.total;
  if (n < 8) {
    return "Amostra curta — jogue mais mãos para a anatomia ficar confiável.";
  }
  const refCalls = Math.max(1, Math.round((ref.call / 100) * n));
  const ratio = Math.round(c.calls / refCalls);
  if (c.calls <= refCalls + 1) {
    return `Sua anatomia está perto do padrão de torneio: você paga só o necessário e toma a iniciativa (${c.raises} raises). É assim que a stack cresce.`;
  }
  if (ratio >= 2) {
    return `O buraco da sua stack é o call: você pagou ~${ratio}× mais do que o padrão. O recreativo paga demais — pagar é esperar o outro decidir por você. Raise ou fold.`;
  }
  return `Você pagou ${ratio}× mais do que o padrão neste torneio. Cada call a mais é fichas que saem sem decisão — o pro toma a iniciativa, o recreativo acompanha.`;
}

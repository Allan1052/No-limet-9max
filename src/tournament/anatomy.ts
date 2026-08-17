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
  /** Linha explicativa curta que resolve a confusão do "82% raise": a anatomia
   * conta só as decisões que o jogador tomou — as mãos em que ele não teve
   * ação (mão chegou e ele foldou sem agir, ou o jogo nem chegou nele) não
   * entram. Sem essa linha, o número assusta o recreativo. */
  finePrint: string;
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
    finePrint:
      "* Só contam as decisões que VOCÊ tomou — as mãos em que você nem jogou não entram. O fold geral continua sendo a maioria das mãos.",
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
    return `Sua anatomia está perto do padrão de torneio: quando entrou no pote, você tomou a iniciativa (${c.raises} raises) e pagou só o necessário. É assim que a stack cresce.`;
  }
  if (ratio >= 2) {
    return `O buraco da sua stack é o call: você pagou ~${ratio}× mais do que o padrão. O recreativo paga demais — pagar é esperar o outro decidir por você. Ou toma a iniciativa (raise), ou larga barato (fold).`;
  }
  return `Você pagou ${ratio}× mais do que o padrão neste torneio. Cada call a mais é fichas que saem sem decisão — o pro toma a iniciativa, o recreativo acompanha.`;
}

// ===========================================================================
// ANATOMIA POR FAIXA — números REAIS do motor para a aba "Estudar > Anatomia".
//
// Denominador: TODAS as mãos (aqui o Fold é a maioria, ~80%). Diferente de
// anatomyFromDecisions acima, que mede só as mãos que o herói JOGOU (aí o raise
// domina). São duas fotos válidas — a UI precisa rotular cada denominador.
// ===========================================================================

import { cardsFromString, seededRng } from "../engine/cards";
import { preflopDecision, type PreflopContext } from "../ranges/preflop";
import { BASELINE_PROFILE } from "../bots/profiles";
import { allHandTypes, comboCount, type Position } from "../ranges/types";

export interface AnatDist {
  fold: number;
  call: number;
  raise: number;
}

export type AnatTier = "micro" | "baixa" | "media" | "alta" | "elite";

function anatHandCards(ht: string): string {
  const hi = ht[0], lo = ht[1];
  if (hi === lo) return `${hi}s${lo}h`;
  return ht.endsWith("s") ? `${hi}s${lo}s` : `${hi}s${lo}h`;
}

function anatBucket(action: string): keyof AnatDist {
  if (action === "fold") return "fold";
  if (action === "call" || action === "limp") return "call";
  return "raise";
}

const ANAT_POS: Position[] = ["UTG", "UTG1", "MP", "LJ", "HJ", "CO", "BTN", "SB", "BB"];
const ANAT_EARLIER: Partial<Record<Position, Position[]>> = {
  UTG1: ["UTG"], MP: ["UTG", "UTG1"], LJ: ["UTG", "MP"], HJ: ["MP", "LJ"],
  CO: ["LJ", "HJ"], BTN: ["HJ", "CO"], SB: ["CO", "BTN"], BB: ["CO", "BTN", "SB"],
};

let _idealCache: AnatDist | null = null;

/**
 * A distribuição IDEAL de decisões pré-flop, medida no PRÓPRIO motor (o mesmo
 * validado contra GTO). Amostra cada mão (ponderada por combos) em cada posição,
 * em pote não aberto (RFI) e enfrentando abertura — o mix de um torneio.
 * Memoizada; resultado estável ~Fold 80 / Call 5 / Raise 15.
 */
export function idealDistribution(): AnatDist {
  if (_idealCache) return _idealCache;
  const tally: AnatDist = { fold: 0, call: 0, raise: 0 };
  let total = 0;
  const rng = seededRng(0xA47A01);
  const effBB = 40;

  for (const pos of ANAT_POS) {
    for (const ht of allHandTypes()) {
      const w = comboCount(ht);
      const hand = cardsFromString(anatHandCards(ht));
      {
        const ctx: PreflopContext = { heroPosition: pos, hand, effectiveBB: effBB, profile: BASELINE_PROFILE, variant: "holdem", rng };
        tally[anatBucket(preflopDecision(ctx).action)] += w;
        total += w;
      }
      const earlier = ANAT_EARLIER[pos];
      if (earlier && earlier.length > 0) {
        const raiser = earlier[Math.floor(rng() * earlier.length)];
        const ctx: PreflopContext = { heroPosition: pos, hand, effectiveBB: effBB, profile: BASELINE_PROFILE, variant: "holdem", raiserPosition: raiser, openSizeBB: 2.0, rng };
        tally[anatBucket(preflopDecision(ctx).action)] += w;
        total += w;
      }
    }
  }
  const pct = (x: number) => Math.round((x / total) * 100);
  let fold = pct(tally.fold), call = pct(tally.call), raise = pct(tally.raise);
  fold += 100 - (fold + call + raise);
  _idealCache = { fold, call, raise };
  return _idealCache;
}

/**
 * O CAMPO ("como se joga hoje") por faixa. Modelado a partir do ideal: o campo
 * folda MENOS e é mais PASSIVO (troca aumento por pagar). O desvio ENCOLHE
 * conforme sobe a faixa — Micro sangra, Elite quase no ideal (campo mais caro é
 * mais duro). gap = fold a menos que o ideal; passiv = fração do raise ideal
 * mantida (o resto vira call).
 */
const ANAT_FIELD: Record<AnatTier, { gap: number; passiv: number }> = {
  micro: { gap: 20, passiv: 0.82 },
  baixa: { gap: 15, passiv: 0.87 },
  media: { gap: 11, passiv: 0.90 },
  alta: { gap: 7, passiv: 0.94 },
  elite: { gap: 4, passiv: 0.97 },
};

export function fieldDistribution(tier: AnatTier): AnatDist {
  const ideal = idealDistribution();
  const { gap, passiv } = ANAT_FIELD[tier];
  const fold = Math.max(0, ideal.fold - gap);
  const raise = Math.round(ideal.raise * passiv);
  const call = Math.max(0, 100 - fold - raise);
  return { fold, call, raise };
}

export interface AnatomyInsight {
  headline: string;
  detail: string;
  foldGap: number;
  sharp: boolean;
}

/**
 * A LIÇÃO — uma só, sempre no FOLD ("ganhar é largar mais; o que você joga a
 * mais é ficha escorrendo"). O call/raise a mais são só ONDE o fold que faltou
 * foi parar. `you` = o campo (por faixa) ou o perfil real; `ideal` = o do motor.
 */
export function anatomyInsight(you: AnatDist, ideal: AnatDist = idealDistribution()): AnatomyInsight {
  const foldGap = Math.max(0, ideal.fold - you.fold);

  if (you.fold >= ideal.fold + 6) {
    return {
      headline: `Você larga ${you.fold}% — mais que o ideal (${ideal.fold}%).`,
      detail: "Largar é a jogada mais comum, mas você aperta até com mão jogável e perde valor. Nas posições certas, dá pra jogar um pouco mais.",
      foldGap: 0,
      sharp: false,
    };
  }
  if (foldGap < 4) {
    return {
      headline: `Você larga ${you.fold}% — no ponto do ideal (${ideal.fold}%).`,
      detail: "Seu range está afiado: larga na hora certa e só entra com o que aguenta pressão. É esse o jogo do Call ou Fold.",
      foldGap,
      sharp: true,
    };
  }
  const callExtra = you.call - ideal.call;
  const raiseExtra = you.raise - ideal.raise;
  let where: string;
  if (callExtra >= raiseExtra && callExtra > 0) {
    const times = ideal.call > 0 ? Math.round((you.call / ideal.call) * 10) / 10 : 0;
    where = `A ficha escorre no CALL: você paga ${you.call}% contra ${ideal.call}% do ideal${times >= 2 ? ` (${times}× mais)` : ""}. Cada call desses é um fold que faltou.`;
  } else if (raiseExtra > 0) {
    where = `A ficha escorre na agressão: você aumenta ${you.raise}% contra ${ideal.raise}% do ideal. Aumentar sem range é o mesmo fold que faltou.`;
  } else {
    where = "A ficha escorre nas mãos que você joga quando o certo era largar.";
  }
  return {
    headline: `O ideal larga ${ideal.fold}%. Você larga ${you.fold}%.`,
    detail: `Esses ${foldGap}% a menos de fold são ficha escorrendo: mãos que você devia largar e joga. ${where}`,
    foldGap,
    sharp: false,
  };
}

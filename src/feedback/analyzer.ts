// ---------------------------------------------------------------------------
// Feedback pós-mão.
//
// Para cada decisão SUA, comparamos o que você fez com a recomendação de linha
// de base (o perfil neutro/"quase-GTO"), usando a mesma matemática dos bots:
// equity vs range e pot odds. O resultado é uma nota e uma explicação em texto
// simples do porquê — foco em aprender, não em julgar.
// ---------------------------------------------------------------------------

export type Rating = "boa" | "ok" | "imprecisa" | "ruim";

/** Uma entrada da estratégia mista recomendada (ação + frequência 0..1). */
export interface AdviceFreq {
  action: string;
  freq: number;
}

/** Recomendação da linha de base para o spot em que o herói decidiu. */
function pc(x: number): string {
  return `${Math.round(x * 100)}%`;
}

import { UserSubscriptionLevel } from "../app/gameController";

export interface HeroAdvice {
  kind: "preflop" | "postflop";
  action: string; // fold | check | call | raise | 3bet | bet | jam
  reason: string;
  equity?: number;
  potOdds?: number;
  /** Largura estimada do range do vilão (0..1), para o painel de leitura. */
  villainRangePct?: number;
  userSubscriptionLevel?: UserSubscriptionLevel;
  /** Estratégia mista recomendada (frequências), quando disponível. */
  mix?: AdviceFreq[];
  /** EV (em big blinds) de PAGAR neste spot; foldar vale 0. Só em spots com aposta. */
  evBB?: number;
  /** Stack efetivo em big blinds — pra distinguir all-in fundo (overbet) de jam curto. */
  effectiveBB?: number;
  /** Rótulo do raise pelo nível ("3-bet"/"4-bet"/"5-bet"), quando aplicável. */
  nBet?: string;
}

/** Texto curto de uma estratégia mista: "Call 70% · Fold 30%". */
export function mixText(mix: AdviceFreq[] | undefined): string {
  if (!mix || mix.length === 0) return "";
  
  // Filtra ações com frequência significativa (>= 5%)
  const significant = mix.filter((m) => m.freq >= 0.05);
  if (significant.length === 0) return "";
  
  // Normaliza para garantir que a soma seja exatamente 100%
  const total = significant.reduce((sum, m) => sum + m.freq, 0);
  const normalized = significant.map((m) => ({
    action: m.action,
    freq: m.freq / total, // reescala para somar 100%
  }));
  
  return normalized
    .map((m) => `${actionLabel(m.action)} ${Math.round(m.freq * 100)}%`)
    .join(" · ");
}

export interface FeedbackItem {
  street: string;
  heroAction: string; // rótulo do que você fez
  advice: string; // rótulo do recomendado
  rating: Rating;
  text: string;
  equity?: number;
  potOdds?: number;
  /** Estratégia mista recomendada no spot (frequências), para exibição. */
  mix?: AdviceFreq[];
  /** EV (em bb) de pagar neste spot — foldar vale 0. */
  evBB?: number;
  /** Pré ou pós-flop — para agrupar vazamentos por fase. */
  kind?: "preflop" | "postflop";
  /** Família da SUA ação (fold/check/call/aggro) — p/ detectar vazamentos sem
   *  parsear rótulos de texto. */
  heroFam?: Family;
  /** Família da ação RECOMENDADA. */
  adviceFam?: Family;
}

export type Family = "fold" | "check" | "call" | "aggro";

function family(action: string): Family {
  switch (action) {
    case "fold":
      return "fold";
    case "check":
      return "check";
    case "call":
      return "call";
    default:
      return "aggro"; // raise, bet, 3bet, jam, allin
  }
}

const LABELS: Record<string, string> = {
  fold: "Fold",
  check: "Check",
  call: "Call",
  raise: "Raise",
  bet: "Aposta",
  "3bet": "3-bet",
  jam: "All-in",
  allin: "All-in",
};

export function actionLabel(action: string): string {
  return LABELS[action] ?? action;
}

/**
 * Avalia uma decisão do herói. `heroAction` é o tipo da ação do motor
 * (fold/check/call/raise/allin); `advice` é a recomendação da linha de base.
 */
export function gradeDecision(
  streetLabel: string,
  userSubscriptionLevel: UserSubscriptionLevel,
  heroAction: string,
  advice: HeroAdvice,
): FeedbackItem {
  const item = gradeCore(streetLabel, userSubscriptionLevel, heroAction, advice);
  // Nota de EV em big blinds — a "ponte" entre o simples (fichas ganhas/perdidas)
  // e o técnico (valor esperado). Só aparece em spots com aposta para pagar.
  if (advice.evBB !== undefined) {
    item.evBB = advice.evBB;
    const note = getEvNote(heroAction, advice.evBB, userSubscriptionLevel);
    if (note) item.text += ` ${note}`;
  }
  return item;
}

/** Frase de EV conforme o que o herói fez (pagar vale evBB; foldar vale 0). */
function getEvNote(heroAction: string, evBB: number, level: UserSubscriptionLevel): string {
  const ev = Math.round(evBB * 10) / 10;
  const fam = family(heroAction === "allin" ? "raise" : heroAction);
  if (fam === "fold") {
    if (level === 'free') {
      return ev > 0.1
        ? `💸 EV: pagar valia +${ev.toFixed(1)}bb — você deixou fichas na mesa.`
        : `💰 EV: fold certo — pagar seria ${ev.toFixed(1)}bb.`;
    } else if (level === 'technical') {
      return ev > 0.1
        ? `💸 EV: pagar valia +${ev.toFixed(1)}bb — o fold foi um erro de EV.`
        : `💰 EV: fold correto — pagar seria ${ev.toFixed(1)}bb.`;
    } else { // ultra
      return ev > 0.1
        ? `💸 EV: fold com -${ev.toFixed(1)}bb de EV — perda de valor esperado.`
        : `💰 EV: fold ótimo — pagar seria ${ev.toFixed(1)}bb de EV negativo.`;
    }
  }
  if (fam === "call") {
    if (level === 'free') {
      return ev >= 0
        ? `💰 EV: +${ev.toFixed(1)}bb — pagar foi lucrativo.`
        : `💸 EV: ${ev.toFixed(1)}bb — pagou sem preço.`;
    } else if (level === 'technical') {
      return ev >= 0
        ? `💰 EV: +${ev.toFixed(1)}bb — call lucrativo.`
        : `💸 EV: ${ev.toFixed(1)}bb — call com EV negativo.`
    } else { // ultra
      return ev >= 0
        ? `💰 EV: +${ev.toFixed(1)}bb — call com EV positivo.`
        : `💸 EV: ${ev.toFixed(1)}bb — call com EV negativo, desvio do GTO.`
    }
  }
  if (fam === "aggro") {
    if (level === 'free') {
      return ev >= 0
        ? `💰 EV de continuar: +${ev.toFixed(1)}bb.`
        : `💸 EV de continuar: ${ev.toFixed(1)}bb.`;
    } else if (level === 'technical') {
      return ev >= 0
        ? `💰 EV de continuar: +${ev.toFixed(1)}bb — ação agressiva lucrativa.`
        : `💸 EV de continuar: ${ev.toFixed(1)}bb — ação agressiva com EV negativo.`
    } else { // ultra
      return ev >= 0
        ? `💰 EV de continuar: +${ev.toFixed(1)}bb — ação com EV positivo, alinhada ao GTO.`
        : `💸 EV de continuar: ${ev.toFixed(1)}bb — ação com EV negativo, desvio do GTO.`
    }
  }
  return "";
}

function gradeCore(
  streetLabel: string,
  userSubscriptionLevel: UserSubscriptionLevel,
  heroAction: string,
  advice: HeroAdvice,
): FeedbackItem {
  const hf = family(heroAction === "allin" ? "raise" : heroAction);
  const af = family(advice.action);
  const eq = advice.equity;
  const odds = advice.potOdds;

  const base: Omit<FeedbackItem, "rating" | "text"> = {
    street: streetLabel,
    heroAction: actionLabel(heroAction),
    advice: actionLabel(advice.action),
    equity: eq,
    potOdds: odds,
    mix: advice.mix,
    kind: advice.kind,
    heroFam: hf,
    adviceFam: af,
  };

  // ----- All-in FUNDO quando o certo era um raise/3-bet NORMAL (não jam) -----
  // Com stack fundo, dar all-in não é "raise": é um overbet gigante. Você faz
  // as mãos piores foldarem e só é pago por mãos melhores — jogada perdedora.
  // O all-in só equivale ao raise em stack CURTO (push/fold), quando o próprio
  // conselho recomenda jam. Sem isso, o app dava "excelente" pra qualquer jam.
  if (
    heroAction === "allin" &&
    advice.action !== "jam" &&
    family(advice.action) === "aggro" &&
    (advice.effectiveBB ?? 100) > 30
  ) {
    const eff = Math.round(advice.effectiveBB ?? 0);
    const deep = eff >= 50;
    return {
      ...base,
      rating: deep ? "ruim" : "imprecisa",
      text: `All-in aqui é overbet: com ${eff}bb, o certo era um ${actionLabel(
        advice.action,
      )} de tamanho normal. Jogando all-in você faz mão pior largar e só é pago por mão melhor — ${
        deep ? "vira jogada perdedora" : "perde valor"
      }. Guarde o all-in pra stack curto (push/fold).`,
    };
  }

  // ----- Nota por FREQUÊNCIA (estratégia mista) -----
  // O poker é misto: uma mão pode ser 60% aposta / 40% check. Avaliar por
  // "bateu a ação exata" pune jogadas corretas. Quando temos as frequências,
  // a nota vem de QUÃO FREQUENTE a família da ação do herói aparece no padrão.
  if (advice.mix && advice.mix.length > 0) {
    const freqByFam: Record<Family, number> = { fold: 0, check: 0, call: 0, aggro: 0 };
    for (const m of advice.mix) freqByFam[family(m.action)] += m.freq;
    const heroFreq = freqByFam[hf];
    const main = [...advice.mix].sort((a, b) => b.freq - a.freq)[0];
    const mainLabel = actionLabel(main.action);
    if (heroFreq >= 0.55) {
      return {
        ...base,
        rating: "boa",
        text: getFeedbackText(userSubscriptionLevel, 'boa', 'freqMain', { heroAction, heroFreq }),
      };
    }
    if (heroFreq >= 0.25) {
      return {
        ...base,
        rating: "ok",
        text: getFeedbackText(userSubscriptionLevel, 'ok', 'freqValid', { heroAction, heroFreq, mainLabel }),
      };
    }
    if (heroFreq >= 0.08) {
      return {
        ...base,
        rating: "imprecisa",
        text: getFeedbackText(userSubscriptionLevel, 'imprecisa', 'freqMinor', { heroFreq, mainLabel }),
      };
    }
    // Frequência quase nula → é erro de verdade: segue para a análise de EV.
  }

  // Bateu com a recomendação: boa jogada.
  if (hf === af) {
    return { ...base, rating: "boa", text: getFeedbackText(userSubscriptionLevel, 'boa', 'aligned', { reason: advice.reason }) };
  }

  const hasNumbers = eq !== undefined && odds !== undefined;

  // ----- Erros de EV mensuráveis (pós-flop, com equity e odds) -----
  if (hasNumbers) {
    // Foldou com preço para continuar.
    if (hf === "fold" && (af === "call" || af === "aggro") && eq! >= odds!) {
      const surplus = eq! - odds!;
      return {
        ...base,
        rating: surplus > 0.1 ? "ruim" : "imprecisa",
        text: getFeedbackText(userSubscriptionLevel, surplus > 0.1 ? 'ruim' : 'imprecisa', 'foldWithPrice', { equity: eq!, odds: odds!, adviceAction: advice.action, surplus }),
      };
    }
    // Pagou sem preço.
    if (hf === "call" && af === "fold" && eq! < odds!) {
      const gap = odds! - eq!;
      return {
        ...base,
        rating: gap > 0.15 ? "ruim" : "imprecisa",
        text: getFeedbackText(userSubscriptionLevel, gap > 0.15 ? 'ruim' : 'imprecisa', 'callWithoutOdds', { equity: eq!, odds: odds!, gap }),
      };
    }
    // Agressivo demais.
    if (hf === "aggro" && (af === "call" || af === "check")) {
      return {
        ...base,
        rating: "ok",
        text: getFeedbackText(userSubscriptionLevel, 'ok', 'aggroTooMuch', { adviceAction: advice.action }),
      };
    }
    // Passivo com mão de valor.
    if ((hf === "call" || hf === "check") && af === "aggro") {
      return {
        ...base,
        rating: "imprecisa",
        text: getFeedbackText(userSubscriptionLevel, 'imprecisa', 'passiveWithValue', { adviceAction: advice.action, equity: eq }),
      };
    }
  }

  // ----- Pré-flop (sem equity/odds diretas) -----
  if (advice.kind === "preflop") {
    if ((hf === "call" || hf === "aggro") && af === "fold") {
      return {
        ...base,
        rating: "imprecisa",
        text: getFeedbackText(userSubscriptionLevel, 'imprecisa', 'loosePlay', {}),
      };
    }
    if (hf === "fold" && af !== "fold") {
      return {
        ...base,
        rating: "imprecisa",
        text: getFeedbackText(userSubscriptionLevel, 'imprecisa', 'tooTight', { adviceAction: advice.action }),
      };
    }
    if (hf === "call" && af === "aggro") {
      return {
        ...base,
        rating: "ok",
        text: getFeedbackText(userSubscriptionLevel, 'ok', 'couldBeAggro', { adviceAction: advice.action }),
      };
    }
    if (hf === "aggro" && af === "call") {
      return {
        ...base,
        rating: "ok",
        text: getFeedbackText(userSubscriptionLevel, 'ok', 'aggroButPlayable', { adviceAction: advice.action }),
      };
    }
  }

  // Casos restantes: diferença leve.
    return {
      ...base,
      rating: "imprecisa",
      text: getFeedbackText(userSubscriptionLevel, 'imprecisa', 'differentPattern', { adviceAction: advice.action, reason: advice.reason }),
    };
}



function getFeedbackText(level: UserSubscriptionLevel, rating: Rating, key: string, vars: Record<string, any>): string {
  const heroAction = vars.heroAction ? actionLabel(vars.heroAction) : '';
  const mainLabel = vars.mainLabel ? actionLabel(vars.mainLabel) : '';
  const adviceAction = vars.adviceAction ? actionLabel(vars.adviceAction) : '';
  const equity = vars.equity !== undefined ? pc(vars.equity) : 'alta';
  const odds = vars.odds !== undefined ? pc(vars.odds) : '';

  const heroFreq = vars.heroFreq !== undefined ? pc(vars.heroFreq) : '';
  const surplus = vars.surplus !== undefined ? vars.surplus.toFixed(1) : '';
  // const ev = vars.ev !== undefined ? vars.ev.toFixed(1) : ''; // Removido pois não é utilizado
  const gap = vars.gap !== undefined ? vars.gap.toFixed(1) : '';

  const texts: Record<UserSubscriptionLevel, Record<Rating, Record<string, string>>> = {
    free: {
      boa: {
        freqMain: `Boa! Você fez a jogada principal aqui, o padrão faz ${heroAction} em ~${heroFreq} das vezes.`, 
        aligned: `Alinhado com o padrão. ${vars.reason}`,
      },
      ok: {
        freqValid: `Ok, essa jogada é válida (~${heroFreq} das vezes), mas o padrão prefere ${mainLabel}.`, 
        aggroTooMuch: `Você foi mais agressivo que o padrão (${adviceAction}). É jogável, mas pode inflar o pote sem precisar.`, 
        couldBeAggro: `Dava para ser mais agressivo: o padrão aqui é ${adviceAction}.`, 
        aggroButPlayable: `Mais agressivo que o padrão (${adviceAction}); jogável.`, 
      },
      imprecisa: {
        freqMinor: `Essa é uma linha minoritária (~${heroFreq}): dá para fazer de vez em quando, mas o padrão costuma ${mainLabel}.`, 
        foldWithPrice: `Fold ${surplus > 0.1 ? "ruim" : "apertado"}: sua chance de ganhar (${equity}) pagava o preço (${odds}). O padrão era ${adviceAction}.`, 
        callWithoutOdds: `Pagou sem odds: sua chance (${equity}) abaixo do preço (${odds}). O padrão era foldar.`, 
        passiveWithValue: `Perdeu valor/iniciativa: o padrão aqui é ${adviceAction} (chance de ganhar ${equity}).`, 
        loosePlay: `Jogada solta: sua mão está fora do que se deve jogar nesta posição. O padrão era foldar.`, 
        tooTight: `Apertado demais: sua mão estava no range de ${adviceAction} para a posição.`, 
        differentPattern: `Diferente do padrão (${adviceAction}). ${vars.reason}`,
      },
      ruim: {
        foldWithPrice: `Fold ruim: sua chance de ganhar (${equity}) pagava o preço (${odds}). O padrão era ${adviceAction}.`, 
        callWithoutOdds: `Pagou sem odds: sua chance (${equity}) abaixo do preço (${odds}). O padrão era foldar.`, 
      },
    },
    technical: {
      boa: {
        freqMain: `Excelente! Sua jogada está alinhada com a frequência principal (${heroFreq}) da estratégia mista.`, 
        aligned: `Alinhado com o padrão. ${vars.reason}`,
      },
      ok: {
        freqValid: `Jogada válida da estratégia mista (~${heroFreq}), mas o padrão prefere ${mainLabel} para otimizar o EV.`, 
        aggroTooMuch: `Mais agressivo que o padrão (${adviceAction}). Jogável, mas pode inflar o pote sem precisar.`, 
        couldBeAggro: `Dava para ser mais agressivo: o padrão aqui é ${adviceAction}.`, 
        aggroButPlayable: `Mais agressivo que o padrão (${adviceAction}); jogável.`, 
      },
      imprecisa: {
        freqMinor: `Linha minoritária (~${heroFreq}): pode ser usada ocasionalmente, mas o padrão costuma ${mainLabel}.`, 
        foldWithPrice: `Fold ${surplus > 0.1 ? "ruim" : "apertado"}: sua equity (${equity}) pagava o preço (${odds}). O padrão era ${adviceAction}.`, 
        callWithoutOdds: `Call com EV negativo: equity (${equity}) abaixo do preço (${odds}). O padrão era foldar.`, 
        passiveWithValue: `Perdeu valor/iniciativa: o padrão aqui é ${adviceAction} (equity ${equity}).`, 
        loosePlay: `Leak de range: sua mão está fora do range recomendado para a posição. O padrão era foldar.`, 
        tooTight: `Apertado demais: sua mão estava no range de ${adviceAction} para a posição.`, 
        differentPattern: `Diferente do padrão (${adviceAction}). ${vars.reason}`,
      },
      ruim: {
        foldWithPrice: `Fold ruim: sua equity (${equity}) pagava o preço (${odds}). O padrão era ${adviceAction}.`,
        callWithoutOdds: `Call com EV negativo: equity (${equity}) abaixo do preço (${odds}). O padrão era foldar.`,
      },
    },
    ultra: {
      boa: {
        freqMain: `Optimal play. Sua ação maximiza o EV neste spot, alinhada à frequência (${heroFreq}) da estratégia mista.`,
        aligned: `Optimal play. ${vars.reason}`,
      },
      ok: {
        freqValid: `Desvio marginal do GTO (~${heroFreq}), mas o padrão prefere ${mainLabel} para balanceamento de range.`,
        aggroTooMuch: `Linha explorável: mais agressivo que o padrão (${adviceAction}). Pode ser explorado por vilões atentos.`,
        couldBeAggro: `Perda de EV: o padrão aqui é ${adviceAction} para maximizar a fold equity e valor.`,
        aggroButPlayable: `Linha explorável: mais agressivo que o padrão (${adviceAction}); jogável, mas com risco de desbalanceamento.`,
      },
      imprecisa: {
        freqMinor: `Linha minoritária (~${heroFreq}): pode ser usada para exploração, mas o padrão GTO costuma ${mainLabel}.`,
        foldWithPrice: `Fold com -${surplus}bb de EV: sua equity (${equity}) pagava o preço (${odds}). O padrão GTO era ${adviceAction}.`,
        callWithoutOdds: `Call com -${gap}bb de EV: equity (${equity}) abaixo do preço (${odds}). O padrão GTO era foldar.`,
        passiveWithValue: `Perda de valor/iniciativa: o padrão GTO aqui é ${adviceAction} (equity ${equity}).`,
        loosePlay: `Leak de range: sua mão está fora do range GTO recomendado para a posição. O padrão era foldar.`,
        tooTight: `Apertado demais: sua mão estava no range de ${adviceAction} para a posição, perdendo EV.`,
        differentPattern: `Desvio do padrão GTO (${adviceAction}). ${vars.reason}`,
      },
      ruim: {
        foldWithPrice: `Fold com -${surplus}bb de EV: sua equity (${equity}) pagava o preço (${odds}). O padrão GTO era ${adviceAction}.`,
        callWithoutOdds: `Call com -${gap}bb de EV: equity (${equity}) abaixo do preço (${odds}). O padrão GTO era foldar.`,
      },
    },
  };

  const feedbackText = texts[level]?.[rating]?.[key];
  if (feedbackText) return feedbackText;

  // Fallback para níveis inferiores se o feedback específico não for encontrado
  if (level === 'ultra' && texts.technical?.[rating]?.[key]) return texts.technical[rating][key];
  if ((level === 'ultra' || level === 'technical') && texts.free?.[rating]?.[key]) return texts.free[rating][key];

  return `[Feedback não encontrado para ${level}/${rating}/${key}]`;
}

/** Resumo curto da mão a partir das notas das decisões. */
export function summarize(items: FeedbackItem[], level: UserSubscriptionLevel): string {
  if (items.length === 0) return "Sem decisões suas para avaliar nesta mão.";
  const counts: Record<Rating, number> = { boa: 0, ok: 0, imprecisa: 0, ruim: 0 };
  for (const it of items) counts[it.rating]++;

  const summaries: Record<UserSubscriptionLevel, Record<string, string>> = {
    free: {
      ruim: "Houve pelo menos um erro claro de EV nesta mão — veja abaixo.",
      imprecisa: "Jogo ok, com imprecisões pontuais para ajustar.",
      boa: "Mão bem jogada — decisões alinhadas com o padrão.",
    },
    technical: {
      ruim: "Erro crítico de EV detectado. Revise as decisões com EV negativo para otimizar sua estratégia.",
      imprecisa: "Sua jogada foi aceitável, mas com imprecisões que podem custar EV a longo prazo. Analise os desvios.",
      boa: "Mão jogada com excelência. Suas decisões foram alinhadas com a estratégia mista e maximizaram o EV.",
    },
    ultra: {
      ruim: "Leak de EV catastrófico. Sua linha desviou significativamente do GTO, resultando em perda substancial de valor esperado.",
      imprecisa: "Desvio marginal do GTO. Sua linha é explorável e pode ser ajustada para otimizar o balanceamento de range.",
      boa: "Optimal play. Suas decisões foram perfeitamente alinhadas com o GTO, maximizando o EV e explorando o range do vilão.",
    },
  };

  if (counts.ruim > 0) return summaries[level].ruim;
  if (counts.imprecisa > 0) return summaries[level].imprecisa;
  return summaries[level].boa;
}


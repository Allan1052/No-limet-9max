// ---------------------------------------------------------------------------
// Feedback pós-mão.
//
// Para cada decisão SUA, comparamos o que você fez com a recomendação de linha
// de base (o perfil neutro/"quase-GTO"), usando a mesma matemática dos bots:
// equity vs range e pot odds. O resultado é uma nota e uma explicação em texto
// simples do porquê — foco em aprender, não em julgar.
//
// As mensagens agora incluem CONTEXTO do momento: stack (em bb), estágio do
// torneio e profundidade — pra soar natural, como um coach de verdade.
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
  /** Pote (em big blinds) no momento da decisão — pós-flop. Usado p/ medir se um
   *  all-in é DE FATO um overbet (stack fundo vs pote) ou só um shove normal
   *  (vilão coberto/short → o all-in É o tamanho normal). */
  potBB?: number;
  /** Estágio do torneio (inicio/meio/bolha/mesa_final) — pra contextualizar a dica. */
  stageLabel?: string;
  /** Posição do herói (UTG, BTN, etc.) — pra contextualizar. */
  heroPosition?: string;
  /** TAMANHO recomendado da aposta/raise: fração do pote (0..1) e valor em bb. */
  betSizePct?: number;
  betSizeBB?: number;
  /** Nível de aposta ENFRENTADO no pré-flop (0=RFI, 1=open, 2=3-bet, 3=4-bet).
   *  Só p/ a narração do coach saber se foi resposta a um 3-bet ou abertura. */
  betLevelFaced?: number;
}

/**
 * Contexto da mão para enriquecer o texto do feedback (não altera a nota).
 * Passado pelo gameController e pelo import — opcional, textos funcionam sem.
 */
export interface FeedbackContext {
  /** Posição do herói (UTG, MP, CO, BTN, SB, BB...). */
  heroPosition?: string;
  /** Stack do herói em big blinds. */
  heroBB?: number;
  /** Estágio do torneio: "inicio" | "meio" | "bolha" | "mesa_final". */
  stage?: string;
  /** No momento da decisão, um vilão já está ALL-IN à frente do herói (a aposta
   *  a pagar é um all-in). Serve pra narração deixar o fold/call óbvio. */
  facingAllin?: boolean;
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
  /** TAMANHO recomendado da aposta/raise (quando o padrão é apostar/aumentar):
   *  fração do pote (0..1) e valor em bb — pra dica "aposte ~⅔ (≈ 8bb)". */
  betSizePct?: number;
  betSizeBB?: number;
  /** Nível de aposta ENFRENTADO no pré-flop (0=RFI, 1=open, 2=3-bet, 3=4-bet).
   *  Repassado à narração do coach para distinguir open-fold de fold-a-3bet. */
  betLevelFaced?: number;
  /** A aposta que o herói enfrentava era um ALL-IN de um vilão. Deixa o coach
   *  explicar o fold/call ("o vilão veio de all-in"). */
  facingAllin?: boolean;
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
  ctx?: FeedbackContext,
): FeedbackItem {
  const item = gradeCore(streetLabel, userSubscriptionLevel, heroAction, advice, ctx);
  // Nota de EV em big blinds — a "ponte" entre o simples (fichas ganhas/perdidas)
  // e o técnico (valor esperado). Só aparece em spots com aposta para pagar.
  if (advice.evBB !== undefined) {
    item.evBB = advice.evBB;
    // No modo 'free' (simples), não mostrar nota de EV — linguagem humana.
    // E só mostra quando a conta de EV CRUA (pot odds) CONCORDA com a nota — o
    // motor avalia contra a equity exigida (realização/implied/ICM), que é mais
    // rígida que o preço cru, então às vezes um fold CERTO teria EV-cru positivo
    // de pagar. Mostrar as duas coisas gerava contradição (bug do Allan: "fold
    // BOA" + "pagar valia +3.2bb, o fold foi um erro"; "raise IMPRECISA" + "ação
    // agressiva lucrativa"). Nesses casos, omitimos a nota em vez de contradizer.
    if (userSubscriptionLevel !== 'free' && evNoteAgreesWithGrade(item, advice.evBB)) {
      const note = getEvNote(heroAction, advice.evBB, userSubscriptionLevel);
      if (note) item.text += ` ${note}`;
    }
  }
  return item;
}

/**
 * A nota de EV cru (pot odds) concorda com o veredito da nota? Só então ela
 * aparece — senão contradiz a avaliação do motor (que usa a equity EXIGIDA, mais
 * rígida que o preço cru). Regra: para quem FOLDOU, a nota "pagar valia +X" só
 * cabe se o fold foi julgado ERRADO; um fold CERTO com EV-cru positivo é omitido
 * (o motor foldou por realização/implied/ICM, não por preço cru). Para quem
 * PAGOU/foi agressivo, o inverso.
 */
function evNoteAgreesWithGrade(item: FeedbackItem, evBB: number): boolean {
  const good = item.rating === "boa" || item.rating === "ok";
  const callProfitable = evBB > 0.1; // pagar ganha fichas (EV cru)
  const callBad = evBB < -0.1; // pagar perde fichas (EV cru)
  if (item.heroFam === "fold") {
    // fold bom ⇔ pagar NÃO era lucrativo; fold ruim ⇔ pagar era lucrativo.
    return good ? !callProfitable : callProfitable;
  }
  // call / agressão (continuar): bom ⇔ continuar NÃO era ruim; ruim ⇔ era ruim.
  return good ? !callBad : callBad;
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
  ctx?: FeedbackContext,
): FeedbackItem {
  const hf = family(heroAction === "allin" ? "raise" : heroAction);
  const af = family(advice.action);
  const eq = advice.equity;
  const odds = advice.potOdds;
  const effBB = advice.effectiveBB;

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
    // Só carrega o tamanho quando o padrão é agressivo (apostar/aumentar).
    betSizePct: af === "aggro" ? advice.betSizePct : undefined,
    betSizeBB: af === "aggro" ? advice.betSizeBB : undefined,
    betLevelFaced: advice.betLevelFaced,
    facingAllin: ctx?.facingAllin,
  };

  // ----- All-in FUNDO quando o certo era um raise/3-bet NORMAL (não jam) -----
  // Com stack fundo, dar all-in não é "raise": é um overbet gigante. Você faz
  // as mãos piores foldarem e só é pago por mãos melhores — jogada perdedora.
  // O all-in só equivale ao raise em stack CURTO (push/fold), quando o próprio
  // conselho recomenda jam. Sem isso, o app dava "excelente" pra qualquer jam.
  // Um all-in só é "overbet errado" quando SOBRA stack fundo em relação ao que
  // já está em jogo — aí um bet/raise normal seria bem menor que o shove. Com
  // stack efetivo curto vs o pote (vilão coberto/short), o all-in É o tamanho
  // normal e NÃO deve ser punido (bug pego pelo Allan: KK top two pair, 69% de
  // equity, shove contra vilão short vinha rotulado "imprecisa/arriscado").
  // Pós-flop temos o pote → mede por SPR; pré-flop, mantém o proxy de stack fundo.
  const effStk = advice.effectiveBB ?? 100;
  const isOverbetShove =
    advice.potBB && advice.potBB > 0 ? effStk > advice.potBB * 1.3 : effStk > 30;
  if (
    heroAction === "allin" &&
    advice.action !== "jam" &&
    family(advice.action) === "aggro" &&
    isOverbetShove
  ) {
    const eff = Math.round(effStk);
    const deep = eff >= 50;
    const fctx: FeedbackContext = {
      heroBB: eff,
      stage: advice.stageLabel,
      heroPosition: ctx?.heroPosition,
    };
    return {
      ...base,
      rating: deep ? "ruim" : "imprecisa",
      text: enrich(
        deep ? "ruim" : "imprecisa",
        `All-in aqui é overbet: com ${eff}bb, o certo era um ${actionLabel(
          advice.action,
        )} de tamanho normal. Jogando all-in você faz mão pior largar e só é pago por mão melhor — ${
          deep ? "vira jogada perdedora" : "perde valor"
        }. Guarde o all-in pra stack curto (push/fold).`,
        fctx,
      ),
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
    const fctx: FeedbackContext = {
      heroBB: effBB ?? 0,
      stage: advice.stageLabel,
      heroPosition: ctx?.heroPosition,
    };
    if (heroFreq >= 0.55) {
      return {
        ...base,
        rating: "boa",
        text: getFeedbackText(userSubscriptionLevel, 'boa', 'freqMain', { heroAction, heroFreq, street: streetLabel, ctx: fctx }),
      };
    }
    if (heroFreq >= 0.25) {
      return {
        ...base,
        rating: "ok",
        text: getFeedbackText(userSubscriptionLevel, 'ok', 'freqValid', { heroAction, heroFreq, mainLabel, street: streetLabel, ctx: fctx }),
      };
    }
    if (heroFreq >= 0.08) {
      return {
        ...base,
        rating: "imprecisa",
        text: getFeedbackText(userSubscriptionLevel, 'imprecisa', 'freqMinor', { heroFreq, mainLabel, street: streetLabel, ctx: fctx }),
      };
    }
    // Frequência quase nula → é erro de verdade: segue para a análise de EV.
  }

  const hasNumbers = eq !== undefined && odds !== undefined;
  const fctx: FeedbackContext = {
    heroBB: effBB ?? 0,
    stage: advice.stageLabel,
    heroPosition: ctx?.heroPosition,
  };

  // Bateu com a recomendação: boa jogada.
  if (hf === af) {
    return { ...base, rating: "boa", text: getFeedbackText(userSubscriptionLevel, 'boa', 'aligned', { reason: advice.reason, street: streetLabel, ctx: fctx }) };
  }

  // ----- Erros de EV mensuráveis (pós-flop, com equity e odds) -----
  if (hasNumbers) {
    // Foldou com preço para continuar.
    if (hf === "fold" && (af === "call" || af === "aggro") && eq! >= odds!) {
      const surplus = eq! - odds!;
      return {
        ...base,
        rating: surplus > 0.1 ? "ruim" : "imprecisa",
        text: getFeedbackText(userSubscriptionLevel, surplus > 0.1 ? 'ruim' : 'imprecisa', 'foldWithPrice', { equity: eq!, odds: odds!, adviceAction: advice.action, surplus, street: streetLabel, ctx: fctx }),
      };
    }
    // Pagou sem preço.
    if (hf === "call" && af === "fold" && eq! < odds!) {
      const gap = odds! - eq!;
      return {
        ...base,
        rating: gap > 0.15 ? "ruim" : "imprecisa",
        text: getFeedbackText(userSubscriptionLevel, gap > 0.15 ? 'ruim' : 'imprecisa', 'callWithoutOdds', { equity: eq!, odds: odds!, gap, street: streetLabel, ctx: fctx }),
      };
    }
    // Agressivo demais.
    if (hf === "aggro" && (af === "call" || af === "check")) {
      return {
        ...base,
        rating: "ok",
        text: getFeedbackText(userSubscriptionLevel, 'ok', 'aggroTooMuch', { adviceAction: advice.action, street: streetLabel, ctx: fctx }),
      };
    }
    // Passivo com mão de valor.
    if ((hf === "call" || hf === "check") && af === "aggro") {
      return {
        ...base,
        rating: "imprecisa",
        text: getFeedbackText(userSubscriptionLevel, 'imprecisa', 'passiveWithValue', { adviceAction: advice.action, equity: eq, street: streetLabel, ctx: fctx }),
      };
    }
  }

  // ----- Pré-flop (sem equity/odds diretas) -----
  if (advice.kind === "preflop") {
    if ((hf === "call" || hf === "aggro") && af === "fold") {
      return {
        ...base,
        rating: "imprecisa",
        text: getFeedbackText(userSubscriptionLevel, 'imprecisa', 'loosePlay', { street: streetLabel, ctx: fctx }),
      };
    }
    if (hf === "fold" && af !== "fold") {
      return {
        ...base,
        rating: "imprecisa",
        text: getFeedbackText(userSubscriptionLevel, 'imprecisa', 'tooTight', { adviceAction: advice.action, street: streetLabel, ctx: fctx }),
      };
    }
    if (hf === "call" && af === "aggro") {
      return {
        ...base,
        rating: "ok",
        text: getFeedbackText(userSubscriptionLevel, 'ok', 'couldBeAggro', { adviceAction: advice.action, street: streetLabel, ctx: fctx }),
      };
    }
    if (hf === "aggro" && af === "call") {
      return {
        ...base,
        rating: "ok",
        text: getFeedbackText(userSubscriptionLevel, 'ok', 'aggroButPlayable', { adviceAction: advice.action, street: streetLabel, ctx: fctx }),
      };
    }
  }

  // Casos restantes: diferença leve.
    return {
      ...base,
      rating: "imprecisa",
      text: getFeedbackText(userSubscriptionLevel, 'imprecisa', 'differentPattern', { adviceAction: advice.action, reason: advice.reason, street: streetLabel, ctx: fctx }),
    };
}



/**
 * Limpa o "reason" técnico do motor para o modo SIMPLES: tira equity/preço/%
 * e comparações, deixando só a linguagem plana. Tamanho em bb (ex.: "5.0bb") é
 * preservado — é concreto e útil; só o jargão de equity/preço sai. Assim o
 * recreativo lê "não valia o preço, folda" em vez de "equity 33% < preço 42%".
 */
export function plainReason(reason: string): string {
  let r = reason ?? "";
  // Parênteses técnicos: "(equity 33% vs range premium)" some; "(5.0bb)" fica.
  r = r.replace(/\s*\([^)]*\)/g, (m) => (/equity|%|preço|EV|\brange\b/i.test(m) ? "" : m));
  // Comparações de equity/preço.
  r = r.replace(/\bequity\s*\d+%\s*[<>]?\s*(?:preço\s*\d+%)?/gi, "");
  r = r.replace(/\bpreço\s*\d+%/gi, "");
  r = r.replace(/\b\d+%/g, ""); // qualquer % solto
  // Conectivos órfãos deixados pra trás.
  r = r.replace(/\s*[<>]\s*/g, " ");
  r = r.replace(/\bvs\.?\s+(?=e\b|\.|,|$)/gi, "");
  // Colapsa pontuação/espaços resultantes.
  r = r.replace(/:\s+(?=e\b)/gi, " ");   // "folda:  e não" -> "folda e não"
  r = r.replace(/:\s*(?=[:.,])/g, "");   // ": :" / ": ." / ": ,"
  r = r.replace(/\s{2,}/g, " ");
  r = r.replace(/\s+([.,:;])/g, "$1");
  r = r.replace(/[\s:—-]+$/, "").trim();
  if (r && !/[.!?]$/.test(r)) r += ".";
  return r;
}

function getFeedbackText(level: UserSubscriptionLevel, rating: Rating, key: string, vars: Record<string, any>): string {
  const heroAction = vars.heroAction ? actionLabel(vars.heroAction) : '';
  const mainLabel = vars.mainLabel ? actionLabel(vars.mainLabel) : '';
  const adviceAction = vars.adviceAction ? actionLabel(vars.adviceAction) : '';
  const equity = vars.equity !== undefined ? pc(vars.equity) : 'alta';
  const odds = vars.odds !== undefined ? pc(vars.odds) : '';
  // No SIMPLES (free) o "reason" do motor sai sem jargão técnico; nos modos
  // Técnico/Ultra fica cru (com os números), que é onde eles fazem sentido.
  const reasonText = level === 'free' ? plainReason(vars.reason ?? '') : (vars.reason ?? '');

  const heroFreq = vars.heroFreq !== undefined ? pc(vars.heroFreq) : '';
  const surplus = vars.surplus !== undefined ? vars.surplus.toFixed(1) : '';
  const gap = vars.gap !== undefined ? vars.gap.toFixed(1) : '';
  // Âncora curta no SPOT REAL (posição) — a auditoria pediu que a dica aponte
  // para o spot, não use elogio genérico ("jogadores fortes fazem isso"). Fica
  // vazio quando não temos a posição, pra não inventar contexto.
  const heroPos = vars.ctx?.heroPosition as string | undefined;
  const spotTag = heroPos ? ` de ${heroPos}` : "";

  // Cada chave pode ter VÁRIAS variações do mesmo feedback — sorteia uma por
  // decisão, pra o texto não sair "copia e cola" de mão pra mão. O sorteador
  // recebe um seed determinístico (chave + rua + ação) pra não mudar o texto
  // se o mesmo feedback for renderizado de novo (ex.: modal reaberto).
  // Variação depende do momento exato da decisão (rua + ação + contexto),
  // então a mesma chave gera textos diferentes entre mãos — mas o texto
  // continua estável se a mesma decisão for avaliada de novo.
  const seed = `${key}-${vars.street ?? ""}-${vars.heroAction ?? ""}-${vars.ctx?.heroPosition ?? ""}-${Math.round((vars.ctx?.heroBB ?? 0) * 5)}`;

  const texts: Record<UserSubscriptionLevel, Record<Rating, Record<string, string[]>>> = {
    free: {
      boa: {
        freqMain: [
          `Boa! ${heroAction} é a jogada principal aqui${spotTag}. Mandou bem — segue assim.`,
          `Isso aí. Nesse spot${spotTag}, ${heroAction} é a linha certa. Tava no caminho.`,
          `Jogada certa: ${heroAction} é o que o spot pede${spotTag}. Nesse ritmo.`,
        ],
        aligned: [
          `Boa! Você fez o que um jogador experiente faria. ${reasonText}`,
          `Jogada sólida. ${reasonText}`,
          `Correto — foi o que um jogador experiente faria. ${reasonText}`,
        ],
      },
      ok: {
        freqValid: [
          `Ok, dá pra fazer assim, mas nesse spot o mais comum é ${mainLabel}.`,
          `Jogada aceitável, mas o mais frequente aqui é ${mainLabel} — fica de olho.`,
          `Passou, mas o padrão desse spot pede ${mainLabel}.`,
        ],
        aggroTooMuch: [
          `Você foi agressivo demais aqui. O padrão seria ${adviceAction}. Não é erro, mas pode encher o pote sem precisar.`,
          `Agressividade a mais: o padrão era ${adviceAction}. Dá pra jogar assim, mas sem necessidade.`,
          `Aqui o padrão pedia ${adviceAction}. Agressivo demais pode engordar o pote à toa.`,
        ],
        couldBeAggro: [
          `Dava pra pressionar mais. O padrão aqui é ${adviceAction} — vale a pena experimentar.`,
          `Mão forte demais pra ficar quieto: o padrão aqui é ${adviceAction}.`,
          `Aqui o padrão pede ${adviceAction} — deixar o vilão agir de graça é perder valor.`,
        ],
        aggroButPlayable: [
          `Mais agressivo que o padrão (${adviceAction}). Jogável, mas cuidado com o risco.`,
          `Saiu do padrão (${adviceAction}), mas é linha que dá pra jogar — só saiba o que arrisca.`,
          `O padrão aqui é ${adviceAction}; o que você fez ainda é jogável, com ressalvas.`,
        ],
      },
      imprecisa: {
        freqMinor: [
          `Essa é uma linha que se usa de vez em quando, mas o mais comum nesse spot é ${mainLabel}.`,
          `Dá pra usar assim de vez em quando, mas o mais comum aqui é ${mainLabel}.`,
          `Linha menos frequente: o padrão costuma ser ${mainLabel} nesse spot.`,
        ],
        foldWithPrice: [
          `Aqui o padrão era continuar. Sua mão tinha chance suficiente de ganhar — o preço que te pediram valia o risco. Foldear aqui entrega fichas de graça.`,
          `O preço valia o risco: sua mão tinha chance de ganhar e o padrão era ${adviceAction}. Foldear aqui foi entregar fichas.`,
          `Mão boa demais pra foldar com esse preço — o padrão era ${adviceAction}. Continue quando o preço for justo.`,
        ],
        callWithoutOdds: [
          `Aqui o padrão era foldar. Sua mão não tinha chance suficiente pro preço que te pediram. Guardou as fichas pra chegar na final.`,
          `O padrão era foldar: sua mão não tinha chance suficiente pro preço. Fichas guardadas são fichas pra final.`,
          `Mão fraca demais pra esse preço — o padrão era foldar. Guardar fichas também é ganhar.`,
        ],
        passiveWithValue: [
          `Aqui o padrão era ${adviceAction}. Sua mão era forte o suficiente pra pressionar — deixar o vilão agir de graça perde valor.`,
          `Mão forte pedindo ação: o padrão era ${adviceAction}. Deixar o vilão jogar de graça joga valor fora.`,
          `O padrão aqui é ${adviceAction} — com essa mão, pressão é o que paga suas fichas.`,
        ],
        loosePlay: [
          `Jogada solta. Sua mão não deve ser jogada dessa posição. O padrão era foldar.`,
          `Mão fraca demais pra essa posição — o padrão era foldar. Paciência é o que te leva à final.`,
          `Aqui o padrão é esperar mão melhor: sua mão não é jogável dessa posição.`,
          `Jogou mão que não é pra essa cadeira. O padrão era foldar — guarda as fichas pra chegar na final.`,
        ],
        tooTight: [
          `Apertado demais. Sua mão era boa o suficiente pra ${adviceAction} dessa posição. Não deixe fichas boas na mão.`,
          `Mão boa demais pra foldar — era ${adviceAction} dessa posição. Apertar demais também custa fichas.`,
          `Aqui sua mão estava no range de ${adviceAction} — foldar foi deixar fichas boas na mão.`,
        ],
        differentPattern: [
          `Diferente do padrão. O que um jogador experiente faria aqui é ${adviceAction}. ${reasonText}`,
          `O padrão aqui é ${adviceAction}. ${reasonText}`,
          `Saiu da linha padrão: o que um jogador experiente faria é ${adviceAction}. ${reasonText}`,
        ],
      },
      ruim: {
        foldWithPrice: [
          `Fold ruim: sua mão tinha chance de ganhar e o preço valia o risco. O padrão era ${adviceAction}.`,
          `Erro claro: o preço valia o risco e o padrão era ${adviceAction} — foldar aqui custou caro.`,
        ],
        callWithoutOdds: [
          `Pagou caro demais. Sua mão não tinha chance de ganhar o suficiente. O padrão era foldar.`,
          `Call caro: sua mão não pagava o preço. O padrão era foldar — essas fichas fazem falta.`,
        ],
      },
    },
    technical: {
      boa: {
        freqMain: [
          `Excelente! Sua jogada está alinhada com a frequência principal (${heroFreq}) da estratégia mista.`,
          `Jogada ótima — você seguiu a frequência principal (${heroFreq}) da estratégia mista.`,
        ],
        aligned: [
          `Alinhado com o padrão. ${reasonText}`,
          `Boa jogada, alinhada ao padrão. ${reasonText}`,
        ],
      },
      ok: {
        freqValid: [
          `Jogada válida da estratégia mista (~${heroFreq}), mas o padrão prefere ${mainLabel} para otimizar o EV.`,
          `Linha válida (~${heroFreq}) da estratégia mista, mas ${mainLabel} otimiza mais o EV.`,
        ],
        aggroTooMuch: [
          `Mais agressivo que o padrão (${adviceAction}). Jogável, mas pode inflar o pote sem precisar.`,
          `Agressividade acima do padrão (${adviceAction}): jogável, mas infla o pote sem necessidade.`,
        ],
        couldBeAggro: [
          `Dava para ser mais agressivo: o padrão aqui é ${adviceAction}.`,
          `Perda de EV: o padrão aqui é ${adviceAction} — agressão é a linha de maior valor.`,
        ],
        aggroButPlayable: [
          `Mais agressivo que o padrão (${adviceAction}); jogável.`,
          `Linha mais agressiva que o padrão (${adviceAction}); jogável, mas com risco.`,
        ],
      },
      imprecisa: {
        freqMinor: [
          `Linha minoritária (~${heroFreq}): pode ser usada ocasionalmente, mas o padrão costuma ${mainLabel}.`,
          `Frequência baixa (~${heroFreq}): ocasional, mas o padrão prefere ${mainLabel}.`,
        ],
        foldWithPrice: [
          `Fold ${surplus > 0.1 ? "ruim" : "apertado"}: sua equity (${equity}) pagava o preço (${odds}). O padrão era ${adviceAction}.`,
          `Sua equity (${equity}) pagava o preço (${odds}) — fold ${surplus > 0.1 ? "ruim" : "apertado"}. O padrão era ${adviceAction}.`,
        ],
        callWithoutOdds: [
          `Call com EV negativo: equity (${equity}) abaixo do preço (${odds}). O padrão era foldar.`,
          `Preço não fechou: equity (${equity}) < ${odds}. Call com EV negativo — o padrão era foldar.`,
        ],
        passiveWithValue: [
          `Perdeu valor/iniciativa: o padrão aqui é ${adviceAction} (equity ${equity}).`,
          `Equity ${equity} pede ação: o padrão é ${adviceAction} — passividade perdeu valor.`,
        ],
        loosePlay: [
          `Leak de range: sua mão está fora do range recomendado para a posição. O padrão era foldar.`,
          `Mão fora do range da posição: leak de range — o padrão era foldar.`,
        ],
        tooTight: [
          `Apertado demais: sua mão estava no range de ${adviceAction} para a posição.`,
          `Sua mão estava no range de ${adviceAction} — foldar foi apertar demais para a posição.`,
        ],
        differentPattern: [
          `Diferente do padrão (${adviceAction}). ${reasonText}`,
          `Desvio do padrão (${adviceAction}). ${reasonText}`,
        ],
      },
      ruim: {
        foldWithPrice: [
          `Fold ruim: sua equity (${equity}) pagava o preço (${odds}). O padrão era ${adviceAction}.`,
          `Fold com EV negativo: equity (${equity}) > preço (${odds}). O padrão era ${adviceAction}.`,
        ],
        callWithoutOdds: [
          `Call com EV negativo: equity (${equity}) abaixo do preço (${odds}). O padrão era foldar.`,
          `Call caro: equity (${equity}) < ${odds} — EV negativo. O padrão era foldar.`,
        ],
      },
    },
    ultra: {
      boa: {
        freqMain: [
          `Optimal play. Sua ação maximiza o EV neste spot, alinhada à frequência (${heroFreq}) da estratégia mista.`,
          `Optimal play: alinhado à frequência (${heroFreq}) da estratégia mista, maximizando EV.`,
        ],
        aligned: [
          `Optimal play. ${reasonText}`,
          `Linha GTO. ${reasonText}`,
        ],
      },
      ok: {
        freqValid: [
          `Desvio marginal do GTO (~${heroFreq}), mas o padrão prefere ${mainLabel} para balanceamento de range.`,
          `Linha válida mas subótima (~${heroFreq}): ${mainLabel} balanceia melhor o range.`,
        ],
        aggroTooMuch: [
          `Linha explorável: mais agressivo que o padrão (${adviceAction}). Pode ser explorado por vilões atentos.`,
          `Overagression explorável (${adviceAction}): vilões atentos podem ajustar.`,
        ],
        couldBeAggro: [
          `Perda de EV: o padrão aqui é ${adviceAction} para maximizar a fold equity e valor.`,
          `O padrão é ${adviceAction} — passividade custa fold equity e valor.`,
        ],
        aggroButPlayable: [
          `Linha explorável: mais agressivo que o padrão (${adviceAction}); jogável, mas com risco de desbalanceamento.`,
          `Mais agressivo que o padrão (${adviceAction}); jogável, mas desbalanceia o range.`,
        ],
      },
      imprecisa: {
        freqMinor: [
          `Linha minoritária (~${heroFreq}): pode ser usada para exploração, mas o padrão GTO costuma ${mainLabel}.`,
          `Frequência baixa (~${heroFreq}): explorável ocasionalmente; o GTO costuma ${mainLabel}.`,
        ],
        foldWithPrice: [
          `Fold com -${surplus}bb de EV: sua equity (${equity}) pagava o preço (${odds}). O padrão GTO era ${adviceAction}.`,
          `EV de -${surplus}bb: equity (${equity}) > preço (${odds}). O padrão GTO era ${adviceAction}.`,
        ],
        callWithoutOdds: [
          `Call com -${gap}bb de EV: equity (${equity}) abaixo do preço (${odds}). O padrão GTO era foldar.`,
          `EV de -${gap}bb: equity (${equity}) < ${odds}. O padrão GTO era foldar.`,
        ],
        passiveWithValue: [
          `Perda de valor/iniciativa: o padrão GTO aqui é ${adviceAction} (equity ${equity}).`,
          `Equity ${equity} exige ação: o padrão GTO é ${adviceAction}.`,
        ],
        loosePlay: [
          `Leak de range: sua mão está fora do range GTO recomendado para a posição. O padrão era foldar.`,
          `Mão fora do range GTO da posição — leak. O padrão era foldar.`,
        ],
        tooTight: [
          `Apertado demais: sua mão estava no range de ${adviceAction} para a posição, perdendo EV.`,
          `Mão no range de ${adviceAction}: foldar perdeu EV e desbalanceou o range.`,
        ],
        differentPattern: [
          `Desvio do padrão GTO (${adviceAction}). ${reasonText}`,
          `Fora do padrão GTO (${adviceAction}). ${reasonText}`,
        ],
      },
      ruim: {
        foldWithPrice: [
          `Fold com -${surplus}bb de EV: sua equity (${equity}) pagava o preço (${odds}). O padrão GTO era ${adviceAction}.`,
          `Erro GTO: -${surplus}bb de EV, equity (${equity}) > ${odds}. O padrão era ${adviceAction}.`,
        ],
        callWithoutOdds: [
          `Call com -${gap}bb de EV: equity (${equity}) abaixo do preço (${odds}). O padrão GTO era foldar.`,
          `Erro GTO: -${gap}bb de EV, equity (${equity}) < ${odds}. O padrão era foldar.`,
        ],
      },
    },
  };

  const baseText = pickVariation(seed)(texts[level]?.[rating]?.[key] ?? []) || resolveFallback(level, rating, key, texts);

  // Enriquece o texto com o contexto da mão (posição, stack, estágio) sem
  // alterar a nota — o texto fica mais vivo e menos "copia e cola".
  return enrichContext(baseText, vars.ctx as FeedbackContext | undefined, rating);
}

function resolveFallback(level: UserSubscriptionLevel, rating: Rating, key: string, texts: Record<UserSubscriptionLevel, Record<Rating, Record<string, string[]>>>): string {
  if (level === 'ultra' && texts.technical?.[rating]?.[key]) return pickVariation("fallback")(texts.technical[rating][key]);
  if ((level === 'ultra' || level === 'technical') && texts.free?.[rating]?.[key]) return pickVariation("fallback")(texts.free[rating][key]);
  return `[Feedback não encontrado para ${level}/${rating}/${key}]`;
}

// Sorteador determinístico: mesma chave ⇒ mesma variação (o texto não muda
// ao reabrir o modal ou re-renderizar a sessão). Mistura o seed em bits.
function pickVariation(seed: string): (options: string[]) => string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return (options: string[]) => options[h % options.length];
}

/**
 * Injeta contexto da mão no texto: posição/stack no início (modo simples
 * com linguagem natural, técnico com rótulo curto) e pressão de bolha/mesa
 * final no fim quando o torneio está em estágio tenso.
 */
function enrichContext(base: string, ctx: FeedbackContext | undefined, rating: Rating): string {
  let text = base;

  // Garante fluxo natural quando o prefixo de contexto entra: o texto base
  // segue em minúscula depois de ":" (prefixos de stack) e continua normal
  // após "," (prefixos de posição) — ajustando maiúscula inicial se preciso.
  const afterComma = (s: string): string =>
    s.charAt(0) === s.charAt(0).toUpperCase() && s.charAt(0) !== s.charAt(0).toLowerCase()
      ? s.charAt(0).toLowerCase() + s.slice(1)
      : s;

  // --- Prefixo de contexto (só quando o texto não já começa com o que o
  // --- contexto diria — fold correto de mão lixo não merece celebração). ---
  if (ctx) {
    const pos = ctx.heroPosition;
    const bb = ctx.heroBB;
    const stage = ctx.stage;

    // Frase de pressão quando o torneio está tenso: bolha ou mesa final.
    if ((stage === "bolha" || stage === "mesa_final") && isGoodDecision(rating)) {
      const bubbleNote =
        stage === "bolha"
          ? " Na bolha, suas fichas valem mais do que o pote — seguir o padrão aqui protege o seu prêmio."
          : " Na mesa final, cada decisão pesa no prêmio — seguir o padrão aqui te mantém no caminho do pódio.";
      text += bubbleNote;
    }

    // Contexto de posição: menciona a cadeira quando a decisão é relevante
    // para a posição (abertura pré-flop, defesas, etc.).
    if (pos && isPreflopRelevant(text)) {
      text = posContext(pos) + " " + afterComma(text);
    }

    // Contexto de stack: menciona a profundidade em spots onde ela importa
    // (stack curto: sobreviver; stack fundo: jogo normal). O prefixo termina
    // em ":" — o texto base entra com maiúscula preservada, fluxo natural.
    if (bb !== undefined && bb > 0 && isStackRelevant(text, bb)) {
      text = stackContext(bb) + " " + text;
    }
  }

  return text;
}

/** Envoltope pós-texto: adiciona a nota de EV etc. (mantido para compatibilidade). */
function enrich(rating: Rating, base: string, ctx: FeedbackContext | undefined): string {
  return enrichContext(base, ctx, rating);
}

function isGoodDecision(rating: Rating): boolean {
  return rating === "boa" || rating === "ok";
}

function isPreflopRelevant(text: string): boolean {
  // Texto pré-flop costuma falar de range/posição/abertura.
  if (!/range|abertura|posição|abrir|dessa posição|para a posição/i.test(text)) return false;
  // Não duplica: se o texto já cita uma posição concreta (ex.: "...abertura de HJ"),
  // o prefixo "Do Hijack (HJ)," ficaria redundante.
  const posMentioned = /\b(UTG1?|MP|LJ|HJ|CO|BTN|SB|BB)\b/i.test(text);
  return !posMentioned;
}

function isStackRelevant(text: string, bb: number): boolean {
  // Stack importa quando o texto fala de all-in/push/fold ou quando o stack é curto.
  if (bb > 15 && !/all-in|push|stack|short|curto/i.test(text)) return false;
  // Não duplica: se o texto já menciona o valor do stack ("com 199bb", "25bb"),
  // o prefixo ficaria redundante.
  const alreadyMentioned = /\d+bb|stack/i.test(text);
  return !alreadyMentioned;
}

function posContext(pos: string): string {
  switch (pos) {
    case "UTG": return "Do início da fila (UTG),";
    case "UTG1": return "Da segunda posição (UTG+1),";
    case "MP": return "Do meio da mesa (MP),";
    case "LJ": return "Do late position (LJ),";
    case "HJ": return "Do Hijack (HJ),";
    case "CO": return "Do cutoff (CO),";
    case "BTN": return "No botão (BTN),";
    case "SB": return "No small blind (SB),";
    case "BB": return "No big blind (BB),";
    default: return `De ${pos},`;
  }
}

function stackContext(bb: number): string {
  const n = Math.round(bb);
  if (n <= 10) return "Stack curtíssimo (" + n + "bb):";
  if (n <= 20) return "Stack curto (" + n + "bb):";
  if (n <= 40) return "Com " + n + "bb de stack,";
  return "Com " + n + "bb de stack,";
}

/** Resumo curto da mão a partir das notas das decisões. */
export function summarize(items: FeedbackItem[], level: UserSubscriptionLevel): string {
  if (items.length === 0) return "Sem decisões suas para avaliar nesta mão.";
  const counts: Record<Rating, number> = { boa: 0, ok: 0, imprecisa: 0, ruim: 0 };
  for (const it of items) counts[it.rating]++;

  const summaries: Record<UserSubscriptionLevel, Record<string, string>> = {
    free: {
      ruim: "Tiver erro claro aqui — olha embaixo.",
      imprecisa: "Bom, com uns ajustes finos.",
      boa: "Boa mão. Decisões alinhadas com o padrão.",
    },
    technical: {
      ruim: "Erro crítico de EV detectado. Revise as decisões com EV negativo para otimizar sua estratégia.",
      imprecisa: "Sua jogada foi aceitável, mas com imprecisões que podem custar EV a longo prazo. Analise os desvios.",
      boa: "Boa mão. Suas decisões foram alinhadas com a estratégia mista.",
    },
    ultra: {
      ruim: "Leak de EV significativo. Linha desviou do GTO, perda de valor.",
      imprecisa: "Desvio marginal do GTO. Linha explorável, dá pra ajustar o balanceamento.",
      boa: "Optimal play. Decisões alinhadas ao GTO, maximizando EV e explorando o range do vilão.",
    },
  };

  if (counts.ruim > 0) return summaries[level].ruim;
  if (counts.imprecisa > 0) return summaries[level].imprecisa;
  return summaries[level].boa;
}

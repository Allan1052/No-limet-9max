// ---------------------------------------------------------------------------
// "Sua Mão" — Monte sua mão real + análise em duas vozes (Simples / Técnico).
//
// O jogador reconstrói o spot real que viveu (ou que viu): posição, situação,
// vilão, cartas, estágio do torneio e stack. Nós calculamos a decisão correta
// com o MESMO motor do app (ranges de torneio, ajuste por profundidade de
// stack, 3-bet, push/fold) e explicamos o porquê em dois idiomas:
//
//   SIMPLES  — a voz de um amigo recreativo: curta, direta, sem jargão.
//   TÉCNICO  — o vocabulário que os grandes usam: range, equity, implied
//              odds, 3-bet, shove-or-fold, fold equity, ICM, M.
//
// O estágio do torneio muda a decisão de verdade (Allan pediu):
//   early → stacks cheias (100bb), implied odds valem, dá pra especular;
//   meio  → 40bb, jogo squeeze;
//   late  → stack curta (18bb), território shove-or-fold, ICM pesa.
//
// Tudo puro e testável; a UI só apresenta o resultado.
// ---------------------------------------------------------------------------
import { cardFromString, cardsToString, type Card } from "../engine/cards";
import { equityHandVsRange } from "../engine/equity";
import { buildTopRange } from "../ranges/build";
import { rangeCombos, type Range } from "../ranges/types";
import { BASELINE_PROFILE } from "../bots/profiles";
import { preflopDecision, type PreflopContext } from "../ranges/preflop";
import { stackDepthAdjust } from "../ranges/stackDepth";
import { comboToHandType, type Position } from "../ranges/types";
import { gradeDecision, type FeedbackItem } from "../feedback/analyzer";

export type StageKey = "early" | "meio" | "late";

/** Estágio → stack efetiva em big blinds (a decisão muda com a profundidade). */
export const STAGE_BB: Record<StageKey, number> = {
  early: 100,
  meio: 40,
  late: 18,
};

export const STAGE_LABEL: Record<StageKey, string> = {
  early: "Início · stacks cheias",
  meio: "Meio do torneio",
  late: "Fase final · stack curta",
};

/** Situações possíveis do spot (pré-flop, que o motor cobre hoje). */
export type SituationKey =
  | "open" // ninguém abriu: você é o primeiro a agir
  | "vsopen" // um vilão abriu antes de você
  | "vs3bet"; // um vilão 3-betou (open + raise)

export const SITUATION_LABEL: Record<SituationKey, string> = {
  open: "Ninguém abriu — você age primeiro",
  vsopen: "Um vilão abriu antes de você",
  vs3bet: "Um vilão 3-betou você",
};

export interface HandLabSpec {
  heroPosition: Position;
  villainPosition: Position;
  situation: SituationKey;
  stage: StageKey;
  stackBB: number; // stack efetivo em BB (o estágio dá um padrão, mas o usuário pode ajustar)
  hand: Card[]; // 2 cartas do herói
  board?: Card[]; // cartas da mesa (3-5) para análise pós-flop
  potBB?: number; // pote em BB (para calcular pot-odds)
  villainBetBB?: number; // aposta do vilão em BB (para calcular pot-odds)
}

export interface HandAnalysis {
  spec: HandLabSpec;
  handType: string; // ex. "AKo", "T9s"
  context: string; // resumo do spot em texto
  verdict: FeedbackItem; // avaliação da decisão recomendada pelo motor
  recommended: string; // fold | call | raise | allin
  simple: string; // explicação na voz do amigo
  technical: string; // explicação no vocabulário técnico
}

/** Traduz a ação do motor pro rótulo exibido ao jogador. */
function analyze(ctx: PreflopContext, hand: Card[]): { item: FeedbackItem; action: string } {
  void hand;
  const d = preflopDecision(ctx);
  const advice = {
    kind: "preflop" as const,
    action: d.action,
    reason: d.reason,
    mix: d.mix,
    effectiveBB: ctx.effectiveBB,
  };
  // Devolve TAMBÉM a ação real do motor — o badge e as vozes têm que vir daqui,
  // não de reparsear o texto do feedback (que gerava badge RAISE com texto Call).
  return { item: gradeDecision("Pré-flop", "free", d.action, advice), action: d.action };
}

/** Ação do motor → categoria do badge/voz (fold | call | raise | allin). */
function recommendedFrom(action: string): string {
  if (action === "fold") return "fold";
  if (action === "call") return "call";
  if (action === "jam" || action === "allin") return "allin";
  return "raise"; // raise / 3bet / 4bet / 5bet
}

/**
 * Analisa a mão reconstruída pelo jogador e devolve o veredito nas duas vozes.
 */
export function analyzeHand(spec: HandLabSpec): HandAnalysis {
  const handType = comboToHandType(spec.hand[0], spec.hand[1]);
  const sd = stackDepthAdjust(spec.stackBB);
  const openSize = 2.3;

  const ctx: PreflopContext = {
    heroPosition: spec.heroPosition,
    hand: spec.hand,
    effectiveBB: spec.stackBB,
    profile: BASELINE_PROFILE,
    variant: "holdem",
    raiserPosition: spec.situation === "open" ? undefined : spec.villainPosition,
    openSizeBB: openSize,
    threeBet: spec.situation === "vs3bet",
    betLevelFaced: spec.situation === "vs3bet" ? 2 : undefined,
  };

  const { item, action } = analyze(ctx, spec.hand);
  // O badge e as vozes vêm da DECISÃO REAL do motor — não de parsear o texto.
  const recommended = recommendedFrom(action);

  const stageCtx = stageContext(spec, handType, sd.pushFold);
  const simple = simpleVoice(recommended, handType, spec, stageCtx);
  const technical = technicalVoice(recommended, handType, spec, stageCtx, sd.pushFold);

  return {
    spec,
    handType,
    context: buildContext(spec),
    verdict: item,
    recommended,
    simple,
    technical,
  };
}

function buildContext(spec: HandLabSpec): string {
  return `${spec.heroPosition} · ${spec.stackBB}bb · ${SITUATION_LABEL[spec.situation]}`;
}

/** Frase de contexto ligada ao estágio — o porquê de ele mudar a decisão. */
function stageContext(spec: HandLabSpec, handType: string, pushFold: boolean): string {
  if (pushFold) {
    return `stack curta: nesse ponto do torneio quem abre geralmente dá all-in — com ${handType} a escolha é ${pushFold ? "jam ou largar" : "preservar"}`;
  }
  if (spec.stage === "early") {
    return `stacks cheias: ${handType} com implied odds valem mais (dê valor nos streets seguintes)`;
  }
  return `torneio andando: preserve fichas — com ${handType}, ataque só quando tiver vantagem`;
}

// ---------------------------------------------------------------------------
// VOZES
// ---------------------------------------------------------------------------

function simpleVoice(
  action: string,
  hand: string,
  spec: HandLabSpec,
  _ctx: string,
): string {
  const pos = spec.heroPosition;
  if (action === "fold") {
    if (spec.situation === "vs3bet") {
      return `Era FOLD. Quando alguém 3-beta, a mão dele é muito forte — ${hand} perde pra quase tudo ali. Solta e espera a sua. Não é covardia, é paciência.`;
    }
    if (spec.situation === "vsopen") {
      return `Era FOLD. Quem abre primeiro (${spec.villainPosition}) mostrou força logo de cara, e ${hand} de ${pos} não é mão pra entrar nessa briga. Deixa ir.`;
    }
    return `Era FOLD. Ninguém abriu ainda, e de ${pos} quem abre primeiro precisa de mão de verdade. ${hand} não é. Largue e espere algo melhor.`;
  }
  if (action === "allin") {
    return `Era ALL-IN. Com esse monte de fichas que você tem (${spec.stackBB}bb), a melhor jogada é ir tudo de uma vez. Quem hesita nesse ponto morre devagar. Empurra!`;
  }
  if (action === "raise") {
    if (spec.situation === "open") {
      return `Era RAISE. ${hand} é mão boa demais pra entrar de carona: abra com força e faça os outros decidirem. Incentiva quem é tímido.`;
    }
    return `Era RAISE. ${hand} contra ${spec.villainPosition} não é mão pra só acompanhar — re-ergue o pote e toma o controle. Quem só paga fica refém da mesa.`;
  }
  return `Era CALL. ${hand} é jogável de ${pos} — paga e vê o flop. Mas de olho: se o flop não ajudar, solta barato.`;
}

function technicalVoice(
  action: string,
  hand: string,
  spec: HandLabSpec,
  ctx: string,
  pushFold: boolean,
): string {
  const depth = depthTalk(spec.stackBB);
  const stageTalk = stageTechnicalTalk(spec);
  const openTalk =
    spec.situation === "vsopen"
      ? `A abertura de ${spec.villainPosition} representa uma range ampla, mas quando você só pode foldar, pagar ou re-agir sem valor, a frequência de call tende a zero.`
      : spec.situation === "vs3bet"
        ? `O 3-bet do vilão polariza a range dele (value e bluff de pressão). Contra esse bloco, ${hand} está abaixo da frequência mínima de defesa.`
        : `De ${spec.heroPosition}, a range de abertura padrão (RFI) é apertada: só entra quem tem equity para abrir sem informação.`;

  const decisionTalk =
    action === "fold"
      ? `${hand} fica abaixo do limiar da range de defesa/abertura para essa profundidade${pushFold ? ", e em shove-or-fold o custo de pagar é proibitivo" : ""}. A linha passa a mão.`
      : action === "allin"
        ? `Em profundidade de shove-or-fold, abrir pequeno é ineficiente: o shove maximiza fold equity e nega realize ao vilão. ${hand} está dentro da faixa de jam para ${spec.stackBB}bb.`
        : action === "raise"
          ? `${hand} tem equity e jogabilidade para liderar o pote. Re-raise/abertura captura valor e impõe fold equity — manter a iniciativa vale mais que defender passivamente.`
          : `${hand} está na borda da range: o call só se justifica com implied odds (stacks profundas) ou preço favorável. Aceitável, porém a linha preferencial é liderar ou largar.`;

  return `${ctx}. ${stageTalk} ${openTalk} ${depth} ${decisionTalk}`.trim();
}

function stageTechnicalTalk(spec: HandLabSpec): string {
  if (spec.stage === "early") {
    return "Início de torneio: stacks de 200bb+, implied odds altos — conectores e suited gain value real nos streets seguintes.";
  }
  if (spec.stage === "late") {
    return "Fase final: o M está caindo, o custo de cegar cresce a cada órbita e o ICM começa a pesar — cada decisão vale mais fichas que no início.";
  }
  return "Meio de torneio: pressão de bolha se aproxima; a profundidade média cai e o jogo muda de speculate para squeeze.";
}

function depthTalk(bb: number): string {
  if (bb >= 60) return "Com 60bb+, o jogo pré-flop é profundo: sizing padrão (2–2.5bb) e pós-flop decide.";
  if (bb >= 30) return "Com 30–60bb, o sizing continua padrão, mas erros pré-flop custam caro — margem de erro menor.";
  return "Abaixo de 30bb, o pré-flop domina a decisão: shove-or-fold e tamanhos de 3-bet curtos.";
}

// ---------------------------------------------------------------------------
// Utilitários para a UI
// ---------------------------------------------------------------------------

/** Converte texto de mão ("AsKh", "T9s") em Cards; retorna null se inválida. */
export function parseHand(text: string): Card[] | null {
  const s = text.replace(/\s+/g, "").toUpperCase();
  if (s.length < 4) return null;
  try {
    const a = cardFromString(s.slice(0, 2));
    const b = cardFromString(s.slice(2, 4));
    if (a === b) return null;
    return [a, b];
  } catch {
    return null;
  }
}

export const RANK_OPTIONS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
export const SUIT_OPTIONS = [
  { key: "s", symbol: "♠", name: "Espadas" },
  { key: "h", symbol: "♥", name: "Copas" },
  { key: "d", symbol: "♦", name: "Ouros" },
  { key: "c", symbol: "♣", name: "Paus" },
];

/** Rótulo bonito da mão, ex. "K♠ Q♥" → "KQo / KQs". */
export function handLabel(cards: Card[]): string {
  return comboToHandType(cards[0], cards[1]);
}


// ---------------------------------------------------------------------------
// PÓS-FLOP — análise quando o jogador informa o board.
// ---------------------------------------------------------------------------

/** Street atual baseado no tamanho do board. */
export function boardStreet(board: Card[]): string {
  if (board.length === 3) return "Flop";
  if (board.length === 4) return "Turn";
  if (board.length === 5) return "River";
  return "";
}

/**
 * Resultado da análise pós-flop.
 */
export interface PostflopAnalysis {
  equity: number; // % de equity do herói vs villain
  potOdds: number | null; // % de pot odds (null se não tem aposta pra pagar)
  evLabel: string; // "+EV" / "0" / "-EV"
  recommendation: string; // fold | call | raise | check
  simpleText: string;
  technicalText: string;
}

/**
 * % de range do vilão baseada na situação (abertura genérica).
 * BTN abre largo (40%), MP aperto (25%), UTG muito aperto (15%), CO (30%).
 */
function villainOpenPercent(pos: Position): number {
  const map: Record<string, number> = {
    UTG: 0.15,
    MP: 0.20,
    HJ: 0.25,
    CO: 0.30,
    BTN: 0.40,
    SB: 0.35,
    BB: 0.30,
  };
  return map[pos] ?? 0.25;
}

/**
 * Analisa a mão do herói contra o board e a range do vilão.
 * Usa Monte Carlo (2000 iterações) pra calcular equity.
 */
export function analyzePostflop(spec: HandLabSpec): PostflopAnalysis {
  const board = spec.board ?? [];
  if (board.length === 0 || board.length > 5) {
    return {
      equity: 0,
      potOdds: null,
      evLabel: "0",
      recommendation: "check",
      simpleText: "Sem board — volte pro pré-flop.",
      technicalText: "Sem board informado, não é possível calcular equity.",
    };
  }

  // Range do vilão baseada na posição dele
  const vPercent = villainOpenPercent(spec.villainPosition);
  const villainRange: Range = buildTopRange(vPercent);
  const villainCombos: Card[][] = rangeCombos(villainRange);

  // Equity do herói vs villain no board
  const eqResult = equityHandVsRange(spec.hand, villainCombos, board, 2000);
  const equity = Math.round(eqResult.equity * 100);

  // Pot odds
  let potOdds: number | null = null;
  let potBB = spec.potBB ?? 0;
  let villainBetBB = spec.villainBetBB ?? 0;
  if (villainBetBB > 0 && potBB > 0) {
    potOdds = Math.round((villainBetBB / (potBB + villainBetBB * 2)) * 100);
  }

  // Recomendação
  let recommendation: string;
  let evLabel: string;
  if (potOdds === null) {
    // Sem aposta pra pagar — check ou bet
    recommendation = equity > 60 ? "raise" : "check";
    evLabel = equity > 50 ? "+EV" : "-EV";
  } else {
    // Tem aposta — precisa pagar. Equity > pot odds = call.
    if (equity >= potOdds + 5) {
      recommendation = equity > 70 ? "raise" : "call";
      evLabel = "+EV";
    } else if (equity >= potOdds - 5) {
      recommendation = "call"; // borderline
      evLabel = "0";
    } else {
      recommendation = "fold";
      evLabel = "-EV";
    }
  }

  const street = boardStreet(board);
  const handType = comboToHandType(spec.hand[0], spec.hand[1]);
  const boardText = cardsToString(board);

  // Voz simples
  const simpleText =
    potOdds !== null
      ? `${handType} no ${street} (${boardText}). Você tem ${equity}% de equity. O vilão aposta ${villainBetBB}bb num pote de ${potBB}bb — o preço é ${potOdds}%. ${equity > potOdds ? "Equity ganha do preço — paga!" : "Equity não paga o preço — fold é a escolha certa."}`
      : `${handType} no ${street} (${boardText}). Você tem ${equity}% de equity. ${equity > 60 ? "Você é favorito — aposta pra extrair valor!" : equity > 40 ? "Board é disputado — check e reavalie." : "Você está atrás — check ou fold se tomar aposta."}`;

  // Voz técnica
  const rangeLabel = `${vPercent * 100}% das mãos`;
  const technicalText =
    potOdds !== null
      ? `No ${street}, sua equity contra a range de abertura do vilão (${rangeLabel}) é ${equity}% (Monte Carlo, 2000 iterações). Pot odds: ${potOdds}%. ${equity > potOdds ? `Equity > pot odds → call/raise é +EV. ${equity > 70 ? "Com margem grande, raise captura mais valor." : "Call direto, sem margem pra raise."}` : `Equity < pot odds → fold é a decisão correta. A matemática não permite pagar aqui.`}`
      : `No ${street}, sua equity contra a range de abertura do vilão (${rangeLabel}) é ${equity}%. ${equity > 60 ? "Você tem vantagem clara — bet por valor extrai. Considere sizing 2/3 a 3/4 pot." : equity > 40 ? "Equity é marginal — check-call é a linha padrão. Não precisa dar graça, mas também não precisa inflar o pote." : "Você está atrás da range do vilão. Check-fold ou bet de controle de pote."}`;

  return {
    equity,
    potOdds,
    evLabel,
    recommendation,
    simpleText,
    technicalText,
  };
}

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
import { cardFromString, type Card } from "../engine/cards";
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
function analyze(ctx: PreflopContext, hand: Card[]): FeedbackItem {
  void hand;
  const d = preflopDecision(ctx);
  const advice = {
    kind: "preflop" as const,
    action: d.action,
    reason: d.reason,
    mix: d.mix,
    effectiveBB: ctx.effectiveBB,
  };
  return gradeDecision("Pré-flop", "free", d.action, advice);
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

  const item = analyze(ctx, spec.hand);
  const recommended = item.text.toLowerCase().includes("all-in")
    ? "allin"
    : item.text.toLowerCase().startsWith("fold")
      ? "fold"
      : item.text.toLowerCase().startsWith("call")
        ? "call"
        : "raise";

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
    return "Início de torneio: stacks de 100bb+, implied odds altos — conectores e suited gain value real nos streets seguintes.";
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

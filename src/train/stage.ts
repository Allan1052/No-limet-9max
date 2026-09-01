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
import { cardFromString, cardsToString, seededRng, type Card } from "../engine/cards";
import { equityHandVsRange } from "../engine/equity";
import { buildTopRange } from "../ranges/build";
import { rangeCombos, type Range } from "../ranges/types";
import { BASELINE_PROFILE } from "../bots/profiles";
import { preflopDecision, type PreflopContext } from "../ranges/preflop";
import type { IcmSpot } from "../ranges/icm";
import { type Stage, STAGES } from "../tournament/structure";
import { stackDepthAdjust } from "../ranges/stackDepth";
import { comboToHandType, type Position } from "../ranges/types";
import { gradeDecision, type FeedbackItem } from "../feedback/analyzer";
import { decisionConfidence, type DecisionConfidence } from "./confidence";

export type StageKey = Stage;

export const STAGE_BB: Record<StageKey, number> = {
  inicio: STAGES.inicio.avgBB,
  meio: STAGES.meio.avgBB,
  bolha: STAGES.bolha.avgBB,
  mesa_final: STAGES.mesa_final.avgBB,
};

export const STAGE_LABEL: Record<StageKey, string> = {
  inicio: "Início · stacks cheias",
  meio: "Meio do torneio",
  bolha: "Bolha · ICM aperta",
  mesa_final: "Mesa final · ICM",
};

export function phasePressureLabel(stage: StageKey): { tag: string; note: string } {
  switch (stage) {
    case "inicio":
      return { tag: "Chip-EV · preço em fichas", note: "Decisão por posição, stack, range e preço — sem ICM." };
    case "meio":
      return { tag: "Transição · pressão crescente", note: "Leitura didática: o ICM real depende da premiação e de quem cobre quem." };
    case "bolha":
      return { tag: "ICM alto · risco de ficar fora", note: "Quebrar antes do dinheiro custa premiação simulada — calls mais seletivos." };
    case "mesa_final":
      return { tag: "ICM ativo · pay jumps", note: "Já premiado, mas cada eliminação pode custar saltos de premiação simulada." };
  }
}

export type SituationKey = "open" | "vsopen" | "vs3bet" | "vsallin";

export const SITUATION_LABEL: Record<SituationKey, string> = {
  open: "Ninguém abriu — você age primeiro",
  vsopen: "Um vilão abriu antes de você",
  vs3bet: "Um vilão 3-betou você",
  vsallin: "Um vilão deu all-in na sua frente",
};

export interface HandLabSpec {
  heroPosition: Position;
  villainPosition: Position;
  situation: SituationKey;
  stage: StageKey;
  stackBB: number;
  villainStackBB?: number;
  hand: Card[];
  board?: Card[];
  potBB?: number;
  villainBetBB?: number;
  anteBB?: number;
  finalTable?: FinalTableSpec;
  /** Marca o spec que veio da "Mão do dia" (Hoje) — abre o 1×1 em modo diário. */
  fromDaily?: boolean;
}

export interface FinalTableSpec {
  players: number;
  heroRank: number;
  shape: "equilibrado" | "escalonado";
}

export interface HandAnalysisMetrics {
  heroEquity?: number;
  potOdds?: number;
  requiredEquity?: number;
}

export interface HandAnalysis {
  spec: HandLabSpec;
  handType: string;
  context: string;
  verdict: FeedbackItem;
  recommended: string;
  simple: string;
  technical: string;
  whyNot: { label: string; text: string } | null;
  anchor: string;
  borderline: boolean;
  confidence: DecisionConfidence;
  /** Métricas calculadas na MESMA execução da decisão; nunca recalculadas pela UI/card. */
  metrics: HandAnalysisMetrics;
}

function analyze(
  ctx: PreflopContext,
  hand: Card[],
): { item: FeedbackItem; action: string; borderline: boolean; metrics: HandAnalysisMetrics } {
  void hand;
  const d = preflopDecision(ctx);
  const advice = {
    kind: "preflop" as const,
    action: d.action,
    reason: d.reason,
    mix: d.mix,
    effectiveBB: ctx.effectiveBB,
  };
  const borderline =
    d.equity !== undefined && d.requiredEquity !== undefined && Math.abs(d.equity - d.requiredEquity) < 0.03;
  const potOdds =
    ctx.callAmountBB !== undefined && ctx.contestablePotBB !== undefined
      ? ctx.callAmountBB / (ctx.contestablePotBB + ctx.callAmountBB)
      : undefined;
  return {
    item: gradeDecision("Pré-flop", "free", d.action, advice),
    action: d.action,
    borderline,
    metrics: {
      heroEquity: d.equity,
      potOdds,
      requiredEquity: d.requiredEquity,
    },
  };
}

function recommendedFrom(action: string): string {
  if (action === "fold") return "fold";
  if (action === "call") return "call";
  if (action === "jam" || action === "allin") return "allin";
  return "raise";
}

export function buildStageIcm(effBB: number, stage: StageKey): IcmSpot | undefined {
  const kind = STAGES[stage].icm;
  if (kind === "none") return undefined;
  if (kind === "bubble") {
    const heroStack = 20;
    return {
      stacks: [55, 40, 30, heroStack, 14, 10],
      payouts: [34, 27, 22, 17],
      hero: 3,
      villain: 0,
      chips: Math.min(Math.max(1, effBB), heroStack),
    };
  }
  const heroStack = 40;
  return {
    stacks: [heroStack, 50, 32, 22, 16],
    payouts: [28, 25, 22, 17, 13],
    hero: 0,
    villain: 1,
    chips: Math.min(Math.max(1, effBB), heroStack),
  };
}

function ftPayouts(players: number): number[] {
  return Array.from({ length: players }, (_, i) => Math.pow(0.72, i) * 100);
}

function ftShapeStacks(players: number, shape: "equilibrado" | "escalonado"): number[] {
  if (shape === "equilibrado") {
    return Array.from({ length: players }, (_, i) => 1.3 - (players > 1 ? (i / (players - 1)) * 0.7 : 0));
  }
  return Array.from({ length: players }, (_, i) => Math.pow(0.6, i));
}

export function buildFinalTableIcm(ft: FinalTableSpec, heroStackBB: number): IcmSpot {
  const players = Math.max(2, Math.min(9, Math.round(ft.players)));
  const rank = Math.max(1, Math.min(players, Math.round(ft.heroRank)));
  const rel = ftShapeStacks(players, ft.shape);
  const heroIdx = rank - 1;
  const scale = heroStackBB / rel[heroIdx];
  const stacks = rel.map((r) => Math.max(1, r * scale));
  stacks[heroIdx] = heroStackBB;
  let villain = 0;
  for (let i = 0; i < stacks.length; i++) {
    if (i !== heroIdx && stacks[i] > (villain === heroIdx ? -1 : stacks[villain] ?? -1)) villain = i;
  }
  if (villain === heroIdx) villain = (heroIdx + 1) % players;
  return {
    stacks,
    payouts: ftPayouts(players),
    hero: heroIdx,
    villain,
    chips: Math.min(heroStackBB, stacks[villain]),
  };
}

export function analyzeHand(spec: HandLabSpec): HandAnalysis {
  const handType = comboToHandType(spec.hand[0], spec.hand[1]);
  const sd = stackDepthAdjust(spec.stackBB);
  const openSize = 2.3;
  const eff = spec.stackBB;
  const icmSpot =
    spec.finalTable && STAGES[spec.stage].icm !== "none"
      ? buildFinalTableIcm(spec.finalTable, eff)
      : buildStageIcm(eff, spec.stage);
  const facingAllin = spec.situation === "vsallin";

  const ctx: PreflopContext = {
    heroPosition: spec.heroPosition,
    hand: spec.hand,
    effectiveBB: eff,
    villainStackBB:
      spec.villainStackBB != null && spec.villainStackBB > eff ? spec.villainStackBB : undefined,
    profile: BASELINE_PROFILE,
    variant: "holdem",
    raiserPosition: spec.situation === "open" ? undefined : spec.villainPosition,
    openSizeBB: facingAllin ? eff : openSize,
    threeBet: spec.situation === "vs3bet",
    betLevelFaced: spec.situation === "vs3bet" ? 2 : facingAllin ? 1 : undefined,
    anteBB: spec.anteBB,
    icmSpot,
    rng: seededRng((((spec.hand[0] + 1) * 2654435761 + (spec.hand[1] + 1) * 40503 + Math.round(eff) * 2246822519) >>> 0)),
    ...(facingAllin
      ? {
          allInsAhead: 1,
          numContesting: 1,
          callAmountBB: Math.max(0.5, eff - 1),
          contestablePotBB: eff + 0.5,
        }
      : {}),
  };

  const { item, action, borderline, metrics } = analyze(ctx, spec.hand);
  const recommended = recommendedFrom(action);

  const stageCtx = stageContext(spec, handType, sd.pushFold);
  const simple = simpleVoice(recommended, handType, spec, stageCtx, borderline);
  const technical = technicalVoice(recommended, handType, spec, stageCtx, sd.pushFold, borderline);

  return {
    spec,
    handType,
    context: buildContext(spec),
    verdict: item,
    recommended,
    simple,
    technical,
    whyNot: whyNotAlternative(spec, recommended, handType),
    anchor: anchorPhrase(spec),
    borderline,
    confidence: decisionConfidence({
      situation: spec.situation,
      stage: spec.stage,
      stackBB: spec.stackBB,
      handType,
      borderline,
      icmActive: STAGES[spec.stage].icm !== "none",
      hasRealStacks: spec.finalTable != null,
    }),
    metrics,
  };
}

function buildContext(spec: HandLabSpec): string {
  return `${spec.heroPosition} · ${spec.stackBB}bb · ${SITUATION_LABEL[spec.situation]}`;
}

export function contextSeal(spec: HandLabSpec): string {
  const st = STAGES[spec.stage];
  const icm = st.icm === "bubble" ? " · ICM bolha" : st.icm === "final" ? " · ICM" : "";
  const ante = spec.anteBB && spec.anteBB > 0 ? " · ante" : "";
  return `MTT 9-max · ${st.label} · ${Math.round(spec.stackBB)}bb${ante}${icm}`;
}

function stageContext(spec: HandLabSpec, handType: string, pushFold: boolean): string {
  if (pushFold) {
    return `stack curta: nesse ponto do torneio quem abre geralmente dá all-in — com ${handType} a escolha é ${pushFold ? "jam ou largar" : "preservar"}`;
  }
  if (spec.stage === "inicio") {
    return `stacks cheias: ${handType} com implied odds valem mais (dê valor nos streets seguintes)`;
  }
  if (spec.stage === "bolha") {
    return `bolha: cada ficha vale prêmio — com ${handType}, preservar supera disputar (ICM no talo)`;
  }
  if (spec.stage === "mesa_final") {
    return `mesa final: ICM pesa — com ${handType}, escolha as brigas que valem o pódio`;
  }
  return `torneio andando: preserve fichas — com ${handType}, ataque só quando tiver vantagem`;
}

function stageHasIcm(stage: StageKey): boolean {
  return STAGES[stage].icm !== "none";
}

function anchorPhrase(spec: HandLabSpec): string {
  if (spec.situation === "vsallin" && stageHasIcm(spec.stage)) {
    return "💡 Pot odds dizem quanto você precisa ganhar; o ICM diz quanto custa ser eliminado.";
  }
  if (spec.stage === "bolha") {
    return "💡 A bolha não manda foldar tudo — ela muda o preço do risco.";
  }
  if (spec.situation === "vsallin") {
    return "💡 Contra um all-in a conta é uma só: sua equity contra o range dele × o preço pra pagar.";
  }
  if (spec.situation === "vsopen" || spec.situation === "vs3bet") {
    return "💡 Range não é lista de mãos bonitas — é o conjunto que segue lucrativo nesta cadeira, com este stack, contra esta ação.";
  }
  return "💡 Abrir é roubar com plano: posição, stack e o que já há no pote decidem quais mãos valem a fila.";
}

function whyNotAlternative(
  spec: HandLabSpec,
  recommended: string,
  hand: string,
): { label: string; text: string } | null {
  const situ = spec.situation;
  const pos = spec.heroPosition;
  const icmOn = stageHasIcm(spec.stage);
  const shortStack = spec.stackBB <= 15;

  if (recommended === "fold") {
    if (situ === "vsallin") {
      return {
        label: "PAGAR",
        text: `${hand} não tem chance suficiente contra o range de all-in — pagar perde mais do que a conta devolve${icmOn ? ", e o ICM piora (quebrar custa prêmio)" : ""}. Call aqui é -EV.`,
      };
    }
    if (situ === "vs3bet") {
      return { label: "PAGAR", text: `contra um 3-bet a mão de ${pos} fica abaixo do range de defesa — pagar joga dominado e fora de posição.` };
    }
    if (situ === "vsopen") {
      return { label: "PAGAR", text: `${hand} está dominada ou mal posicionada contra a abertura — pagar só chama pra perder e sangra fichas.` };
    }
    return { label: "ABRIR", text: `${hand} fica fora do range de abertura de ${pos} — abrir cria um pote dominado e fora de posição, custando fichas no longo prazo.` };
  }

  if (recommended === "call") {
    if (situ === "vsallin") {
      return {
        label: "FOLDAR",
        text: `você tem equity de sobra contra o range de all-in — foldar deixaria fichas na mesa${shortStack ? ` e, com ${Math.round(spec.stackBB)}bb, você precisa dobrar pra seguir vivo` : ""}.`,
      };
    }
    return { label: "FOLDAR", text: `${hand} tem preço e equity pra continuar — foldar aqui é apertado demais e entrega um pote lucrativo.` };
  }

  if (situ === "open") {
    return { label: "FOLDAR", text: `${hand} está no range de abertura de ${pos} — foldar desperdiça um roubo lucrativo (com ante, ainda mais fichas mortas pra pegar).` };
  }
  if (situ === "vsopen") {
    return { label: "SÓ PAGAR", text: `${hand} é forte o bastante pra re-agredir — só pagar perde valor e entrega a iniciativa ao vilão.` };
  }
  return { label: "FOLDAR", text: `${hand} sustenta a agressão aqui — recuar deixa valor e fold equity na mesa.` };
}

function simpleVoice(
  action: string,
  hand: string,
  spec: HandLabSpec,
  _ctx: string,
  borderline = false,
): string {
  const pos = spec.heroPosition;
  if (spec.situation === "vsallin") {
    const icm = spec.stage === "bolha"
      ? " Na bolha o ICM está no talo: quebrar aqui = ganhar zero, então o padrão aperta muito."
      : spec.stage === "mesa_final"
        ? " Na mesa final pesa o ICM: quebrar custa prêmio, então o padrão aperta."
        : "";
    if (borderline) {
      return `É FRONTEIRA — quase 50/50. ${hand} contra o range de all-in dele fica praticamente EMPATADO com o preço, então ${action === "fold" ? "o padrão inclina levemente pra FOLD" : "o padrão inclina levemente pra CALL"}, mas é decisão apertada: os dois lados perdem/ganham pouco.${icm} Não é erro grave escolher o outro lado aqui.`;
    }
    if (action === "fold") {
      return `Era FOLD. O vilão foi com tudo e ${hand} não tem chance suficiente pra pagar — você perde mais vezes do que a conta paga.${icm} Guarda as fichas.`;
    }
    return `Era CALL. ${hand} tem equity de sobra contra o range de all-in dele — no longo prazo você ganha mais do que arrisca.${icm ? " Mesmo com o ICM, a mão paga." : ""} Bota as fichas.`;
  }
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
  borderline = false,
): string {
  const depth = depthTalk(spec.stackBB);
  const stageTalk = stageTechnicalTalk(spec);
  if (spec.situation === "vsallin") {
    const icmOn = stageHasIcm(spec.stage);
    const decision = borderline
      ? `${hand} fica praticamente NA equity exigida vs o range de all-in${icmOn ? " ajustado por ICM" : " pelas pot odds"} — é um spot de FRONTEIRA (a margem cabe dentro do ruído da estimativa de equity). O EV dos dois lados é quase igual; ${action === "fold" ? "fold" : "call"} é a inclinação, não uma decisão com folga. A premissa (range/preço/stack do shove) manda aqui.`
      : action === "fold"
        ? `${hand} fica abaixo da equity exigida vs o range de all-in${icmOn ? " ajustada por ICM (o risco de quebrar vale mais que dobrar)" : " pelas pot odds"}. Fold é a linha de maior EV${icmOn ? " de torneio" : ""}.`
        : `${hand} bate a equity exigida vs o range de all-in${icmOn ? ", mesmo com o ICM apertando o preço" : " pelas pot odds"}. Call é +EV: você realiza mais do que arrisca.`;
    return `${buildContext(spec)}. ${stageTalk} ${depth} ${decision}`.trim();
  }
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
  const bb = Math.max(1, Math.round(spec.stackBB));
  const depth = bb < 30
    ? `este spot é curto (${bb}bb): o pré-flop domina, então pense em shove-or-fold; não há implied odds de stack profunda`
    : bb < 60
      ? `este spot tem profundidade intermediária (${bb}bb): há menos espaço pós-flop que numa stack cheia e os erros pré-flop custam caro`
      : `este spot é profundo (${bb}bb): há espaço para jogar pós-flop e considerar implied odds, especialmente em posição`;

  if (spec.stage === "inicio") {
    return `Início de torneio: ${depth}.`;
  }
  if (spec.stage === "bolha") {
    return `Bolha, com ${bb}bb: o ICM está no máximo — bustar aqui vale ZERO (você para antes do dinheiro), então a fold equity de quem shova sobe e o call range aperta forte.`;
  }
  if (spec.stage === "mesa_final") {
    return `Mesa final, com ${bb}bb: já no dinheiro, mas o ICM ainda pesa — cada subida na premiação vale muito, o custo de eliminação é alto e os ranges de call apertam.`;
  }
  return `Meio de torneio, com ${bb}bb: pressão de bolha se aproxima; a profundidade média cai e o jogo muda de speculate para squeeze.`;
}

function depthTalk(bb: number): string {
  if (bb >= 60) return "Com 60bb+, o jogo pré-flop é profundo: sizing padrão (2–2.5bb) e pós-flop decide.";
  if (bb >= 30) return "Com 30–60bb, o sizing continua padrão, mas erros pré-flop custam caro — margem de erro menor.";
  return "Abaixo de 30bb, o pré-flop domina a decisão: shove-or-fold e tamanhos de 3-bet curtos.";
}

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

export function handLabel(cards: Card[]): string {
  return comboToHandType(cards[0], cards[1]);
}

export function boardStreet(board: Card[]): string {
  if (board.length === 3) return "Flop";
  if (board.length === 4) return "Turn";
  if (board.length === 5) return "River";
  return "";
}

export interface PostflopAnalysis {
  equity: number;
  potOdds: number | null;
  evLabel: string;
  recommendation: string;
  simpleText: string;
  technicalText: string;
}

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

  const vPercent = villainOpenPercent(spec.villainPosition);
  const villainRange: Range = buildTopRange(vPercent);
  const villainCombos: Card[][] = rangeCombos(villainRange);
  const eqResult = equityHandVsRange(spec.hand, villainCombos, board, 2000);
  const equity = Math.round(eqResult.equity * 100);

  let potOdds: number | null = null;
  let potBB = spec.potBB ?? 0;
  let villainBetBB = spec.villainBetBB ?? 0;
  if (villainBetBB > 0 && potBB > 0) {
    potOdds = Math.round((villainBetBB / (potBB + villainBetBB * 2)) * 100);
  }

  let recommendation: string;
  let evLabel: string;
  if (potOdds === null) {
    recommendation = equity > 60 ? "raise" : "check";
    evLabel = equity > 50 ? "+EV" : "-EV";
  } else {
    if (equity >= potOdds + 5) {
      recommendation = equity > 70 ? "raise" : "call";
      evLabel = "+EV";
    } else if (equity >= potOdds - 5) {
      recommendation = "call";
      evLabel = "0";
    } else {
      recommendation = "fold";
      evLabel = "-EV";
    }
  }

  const street = boardStreet(board);
  const handType = comboToHandType(spec.hand[0], spec.hand[1]);
  const boardText = cardsToString(board);

  const simpleText =
    potOdds !== null
      ? `${handType} no ${street} (${boardText}). Você tem ${equity}% de equity. O vilão aposta ${villainBetBB}bb num pote de ${potBB}bb — o preço é ${potOdds}%. ${equity > potOdds ? "Equity ganha do preço — paga!" : "Equity não paga o preço — fold é a escolha certa."}`
      : `${handType} no ${street} (${boardText}). Você tem ${equity}% de equity. ${equity > 60 ? "Você é favorito — aposta pra extrair valor!" : equity > 40 ? "Board é disputado — check e reavalie." : "Você está atrás — check ou fold se tomar aposta."}`;

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

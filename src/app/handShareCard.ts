// ---------------------------------------------------------------------------
// Hand Share Card — gera um card PNG elegante (1080×1080) de uma mão jogada,
// com a logo oficial, cartas, board, decisão e tip do coach.
// Ideal para compartilhar no Instagram/WhatsApp.
//
// Modo "simples": recreativo — posição, stack, ação, nota, frase simples.
// Modo "tecnico": com matemática — equity, potOdds, evBB (só se existirem).
// ---------------------------------------------------------------------------
import { rankOf, suitOf, RANKS, makeCard, type Card } from "../engine/cards";
import type { HandHistory, ReplayEvent } from "../app/replay";
import type { FeedbackItem, Rating } from "../feedback/analyzer";
import { LOGO_CF_BASE64 } from "./logoCfBase64";
import { evaluate, categoryOf, CATEGORY_NAMES_PT } from "../engine/evaluator";
import { buildHandStory } from "./handNarrative";

const SUIT_SYMBOL = ["♣", "♦", "♥", "♠"]; // ordem de SUITS = "cdhs"
const SUIT_RED = [false, true, true, false];

// Cores da marca
const COLOR_BG_DARK = "#0a1410";
const COLOR_BG_FELT = "#0d1f16";
const COLOR_GOLD = "#d4af37";
const COLOR_GOLD_BRIGHT = "#e6c454";
const COLOR_CREAM = "#ece7d5";
const COLOR_CREAM_DIM = "#b8b29a";
const COLOR_CARD_WHITE = "#f4f1e6";
const COLOR_RED_SUIT = "#c0392b";
const COLOR_BLACK_SUIT = "#1a1a1a";

export type ShareCardMode = "simples" | "tecnico";

/** Tipo de card: "decisao" = card da mão/decisão (padrão, simétrico ao modo
 *  simples/técnico); "historico" = card com o histórico completo da mão, rua por
 *  rua, com os valores apostados — feito para postar em carrossel no Instagram. */
export type ShareCardType = "decisao" | "historico" | "narrativa" | "erro";

export interface ShareCardOptions {
  mode?: ShareCardMode;
  cardType?: ShareCardType;
}


function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCardOnCanvas(
  ctx: CanvasRenderingContext2D,
  card: Card,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const r = rankOf(card);
  const s = suitOf(card);
  const rank = RANKS[r - 2];
  const suit = SUIT_SYMBOL[s];
  const color = SUIT_RED[s] ? COLOR_RED_SUIT : COLOR_BLACK_SUIT;
  const radius = Math.min(w, h) * 0.09;

  // Carta branca com sombra suave (projeta a carta sobre o feltro)
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 9;
  ctx.fillStyle = COLOR_CARD_WHITE;
  roundRect(ctx, x, y, w, h, radius);
  ctx.fill();
  ctx.restore();

  // Borda interna fina (acabamento de carta impressa)
  ctx.strokeStyle = "rgba(0,0,0,0.09)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, x + 4, y + 4, w - 8, h - 8, radius - 2);
  ctx.stroke();

  ctx.fillStyle = color;

  // Índice do canto: rank + naipe pequeno empilhados. Desenhado no topo-esquerdo
  // e espelhado 180° no canto inferior-direito — como carta de baralho de verdade.
  const idxSize = h * 0.155;
  const ax = w * 0.19; // centro da coluna do índice
  const ay = h * 0.075;
  const drawIndex = () => {
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = `bold ${idxSize}px Georgia, serif`;
    ctx.fillText(rank, ax, ay);
    ctx.font = `${idxSize * 0.82}px Georgia, serif`;
    ctx.fillText(suit, ax, ay + idxSize * 0.98);
  };
  ctx.save();
  ctx.translate(x, y);
  drawIndex();
  ctx.restore();
  ctx.save();
  ctx.translate(x + w, y + h);
  ctx.rotate(Math.PI);
  drawIndex();
  ctx.restore();

  // Pip central grande
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${h * 0.4}px Georgia, serif`;
  ctx.fillText(suit, x + w / 2, y + h * 0.55);
}

/** Carrega a logo oficial em base64 e a desenha no topo do card. */
function drawLogoImage(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const dim = size;
      const x = cx - dim / 2;
      const y = cy - dim / 2;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, dim / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, x, y, dim, dim);
      ctx.restore();

      // Contorno dourado fino
      ctx.strokeStyle = COLOR_GOLD;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, dim / 2 + 1, 0, Math.PI * 2);
      ctx.stroke();

      resolve();
    };
    img.onerror = () => {
      ctx.fillStyle = COLOR_GOLD;
      ctx.font = `bold ${size * 0.4}px Georgia, serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("CF", cx, cy);
      ctx.strokeStyle = COLOR_GOLD;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.35, 0, Math.PI * 2);
      ctx.stroke();
      resolve();
    };
    img.src = `data:image/jpeg;base64,${LOGO_CF_BASE64}`;
  });
}

/** Uma ação registrada no histórico completo da mão (pré-flop → river),
 *  usada no card de histórico (modo "historico"). */
export interface ActionLogEntry {
  /** Quem agiu — "Você" para o herói, ou o nome do vilão. */
  who: string;
  /** Rótulo da ação com valor (ex.: "Raise 115", "Call 50", "Check", "All-in"). */
  action: string;
  /** Rua da ação (ex.: "Pré-Flop", "Flop", "Turn", "River"). */
  street: string;
  /** Se a ação foi do herói (destaca em dourado no card). */
  isHero: boolean;
  /** Se a ação foi o ótimo recomendado — só calculado para ações do herói. */
  correct?: boolean;
}

export interface HandShareData {
  /** Cartas do herói (2 cartas). */
  heroCards: Card[];
  /** Board final (0-5 cartas). */
  board: Card[];
  /** A ação que o herói tomou (ex.: "CALL", "RAISE 3bb", "FOLD", "ALL-IN"). */
  heroAction: string;
  /** A ação recomendada pelo coach. */
  coachAction: string;
  /** Nota da decisão: "boa", "ok", "imprecisa", "ruim". */
  rating: Rating;
  /** Tip do coach (frase explicativa — texto cru do feedback, pode ter aspas quebradas). */
  coachTip: string;
  /** Rua da decisão: "Preflop", "Flop", "Turn", "River". */
  street: string;
  /** Info do torneio (ex.: "Torneio $5 · Circuito Mensal · 9-max"). */
  tournamentInfo: string;
  /** Resultado do torneio, se aplicável (ex.: "8º lugar de 47"). */
  tournamentResult?: string;
  /** Contexto da ação (ex.: "Vilão aposta 1/3 pote · Stack: 25bb"). */
  context: string;
  /** POSIÇÃO do herói — SEMPRE visível no card (ex.: "UTG", "BTN", "CO"). */
  position: string;
  /** Stack em big blinds (ex.: "96bb"). */
  stackBB: string;
  /** Estágio do torneio (ex.: "Início", "Bolha"). Só visível no modo técnico. */
  stage?: string;
  /** Equity percentual (ex.: 0.42 = 42%). Só visível no modo técnico. */
  equity?: number;
  /** Pot odds (ex.: 0.33 = 33%). Só visível no modo técnico. */
  potOdds?: number;
  /** EV em big blinds (ex.: -16.8). Só visível no modo técnico. */
  evBB?: number;
  /** Linha do tempo da mão: uma entrada por RUA jogada (pré-flop→river), com a
   *  ação e se foi correta. Quando tem 2+, o card mostra a mão inteira em vez de
   *  só a última decisão. */
  decisions?: { street: string; action: string; correct: boolean }[];
  /** HISTÓRICO COMPLETO da mão: todas as ações de todos os jogadores, com valor
   *  apostado (ex.: "Vilão Raise 115 → Você Call"). Quando presente e com 3+ ações,
   *  o card do histórico completo usa estas linhas — street por street. */
  actionLog?: ActionLogEntry[];
  /** Buy-in em dólares, para o rodapé do card de histórico. */
  buyIn?: number;
  /** Pote FINAL de cada rua (em big blinds), ex.: { "Pré-Flop": 5.5, "Flop": 12 }.
   *  Quando presente, o card do histórico mostra "Pote: Xbb" ao final de cada rua. */
  potByStreet?: Record<string, number>;
  /** Pote total da mão (em big blinds) — usado quando não há rua específica. */
  finalPotBB?: number;
  /** CARD DO ERRO (modo "erro"): o coach destaca o tamanho de aposta certo da rua
   *  em que o herói errou (ex.: "O certo era ~9bb"). Quando presente, o card mostra
   *  o badge "O CERTO ERA..." e a caixa "APOSTA CERTA" em vez do RESULTADO comum. */
  mistakeFixBB?: number;
  /** SHOWDOWN: a mão revelada de cada jogador que mostrou as cartas.
   *  O herói entra com isHero: true. `won` indica se aquele jogador levou o pote. */
  showdown?: { name: string; cards: Card[]; isHero: boolean; won: boolean }[];
}

/**
 * Limpa o texto do coach: remove aspas internas quebradas e concatena frases.
 * Ex.: '...para a posição. O" "padrão era foldar.' → '...para a posição. O padrão era foldar.'
 */
export function cleanCoachText(raw: string): string {
  // Remove aspas soltas no meio (que vem de template literal quebrado)
  let cleaned = raw.replace(/" " /g, " ").replace(/"" /g, "").replace(/ ""/g, "");
  // Remove aspas de abertura/fechamento soltas no meio de frases
  cleaned = cleaned.replace(/"([^"]*)"([^"])/g, "$1$2");
  cleaned = cleaned.replace(/([^"])"$/g, "$1");
  cleaned = cleaned.replace(/^"([^"])/, "$1");
  return cleaned.trim();
}

/** Categoria da mão com artigo, minúscula, p/ frase natural: "um par", "uma trinca". */
function madeArticle(made: string): string {
  const m = made.toLowerCase();
  if (m.startsWith("dois")) return m; // "dois pares"
  if (m === "carta alta") return "só carta alta";
  if (m === "trinca" || m === "quadra" || m === "sequência") return "uma " + m;
  return "um " + m; // par, full house, flush, straight flush
}

/**
 * SIMPLES do card (opção A): conta a HISTÓRIA da mão em linguagem plana — o que
 * você tinha, o que o vilão tinha, se a jogada foi certa e a lição. Sem jargão,
 * sempre curto. Consciente do resultado (variância quando joga certo e perde).
 */
function buildCardStory(
  heroMade: string,
  villainMade: string | undefined,
  heroWon: boolean | undefined,
  correct: boolean,
  heroAction: string,
  coachAction: string,
  equity?: number,
  potOdds?: number,
): string {
  const hand = heroMade ? `você tinha ${madeArticle(heroMade)}` : "você jogou sua mão";
  const t = heroAction.toLowerCase();
  const past = /call|pag/.test(t) ? "pagou" : /rais|bet|apost|jam|all/.test(t) ? "apostou" : "jogou";
  const verb = /call|pag/.test(t) ? "pagar" : /rais|bet|apost|jam|all/.test(t) ? "apostar" : "jogar";
  const conta = equity !== undefined && potOdds !== undefined ? ` (${Math.round(equity * 100)}% × ${Math.round(potOdds * 100)}%)` : "";
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  if (villainMade && heroWon !== undefined) {
    if (heroWon) {
      return correct
        ? `${cap(hand)} e levou o pote — o vilão tinha ${madeArticle(villainMade)}. Jogada certa e resultado certo. É assim que a stack cresce.`
        : `${cap(hand)} e levou o pote do vilão (${madeArticle(villainMade)}). Deu certo, mas pela conta foi arriscado.`;
    }
    return correct
      ? `${cap(hand)} e ${past} pela conta certa${conta}. O vilão escondia ${madeArticle(villainMade)} — decisão boa, resultado ruim. No longo prazo, ${verb} assim dá lucro.`
      : `${cap(hand)} e o vilão tinha ${madeArticle(villainMade)}. Aqui dava pra largar e economizar fichas — o certo era ${coachAction.toLowerCase()}.`;
  }
  return correct
    ? `${cap(hand)} e jogou no ponto certo. Disciplina é isso: entrar bem e largar na hora.`
    : `${cap(hand)}, mas dava pra jogar melhor — o certo era ${coachAction.toLowerCase()}. Veja a conta na técnica.`;
}

// ── Card de Conquista ("Trophy Room" — compartilhar vitória/ITM) ──────────
export interface TrophyShareData {
  /** Torneio (ex.: "Circuito · Etapa 3 — Buy-in $109"). */
  tournamentInfo: string;
  /** Colocação (1 = campeão). */
  finishPlace: number;
  entrants: number;
  /** Prêmio recebido ($). */
  cash: number;
  inMoney: boolean;
}

export async function drawTrophyCard(data: TrophyShareData): Promise<Blob | null> {
  return drawTrophyCanvas(data);
}

async function drawTrophyCanvas(data: TrophyShareData): Promise<Blob | null> {
  const S = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);

  // Fundo: feltro escuro com gradiente radial (mesmo estilo do hand card)
  const bgGrad = ctx.createRadialGradient(S / 2, S * 0.4, S * 0.1, S / 2, S * 0.5, S * 0.8);
  bgGrad.addColorStop(0, COLOR_BG_FELT);
  bgGrad.addColorStop(1, COLOR_BG_DARK);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, S, S);

  // Textura de feltro sutil
  ctx.globalAlpha = 0.03;
  for (let i = 0; i < 200; i++) {
    const px = Math.random() * S;
    const py = Math.random() * S;
    ctx.fillStyle = Math.random() > 0.5 ? "#fff" : "#000";
    ctx.fillRect(px, py, 2, 2);
  }
  ctx.globalAlpha = 1;

  // Vinheta
  const vig2 = ctx.createRadialGradient(S / 2, S / 2, S * 0.34, S / 2, S / 2, S * 0.72);
  vig2.addColorStop(0, "rgba(0,0,0,0)");
  vig2.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = vig2;
  ctx.fillRect(0, 0, S, S);

  // Linha dourada superior
  ctx.strokeStyle = "rgba(212,175,55,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, 20);
  ctx.lineTo(S - 60, 20);
  ctx.stroke();

  // Logo oficial no topo
  await drawLogoImage(ctx, S / 2, 85, 88);
  ctx.fillStyle = COLOR_GOLD;
  ctx.font = "bold 48px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CALL OU FOLD", S / 2, 178);

  // Torneio
  ctx.fillStyle = COLOR_CREAM_DIM;
  ctx.font = "600 26px Georgia, serif";
  ctx.fillText(data.tournamentInfo, S / 2, 222);

  // Separador dourado
  ctx.strokeStyle = "rgba(212,175,55,0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(120, 256);
  ctx.lineTo(S - 120, 256);
  ctx.stroke();

  // Troféu (emoji em dourado) + colocação
  ctx.font = "130px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🏆", S / 2, 380);

    // "1º DE 100 INSCRITOS"
  ctx.fillStyle = COLOR_GOLD_BRIGHT;
  ctx.font = "600 34px Georgia, serif";
  const placeLabel = `${data.finishPlace}º DE ${data.entrants} INSCRITOS`;
  ctx.fillText(placeLabel, S / 2, 490);

  // CAMPEÃO! (ou "NO DINHEIRO")
  const isChamp = data.finishPlace === 1 && data.inMoney;
  const headline = isChamp ? "CAMPEÃO!" : "NO DINHEIRO!";
  const headlineSize = isChamp ? 118 : 92;
  ctx.save();
  ctx.shadowColor = "rgba(230,196,84,0.55)";
  ctx.shadowBlur = 48;
  ctx.fillStyle = COLOR_GOLD_BRIGHT;
  ctx.font = `bold ${headlineSize}px Georgia, serif`;
  ctx.fillText(headline, S / 2, 610);
  ctx.restore();

  // Prêmio
  if (data.inMoney && data.cash > 0) {
    ctx.fillStyle = COLOR_CREAM;
    ctx.font = "bold 44px Georgia, serif";
    ctx.fillText(`Prêmio: $${Math.round(data.cash).toLocaleString("pt-BR")} 💰`, S / 2, 720);
  }

  // Rodapé
  ctx.strokeStyle = "rgba(212,175,55,0.4)";
  ctx.beginPath();
  ctx.moveTo(120, 810);
  ctx.lineTo(S - 120, 810);
  ctx.stroke();

  ctx.fillStyle = COLOR_CREAM_DIM;
  ctx.font = "600 30px Georgia, serif";
  ctx.fillText("Treina de graça · calloufold.com.br", S / 2, 870);
  ctx.font = "500 24px Georgia, serif";
  ctx.fillStyle = "rgba(236,231,213,0.5)";
  ctx.fillText("App de estudo. Sem apostas nem dinheiro real.", S / 2, 920);

  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/png");
  });
}

/**
 * Gera o Hand Share Card como PNG (1080×1080) e devolve um Blob.
 * @param mode "simples" = sem jargão técnico; "tecnico" = com equity/potOdds/evBB
 */
export async function drawHandShareCard(
  data: HandShareData,
  mode: ShareCardMode = "simples",
  cardType: ShareCardType = "decisao",
): Promise<Blob | null> {
  if (cardType === "historico") return drawHistoryCard(data);
  if (cardType === "narrativa") return drawNarrativeCard(data);
  // Card do erro: disparado pelo modo explícito OU quando há um sizing-correção
  // (mistakeFixBB) e a nota NÃO é boa/ok ("ruim" ou "imprecisa").
  const notGood = data.rating !== "boa" && data.rating !== "ok";
  return drawDecisionCard(data, mode, cardType === "erro" || (!!data.mistakeFixBB && notGood));
}

/** Builder reutilizável de HandShareData a partir de uma mão (HandHistory) e o
 *  feedback do analyzer — usado pelo painel HandActions e também pelo replayer
 *  de importação (que pode marcar a rua do erro com mistakeFixBB: o sizing que
 *  o coach mandaria, ex.: "~9bb" no 3-bet). */
export function shareDataFromHand(
  hand: HandHistory,
  feedback: FeedbackItem[],
  opts?: { mistakeFixBB?: number },
): HandShareData | null {
  if (feedback.length === 0) return null;
  const lastItem = feedback[feedback.length - 1];
  const heroCards = hand.holeCards[hand.heroSeat] ?? [];

  const contextParts: string[] = [];
  if (lastItem.equity !== undefined) contextParts.push(`Equity: ${Math.round(lastItem.equity * 100)}%`);
  if (lastItem.potOdds !== undefined) contextParts.push(`Preço: ${Math.round(lastItem.potOdds * 100)}%`);
  if (lastItem.evBB !== undefined) contextParts.push(`EV call: ${lastItem.evBB.toFixed(1)}bb`);
  const effectiveBB = hand.startingStacks?.[hand.heroSeat]
    ? Math.round(hand.startingStacks[hand.heroSeat] / hand.bigBlind)
    : undefined;
  if (effectiveBB !== undefined) contextParts.push(`Stack: ${effectiveBB}bb`);

  // Chave de rua canônica: os eventos usam "flop"/"turn" e o feedback usa
  // "Flop"/"Pré-flop" — sem normalizar, o rótulo com valor ("Aposta 3.5bb") não
  // casava e o card mostrava só "Aposta" (e o % lia o stack). Aqui alinhamos.
  const normStreet = (s: string): string => {
    const t = (s || "").toLowerCase();
    if (t.startsWith("pr")) return "preflop";
    if (t.startsWith("fl")) return "flop";
    if (t.startsWith("tu")) return "turn";
    if (t.startsWith("ri")) return "river";
    return t;
  };
  const byStreet = new Map<string, (typeof feedback)[0]>();
  for (const it of feedback) byStreet.set(it.street, it);
  const heroStreetLabel = new Map<string, string>();
  for (const ev of hand.events) if (ev.isHero) heroStreetLabel.set(normStreet(ev.street), ev.actionLabel);
  const decisions = [...byStreet.values()].map((it) => ({
    street: it.street,
    action: heroStreetLabel.get(normStreet(it.street)) ?? it.heroAction,
    correct: it.rating === "boa" || it.rating === "ok",
  }));
  // Ação do herói na ÚLTIMA rua COM o valor (ex.: "Aposta 20bb") — o card usa
  // isso pra "SUA AÇÃO" e pro % da aposta; sem o valor, o % pegava o stack.
  const lastHeroLabel = heroStreetLabel.get(normStreet(lastItem.street));

  const streetCorrect = new Map<string, boolean>();
  for (const it of feedback) streetCorrect.set(it.street, it.rating === "boa" || it.rating === "ok");
  const actionLog: ActionLogEntry[] = hand.events.map((ev: ReplayEvent) => ({
    who: ev.isHero ? "Você" : (ev.name ?? "Vilão"),
    action: ev.actionLabel,
    street: ev.street,
    isHero: ev.isHero,
    correct: ev.isHero ? streetCorrect.get(ev.street) : undefined,
  }));

  // Pote por rua: soma das ações de bet/raise da rua (aproximação do replay).
  const potByStreet: Record<string, number> = {};
  for (const ev of hand.events) {
    if (ev.actionType !== "bet" && ev.actionType !== "raise") continue;
    const v = Math.round((ev.pot / Math.max(1, hand.bigBlind)) * 10) / 10;
    potByStreet[ev.street] = Math.round(((potByStreet[ev.street] ?? 0) + v) * 10) / 10;
  }
  let finalPotBB: number | undefined;
  if (hand.result) {
    const total = hand.result.pots.reduce((s, p) => s + p.amount, 0);
    if (total > 0) finalPotBB = Math.round((total / hand.bigBlind) * 10) / 10;
  }

  let showdown: HandShareData["showdown"];
  if (hand.result?.showdown === true && hand.result.winningsBySeat) {
    const shown = hand.result.handValueBySeat;
    const reachedShowdown = (seat: number) =>
      !shown || Object.keys(shown).length === 0 || shown[seat] !== undefined;
    showdown = Object.entries(hand.holeCards)
      .filter(([seatStr]) => reachedShowdown(Number(seatStr)))
      .map(([seatStr, cards]) => {
        const seat = Number(seatStr);
        const won = ((hand.result?.winningsBySeat as Record<string, number> | undefined)?.[seatStr] ?? 0) > 0;
        return {
          name: hand.names?.[seat] ?? (seat === hand.heroSeat ? "Você" : "Vilão"),
          cards,
          isHero: seat === hand.heroSeat,
          won,
        };
      })
      .filter((p) => p.cards.length > 0);
  }

  return {
    heroCards,
    board: hand.finalBoard,
    heroAction: (lastHeroLabel ?? lastItem.heroAction).toUpperCase(),
    coachAction: lastItem.advice.toUpperCase(),
    rating: lastItem.rating as HandShareData["rating"],
    coachTip: lastItem.text,
    street: lastItem.street,
    tournamentInfo: "Call ou Fold · Simulador grátis",
    context: contextParts.length > 0 ? contextParts.join(" · ") : "",
    position: hand.heroPosition ?? "MP",
    stackBB: effectiveBB !== undefined ? `${effectiveBB}bb` : "100bb",
    stage: hand.tournamentStage,
    equity: lastItem.equity,
    potOdds: lastItem.potOdds,
    evBB: lastItem.evBB,
    decisions,
    actionLog,
    potByStreet,
    finalPotBB,
    showdown,
    mistakeFixBB: opts?.mistakeFixBB,
  };
}

// ── Card da DECISÃO — "SHOWDOWN" premium preto/ouro (1080×1350). Usa os dados
// REAIS da mão: herói × vilão (se houve showdown), board, timeline, pote+aposta,
// equity, resultado e a explicação Simples | Técnica. Robusto a dados faltando
// (sem showdown → só a mão do herói; sem board → pula; sem equity → oculta).
async function drawDecisionCard(
  data: HandShareData,
  _mode: ShareCardMode,
  isMistake = false,
): Promise<Blob | null> {
  const W = 1080, H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);

  // paleta
  const GLINE = "#7a5f1e", GSOFT = "#c9a227", GOLD = "#e6c454";
  const CREAM = "#efe9d8", DIM = "#9a927e", GREEN = "#57b06a";
  const goldGrad = (y: number, h: number) => {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, "#f9edb0"); g.addColorStop(0.5, "#e6c454"); g.addColorStop(1, "#c49a2a");
    return g;
  };
  const panel = (x: number, y: number, w: number, h: number, r: number, fill: string, border: string, bw = 2) => {
    roundRect(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = bw; ctx.strokeStyle = border; roundRect(ctx, x, y, w, h, r); ctx.stroke();
  };
  const spaced = (text: string, cx: number, y: number, ls: number, align: "center" | "left" = "center") => {
    const ws = [...text].map((c) => ctx.measureText(c).width);
    const total = ws.reduce((a, b) => a + b, 0) + ls * Math.max(0, text.length - 1);
    let x = align === "center" ? cx - total / 2 : cx;
    ctx.textAlign = "left";
    for (let i = 0; i < text.length; i++) { ctx.fillText(text[i], x, y); x += ws[i] + ls; }
    return total;
  };
  const wrap = (text: string, maxW: number): string[] => {
    const words = text.split(/\s+/); const lines: string[] = []; let cur = "";
    for (const w of words) {
      const t = cur ? cur + " " + w : w;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; }
      else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  };
  const madeHand = (cards: Card[]): string => {
    if (data.board.length < 3 || cards.length < 2) return "";
    try { return CATEGORY_NAMES_PT[categoryOf(evaluate([...cards, ...data.board]))] ?? ""; } catch { return ""; }
  };

  // ── fundo ──
  ctx.fillStyle = "#0b0906"; ctx.fillRect(0, 0, W, H);
  const bg = ctx.createRadialGradient(W / 2, 0, 80, W / 2, 0, H * 1.05);
  bg.addColorStop(0, "#241c10"); bg.addColorStop(0.42, "#14100a"); bg.addColorStop(1, "#0b0906");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // moldura
  ctx.lineWidth = 2; ctx.strokeStyle = GLINE; roundRect(ctx, 24, 24, W - 48, H - 48, 22); ctx.stroke();

  ctx.textBaseline = "middle";

  // ── header: logo + wordmark + showdown ──
  await drawLogoImage(ctx, W / 2, 92, 96);
  ctx.textAlign = "left";
  ctx.font = "900 74px Georgia, serif";
  const seg = [{ t: "CALL ", f: "900 74px Georgia, serif" }, { t: "ou", f: "italic 700 48px Georgia, serif" }, { t: " FOLD", f: "900 74px Georgia, serif" }];
  let tot = 0; for (const s of seg) { ctx.font = s.f; tot += ctx.measureText(s.t).width; }
  let wx = W / 2 - tot / 2; const wy = 196;
  ctx.fillStyle = goldGrad(wy - 40, 80);
  for (const s of seg) { ctx.font = s.f; ctx.fillText(s.t, wx, wy); wx += ctx.measureText(s.t).width; }
  ctx.font = "800 23px Georgia, serif"; ctx.fillStyle = GSOFT;
  const subtitle = data.showdown?.some((p) => !p.isHero && p.cards.length >= 2) ? "SHOWDOWN" : "A JOGADA";
  // Card do erro: o "A JOGADA" é SUBSTITUÍDO pelo pill vermelho
  // "O ERRO QUE CUSTOU FICHAS" na mesma faixa (nunca empilhar os dois).
  if (isMistake) {
    const badgeTxt = "O ERRO QUE CUSTOU FICHAS";
    ctx.font = "800 21px Georgia, serif";
    const bwM = ctx.measureText(badgeTxt).width + 36;
    const bx0 = W / 2 - bwM / 2, byM = 250 - 15;
    roundRect(ctx, bx0, byM, bwM, 30, 15);
    ctx.fillStyle = "rgba(224,123,107,0.14)"; ctx.fill();
    ctx.strokeStyle = "#e07b6b"; ctx.lineWidth = 1.5; roundRect(ctx, bx0, byM, bwM, 30, 15); ctx.stroke();
    ctx.fillStyle = "#e89686"; ctx.textAlign = "center"; ctx.fillText(badgeTxt, W / 2, byM + 16);
  } else {
    const swW = spaced(subtitle, W / 2, 250, 11);
    ctx.strokeStyle = GSOFT; ctx.lineWidth = 2;
    const lgap = swW / 2 + 26;
    ctx.beginPath(); ctx.moveTo(W / 2 - lgap - 56, 250); ctx.lineTo(W / 2 - lgap, 250); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W / 2 + lgap, 250); ctx.lineTo(W / 2 + lgap + 56, 250); ctx.stroke();
  }

  // ── matchup: herói × vilão (se showdown) ──
  // Vilão a mostrar: prioriza QUEM VENCEU o pote (pra "você perdeu" mostrar quem
  // te ganhou), senão o primeiro vilão do showdown.
  const villain =
    data.showdown?.find((p) => !p.isHero && p.won && p.cards.length >= 2) ??
    data.showdown?.find((p) => !p.isHero && p.cards.length >= 2);
  const heroWon = data.showdown?.find((p) => p.isHero)?.won;
  // Escopo da decisão: usado pela caixa RESULTADO e pela história SIMPLES.
  const correct = data.rating === "boa" || data.rating === "ok";
  const made = madeHand(data.heroCards);
  const drawPlayer = (px: number, pw: number, tag: string, cards: Card[], made: string) => {
    panel(px, 286, pw, 206, 16, "rgba(230,196,84,0.05)", GLINE);
    ctx.fillStyle = GOLD; ctx.font = "800 22px Georgia, serif"; spaced(tag, px + pw / 2, 314, 5);
    const cw = 90, ch = 116, cg = 12, cx0 = px + pw / 2 - (cw * 2 + cg) / 2;
    if (cards[0]) drawCardOnCanvas(ctx, cards[0], cx0, 330, cw, ch);
    if (cards[1]) drawCardOnCanvas(ctx, cards[1], cx0 + cw + cg, 330, cw, ch);
    if (made) { ctx.fillStyle = DIM; ctx.font = "700 21px Georgia, serif"; ctx.textAlign = "center"; ctx.fillText(made, px + pw / 2, 472); }
  };
  if (villain) {
    const pw = 400;
    drawPlayer(56, pw, "HERÓI", data.heroCards, madeHand(data.heroCards));
    drawPlayer(W - 56 - pw, pw, "VILÃO", villain.cards, madeHand(villain.cards));
    ctx.fillStyle = goldGrad(360, 70); ctx.font = "900 60px Georgia, serif"; ctx.textAlign = "center"; ctx.fillText("VS", W / 2, 388);
  } else {
    const pw = 470;
    drawPlayer((W - pw) / 2, pw, "SUA MÃO", data.heroCards, madeHand(data.heroCards));
  }

  // ── board ──
  let y = 512;
  if (data.board.length > 0) {
    ctx.fillStyle = GSOFT; ctx.font = "800 21px Georgia, serif"; spaced("BOARD", W / 2, y, 8);
    const cw = 104, ch = 146, cg = 12;
    const totalW = data.board.length * cw + (data.board.length - 1) * cg;
    let bx = (W - totalW) / 2; const by = y + 22;
    for (const c of data.board) { drawCardOnCanvas(ctx, c, bx, by, cw, ch); bx += cw + cg; }
    y = by + ch + 26;
  } else { y = 540; }

  // ── timeline: posição + ruas ──
  // POSIÇÃO + TODAS as ruas jogadas (até 4: pré/flop/turn/river). Antes cortava
  // em 3 (slice(0,3)) e o RIVER sumia — bug pego pelo Allan. Nº de caixas é
  // dinâmico (4 ou 5) e a fonte encolhe pra caber o rótulo ("Aposta 3.3bb").
  const steps: { k: string; v: string }[] = [{ k: "POSIÇÃO", v: `${data.position} · ${data.stackBB}` }];
  for (const d of (data.decisions ?? []).slice(0, 4)) steps.push({ k: d.street.toUpperCase(), v: d.action });
  while (steps.length < 4) steps.push({ k: "", v: "" });
  const sN = steps.length, sGap = 10, sW = (W - 112 - sGap * (sN - 1)) / sN, sH = 66;
  const fitFont = (text: string, maxW: number, start: number): number => {
    let px = start;
    ctx.font = `800 ${px}px Georgia, serif`;
    while (ctx.measureText(text).width > maxW && px > 13) {
      px -= 1;
      ctx.font = `800 ${px}px Georgia, serif`;
    }
    return px;
  };
  for (let i = 0; i < sN; i++) {
    const sx = 56 + i * (sW + sGap);
    if (!steps[i].k) continue;
    panel(sx, y, sW, sH, 12, "rgba(230,196,84,0.04)", GLINE, 1.5);
    ctx.fillStyle = GSOFT; ctx.textAlign = "center";
    ctx.font = `800 ${fitFont(steps[i].k, sW - 14, 17)}px Georgia, serif`; ctx.fillText(steps[i].k, sx + sW / 2, y + 22);
    ctx.fillStyle = CREAM;
    ctx.font = `800 ${fitFont(steps[i].v, sW - 14, 23)}px Georgia, serif`; ctx.fillText(steps[i].v, sx + sW / 2, y + 46);
  }
  y += sH + 12;

  // ── pote + sua aposta ──
  const potVals = data.potByStreet ? Object.values(data.potByStreet) : [];
  const poteBB = data.finalPotBB ?? (potVals.length ? potVals[potVals.length - 1] : undefined);
  const betM = /([\d.,]+)\s*bb/i.exec(data.heroAction) ?? /([\d.,]+)\s*bb/i.exec(data.context);
  const betBB = betM ? parseFloat(betM[1].replace(",", ".")) : undefined;
  // % da aposta = aposta ÷ pote ANTES da aposta (é assim que se mede tamanho de
  // aposta). O pote final (poteBB) já inclui a sua aposta + o call do vilão — por
  // isso dava 30% em vez de 75% (bug pego pelo Allan). O pote-antes é o registro
  // da rua ANTERIOR no potByStreet; se faltar, deduz do final (−aposta −call).
  // Preferimos deduzir do pote FINAL (aposta + call do vilão): pote-antes =
  // final − 2×aposta. É robusto pros dois caminhos (jogo e import), onde o
  // potByStreet tem semânticas diferentes. Fallbacks: penúltimo registro; pote.
  const potIntoBet =
    betBB && poteBB && poteBB - 2 * betBB > 0.5 ? poteBB - 2 * betBB
    : potVals.length >= 2 ? potVals[potVals.length - 2]
    : poteBB;
  const pctPot = betBB && potIntoBet ? Math.round((betBB / potIntoBet) * 100) : undefined;
  const bW = (W - 112 - 10) / 2, bH = 62;
  panel(56, y, bW * 0.82, bH, 13, "rgba(230,196,84,0.05)", GLINE);
  ctx.fillStyle = GSOFT; ctx.font = "800 19px Georgia, serif"; ctx.textAlign = "left"; ctx.fillText("POTE", 78, y + bH / 2);
  ctx.fillStyle = CREAM; ctx.font = "900 30px Georgia, serif"; ctx.textAlign = "right"; ctx.fillText(poteBB !== undefined ? `${Math.round(poteBB * 10) / 10} bb` : "—", 56 + bW * 0.82 - 22, y + bH / 2);
  const hx = 56 + bW * 0.82 + 10, hW = W - 56 - hx;
  panel(hx, y, hW, bH, 13, "rgba(230,196,84,0.12)", GSOFT);
  ctx.fillStyle = GSOFT; ctx.font = "800 19px Georgia, serif"; ctx.textAlign = "left"; ctx.fillText("SUA AÇÃO", hx + 22, y + bH / 2);
  ctx.textAlign = "right";
  ctx.fillStyle = GOLD; ctx.font = "900 30px Georgia, serif";
  const actTxt = betBB !== undefined ? `${betBB} bb${pctPot ? ` · ${pctPot}%` : ""}` : (data.heroAction || "—");
  ctx.fillText(actTxt, W - 56 - 22, y + bH / 2);
  y += bH + 12;

  // ── equity + resultado ──
  const rW1 = (W - 112) * 0.42, rW2 = (W - 112) - rW1 - 12, rH = 96;
  panel(56, y, rW1, rH, 14, "rgba(230,196,84,0.07)", GLINE);
  ctx.fillStyle = GSOFT; ctx.font = "800 19px Georgia, serif"; ctx.textAlign = "center"; ctx.fillText("EQUITY", 56 + rW1 / 2, y + 26);
  if (data.equity !== undefined) { ctx.fillStyle = goldGrad(y + 34, 52); ctx.font = "900 56px Georgia, serif"; ctx.fillText(`${Math.round(data.equity * 100)}%`, 56 + rW1 / 2, y + 64); }
  else { ctx.fillStyle = DIM; ctx.font = "900 40px Georgia, serif"; ctx.fillText("—", 56 + rW1 / 2, y + 62); }
  const r2x = 56 + rW1 + 12;
  panel(r2x, y, rW2, rH, 14, "rgba(230,196,84,0.07)", GLINE);
  if (isMistake && data.mistakeFixBB) {
    // Caixa "APOSTA CERTA": o tamanho que o coach mandaria nesta rua
    ctx.fillStyle = GSOFT; ctx.font = "800 19px Georgia, serif"; ctx.textAlign = "left"; ctx.fillText("APOSTA CERTA", r2x + 20, y + 26);
    ctx.fillStyle = goldGrad(y + 34, 52); ctx.font = "900 56px Georgia, serif"; ctx.textAlign = "left"; ctx.fillText(`~${Math.round(data.mistakeFixBB)}bb`, r2x + 20, y + 64);
    ctx.fillStyle = DIM; ctx.font = "700 17px Georgia, serif"; ctx.fillText("o tamanho que nega equity", r2x + 20, y + 82);
  } else {
    ctx.fillStyle = GSOFT; ctx.font = "800 19px Georgia, serif"; ctx.textAlign = "left"; ctx.fillText("RESULTADO", r2x + 20, y + 26);
    const resTxt = heroWon === undefined ? (correct ? "Jogada certa" : "Dá pra melhorar") : (heroWon ? "Você venceu" : "Você perdeu");
    ctx.fillStyle = (heroWon === undefined ? correct : heroWon) ? GREEN : "#e07b6b";
    ctx.font = "900 30px Georgia, serif"; ctx.fillText(resTxt, r2x + 20, y + 54);
    if (made) { ctx.fillStyle = DIM; ctx.font = "700 20px Georgia, serif"; ctx.fillText(`Sua mão: ${made}`, r2x + 20, y + 78); }
  }
  y += rH + 12;

  // ── simples | técnica ──
  const eH = H - 52 - y - 8;
  panel(56, y, W - 112, eH, 16, "rgba(230,196,84,0.08)", GSOFT);
  const colW = (W - 112) / 2;
  ctx.strokeStyle = GLINE; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(56 + colW, y + 14); ctx.lineTo(56 + colW, y + eH - 14); ctx.stroke();
  const bodyTop = y + 68;
  const bodyBottom = y + eH - 22; // margem inferior da caixa
  const drawCol = (cx: number, title: string, body: string) => {
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(cx + 22, y + 30, 6, 0, Math.PI * 2); ctx.fill();
    ctx.font = "900 22px Georgia, serif"; ctx.textAlign = "left"; ctx.fillStyle = GOLD; ctx.fillText(title, cx + 38, y + 31);
    // Auto-ajuste: reduz a fonte até TODO o texto caber na altura da coluna,
    // pra nunca cortar a história do SIMPLES (que é mais longa que a técnica).
    const avail = bodyBottom - bodyTop;
    let fs = 24;
    let step = 33;
    let lines = (() => { ctx.font = `600 ${fs}px Georgia, serif`; return wrap(body, colW - 44); })();
    while (lines.length * step > avail && fs > 18) {
      fs -= 1;
      step = Math.round(fs * 1.34);
      ctx.font = `600 ${fs}px Georgia, serif`;
      lines = wrap(body, colW - 44);
    }
    ctx.fillStyle = CREAM; ctx.font = `600 ${fs}px Georgia, serif`;
    let ly = bodyTop;
    for (const ln of lines) { ctx.fillText(ln, cx + 22, ly); ly += step; }
  };
  const tecParts: string[] = [];
  if (data.equity !== undefined) tecParts.push(`Equity ${Math.round(data.equity * 100)}%`);
  if (data.potOdds !== undefined) tecParts.push(`preço ${Math.round(data.potOdds * 100)}%`);
  if (data.evBB !== undefined) tecParts.push(`EV ${data.evBB > 0 ? "+" : ""}${Math.round(data.evBB * 10) / 10}bb`);
  const tecnica = tecParts.length ? `${tecParts.join(" · ")}. Coach: ${data.coachAction}.` : `Coach recomenda: ${data.coachAction}.`;
  const villainMade = villain ? madeHand(villain.cards) : undefined;
  const simples = buildCardStory(made, villainMade, heroWon, correct, data.heroAction, data.coachAction, data.equity, data.potOdds);
  drawCol(56, "SIMPLES", simples);
  drawCol(56 + colW, "TÉCNICA", tecnica);

  // ── rodapé ──
  ctx.fillStyle = GSOFT; ctx.font = "700 20px Georgia, serif"; ctx.textAlign = "center";
  spaced("calloufold.com.br  ·  SEM DINHEIRO REAL  ·  SÓ ESTUDO", W / 2, H - 40, 2);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

// ── Card 2 (carrossel): A MÃO, CONTADA — a CRÔNICA escrita da mão, rua por rua,
// com TODAS as ações reais (do actionLog) + a leitura no estilo Yuri Martins
// (o que sua mão virou + o range do vilão apertando). Pedido do Allan (18/08):
// "quero ver a história ESCRITA, todas as jogadas — pré-flop, flop, turn, river".
async function drawNarrativeCard(data: HandShareData): Promise<Blob | null> {
  const W = 1080, H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);

  const GLINE = "#7a5f1e", GSOFT = "#c9a227", GOLD = "#e6c454";
  const CREAM = "#efe9d8", DIM = "#a89a72", GREEN = "#3fa66a", RED = "#e07b6b";
  const goldGrad = (y: number, h: number) => {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, "#f9edb0"); g.addColorStop(0.5, "#e6c454"); g.addColorStop(1, "#c49a2a");
    return g;
  };
  const spaced = (text: string, cx: number, y: number, ls: number) => {
    const ws = [...text].map((c) => ctx.measureText(c).width);
    const total = ws.reduce((a, b) => a + b, 0) + ls * Math.max(0, text.length - 1);
    let x = cx - total / 2; ctx.textAlign = "left";
    for (let i = 0; i < text.length; i++) { ctx.fillText(text[i], x, y); x += ws[i] + ls; }
    return total;
  };
  const wrap = (text: string, maxW: number): string[] => {
    const words = text.split(/\s+/); const lines: string[] = []; let cur = "";
    for (const w of words) {
      const t = cur ? cur + " " + w : w;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; }
      else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  };

  // fundo + moldura
  ctx.fillStyle = "#0b0906"; ctx.fillRect(0, 0, W, H);
  const bg = ctx.createRadialGradient(W / 2, 0, 80, W / 2, 0, H * 1.05);
  bg.addColorStop(0, "#241c10"); bg.addColorStop(0.42, "#14100a"); bg.addColorStop(1, "#0b0906");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.lineWidth = 2; ctx.strokeStyle = GLINE; roundRect(ctx, 24, 24, W - 48, H - 48, 22); ctx.stroke();
  ctx.textBaseline = "middle";

  // ── header ──
  await drawLogoImage(ctx, W / 2, 84, 82);
  ctx.textAlign = "left";
  const seg = [{ t: "CALL ", f: "900 60px Georgia, serif" }, { t: "ou", f: "italic 700 40px Georgia, serif" }, { t: " FOLD", f: "900 60px Georgia, serif" }];
  let tw = 0; for (const s of seg) { ctx.font = s.f; tw += ctx.measureText(s.t).width; }
  let wx = W / 2 - tw / 2; const wy = 168;
  ctx.fillStyle = goldGrad(wy - 34, 68);
  for (const s of seg) { ctx.font = s.f; ctx.fillText(s.t, wx, wy); wx += ctx.measureText(s.t).width; }
  ctx.font = "800 21px Georgia, serif"; ctx.fillStyle = GSOFT;
  spaced("A MÃO, CONTADA", W / 2, 210, 7);

  // ── sua mão (contexto) ──
  const made = (() => { try { return data.board.length >= 3 ? CATEGORY_NAMES_PT[categoryOf(evaluate([...data.heroCards, ...data.board]))] : ""; } catch { return ""; } })();
  const handStr = data.heroCards.map((c) => RANKS[rankOf(c) - 2] + ["♣", "♦", "♥", "♠"][suitOf(c)]).join(" ");
  ctx.font = "700 23px Georgia, serif"; ctx.textAlign = "center"; ctx.fillStyle = DIM;
  ctx.fillText(`${data.position} · ${data.stackBB} · sua mão ${handStr}${made ? ` (${made})` : ""}`, W / 2, 248);

  // ── crônica: uma coluna vertical, rua por rua, com ledger + leitura ──
  const story = buildHandStory(data);
  const villain =
    data.showdown?.find((p) => !p.isHero && p.won && p.cards.length >= 2) ??
    data.showdown?.find((p) => !p.isHero && p.cards.length >= 2);
  const heroWon = data.showdown?.find((p) => p.isHero)?.won;
  const correct = data.rating === "boa" || data.rating === "ok";
  const villainMade = villain ? (() => { try { return CATEGORY_NAMES_PT[categoryOf(evaluate([...villain.cards, ...data.board]))]; } catch { return ""; } })() : "";
  const lx = 70, rx = W - 70, colW = rx - lx;

  // Bloco de desfecho (showdown + lição) — desenhado por último, altura reservada.
  const outcomeTitle = heroWon === undefined ? (correct ? "Jogada certa" : "Dá pra melhorar")
    : heroWon ? "Você venceu" : "Você perdeu";
  const lesson = buildCardStory(made, villainMade || undefined, heroWon, correct, data.heroAction, data.coachAction, data.equity, data.potOdds);

  // ── AUTO-AJUSTE: mede tudo, escolhe a fonte que faz caber entre o topo e o
  // bloco de desfecho, pra a crônica NUNCA cortar (mãos longas cabem menores). ──
  const bodyTop = 286;
  const outcomeReserve = 210; // espaço do bloco de desfecho no rodapé
  const bodyBottom = H - 70 - outcomeReserve;
  const avail = bodyBottom - bodyTop;

  type Blk = { label: string; ledger: string[]; read: string[] };
  const layout = (fBody: number, lh: number): { blocks: Blk[]; total: number } => {
    const blocks: Blk[] = [];
    let total = 0;
    for (const s of story) {
      ctx.font = `800 ${fBody}px Georgia, serif`;
      const ledger = wrap(s.ledger, colW - 4);
      ctx.font = `italic ${fBody}px Georgia, serif`;
      const read = wrap(s.read, colW - 4);
      blocks.push({ label: s.label, ledger, read });
      total += lh + 8 + ledger.length * (fBody + 8) + 4 + read.length * (fBody + 7) + 22;
    }
    return { blocks, total };
  };
  let fLabel = 27, fBody = 23, lh = 34;
  let laid = layout(fBody, lh);
  while (laid.total > avail && fBody > 16) {
    fBody -= 1; fLabel = Math.max(20, fBody + 4); lh = fLabel + 6;
    laid = layout(fBody, lh);
  }

  // ── desenha a crônica ──
  let y = bodyTop;
  for (const b of laid.blocks) {
    // rótulo da rua (com cartas) + fio dourado
    ctx.textAlign = "left"; ctx.font = `900 ${fLabel}px Georgia, serif`; ctx.fillStyle = GOLD;
    ctx.fillText(b.label, lx, y + fLabel / 2);
    y += lh;
    // ledger (ações reais)
    ctx.font = `800 ${fBody}px Georgia, serif`; ctx.fillStyle = CREAM;
    for (const ln of b.ledger) { ctx.fillText(ln, lx, y + fBody / 2); y += fBody + 8; }
    y += 2;
    // leitura (estilo Yuri) em itálico
    ctx.font = `italic ${fBody}px Georgia, serif`; ctx.fillStyle = GSOFT;
    for (const ln of b.read) { ctx.fillText(ln, lx, y + fBody / 2); y += fBody + 7; }
    y += 12;
    // fio separador fino
    ctx.strokeStyle = "rgba(122,95,30,0.5)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(rx, y); ctx.stroke();
    y += 10;
  }

  // ── bloco de desfecho: SHOWDOWN + lição ──
  const oy = H - 70 - outcomeReserve + 16;
  ctx.fillStyle = "rgba(230,196,84,0.06)"; ctx.strokeStyle = GSOFT; ctx.lineWidth = 1.5;
  roundRect(ctx, lx, oy, colW, outcomeReserve - 26, 14); ctx.fill(); ctx.stroke();
  // título do desfecho
  ctx.textAlign = "left"; ctx.font = "900 30px Georgia, serif";
  ctx.fillStyle = (heroWon === undefined ? correct : heroWon) ? GREEN : RED;
  const vTxt = villain && villainMade ? `  ·  vilão: ${villainMade}` : "";
  ctx.fillText(`${outcomeTitle}${vTxt}`, lx + 24, oy + 34);
  // lição
  ctx.font = "600 23px Georgia, serif"; ctx.fillStyle = CREAM;
  const lessonLines = wrap(lesson, colW - 48).slice(0, 4);
  let ly = oy + 72;
  for (const ln of lessonLines) { ctx.fillText(ln, lx + 24, ly); ly += 31; }

  // ── rodapé ──
  ctx.fillStyle = GSOFT; ctx.font = "700 20px Georgia, serif"; ctx.textAlign = "center";
  spaced("calloufold.com.br  ·  SEM DINHEIRO REAL  ·  SÓ ESTUDO", W / 2, H - 40, 2);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

async function drawHistoryCard(data: HandShareData): Promise<Blob | null> {
  const S = 1080;
  const log = data.actionLog ?? [];
  if (log.length === 0) return null;

  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // ── Fundo (mesmo feltro do card da decisão) ──
  const bgGrad = ctx.createRadialGradient(S / 2, S * 0.4, S * 0.1, S / 2, S * 0.5, S * 0.8);
  bgGrad.addColorStop(0, COLOR_BG_FELT);
  bgGrad.addColorStop(1, COLOR_BG_DARK);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, S, S);

  ctx.globalAlpha = 0.03;
  for (let i = 0; i < 200; i++) {
    const px = Math.random() * S;
    const py = Math.random() * S;
    ctx.fillStyle = Math.random() > 0.5 ? "#fff" : "#000";
    ctx.fillRect(px, py, 2, 2);
  }
  ctx.globalAlpha = 1;

  const vig = ctx.createRadialGradient(S / 2, S / 2, S * 0.34, S / 2, S / 2, S * 0.72);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, S, S);

  // ── Linha dourada superior ──
  ctx.strokeStyle = "rgba(212,175,55,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, 20);
  ctx.lineTo(S - 60, 20);
  ctx.stroke();

  // ── TOPO ──
  await drawLogoImage(ctx, S / 2, 85, 88);
  ctx.fillStyle = COLOR_GOLD;
  ctx.font = "bold 48px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CALL OU FOLD", S / 2, 178);

  ctx.fillStyle = COLOR_CREAM_DIM;
  ctx.font = "600 26px Georgia, serif";
  ctx.fillText(data.tournamentInfo, S / 2, 220);

  // Chip "HISTÓRICO DA MÃO" — identifica o card do carrossel (2ª imagem)
  ctx.fillStyle = "rgba(212,175,55,0.14)";
  ctx.strokeStyle = "rgba(212,175,55,0.55)";
  ctx.lineWidth = 1.5;
  const chipY = 258;
  const chipH = 40;
  ctx.font = "bold 22px Georgia, serif";
  const chipLabel = "HISTÓRICO DA MÃO — AÇÃO COMPLETA";
  const chipW = Math.min(S - 140, ctx.measureText(chipLabel).width + 48);
  roundRect(ctx, (S - chipW) / 2, chipY - chipH / 2, chipW, chipH, chipH / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLOR_GOLD_BRIGHT;
  ctx.textBaseline = "middle";
  ctx.fillText(chipLabel, S / 2, chipY + 1);

  // ── CARTAS DO HERÓI + BOARD (compactas, como protagonistas) ──
  const hasBoard = data.board.length > 0;
  const cardW = hasBoard ? 110 : 156;
  const cardH = hasBoard ? 150 : 212;
  const gap = hasBoard ? 18 : 28;
  const cardsTotalW = cardW * 2 + gap;
  const cardsX = (S - cardsTotalW) / 2;
  const cardsY = 292;

  const glowCx = S / 2;
  const glowCy = cardsY + cardH / 2;
  const glow = ctx.createRadialGradient(glowCx, glowCy, 24, glowCx, glowCy, cardsTotalW * 0.7);
  glow.addColorStop(0, "rgba(230,196,84,0.18)");
  glow.addColorStop(1, "rgba(230,196,84,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(glowCx - cardsTotalW, glowCy - cardH, cardsTotalW * 2, cardH * 2);

  if (data.heroCards.length >= 1) drawCardOnCanvas(ctx, data.heroCards[0], cardsX, cardsY, cardW, cardH);
  if (data.heroCards.length >= 2) drawCardOnCanvas(ctx, data.heroCards[1], cardsX + cardW + gap, cardsY, cardW, cardH);

  let bottomY = cardsY + cardH;
  if (hasBoard) {
    const bCardW = 80;
    const bCardH = 112;
    const bGap = 9;
    const bTotalW = data.board.length * bCardW + (data.board.length - 1) * bGap;
    const bX = (S - bTotalW) / 2;
    const bY = cardsY + cardH + 10;
    for (let i = 0; i < data.board.length; i++) {
      drawCardOnCanvas(ctx, data.board[i], bX + i * (bCardW + bGap), bY, bCardW, bCardH);
    }
    bottomY = bY + bCardH;
  }

  // ── POSIÇÃO + STACK ──
  const posStackY = bottomY + 36;
  ctx.fillStyle = COLOR_GOLD_BRIGHT;
  ctx.font = "bold 26px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(`${data.position} · ${data.stackBB}`, S / 2, posStackY);

  // ── HISTÓRICO: agrupado por rua, cada ação com valor. LAYOUT EM 2 COLUNAS
  // (Pré-Flop+Flop à esquerda | Turn+River à direita) para que mãos longas
  // nunca invadam o rodapé. ──
  const order = ["Pré-Flop", "Flop", "Turn", "River"];
  const streetGroups = new Map<string, ActionLogEntry[]>();
  for (const entry of log) {
    if (!streetGroups.has(entry.street)) streetGroups.set(entry.street, []);
    streetGroups.get(entry.street)!.push(entry);
  }

  const blockTop = posStackY + 14;
  const blockPadX = 36;
  const blockPadY = 8;
  const lineH = 21; // altura por linha de ação
  const streetGap = 5; // respiro entre ruas
  const streetHeaderH = 18; // linha do nome da rua
  const colGap = 20; // espaço entre as duas colunas

  // divide as ruas em 2 colunas: esquerda = primeiro meio, direita = segundo
  // meio (garante a ordem temporal: esquerda = começo da mão)
  const visibleStreets = order.filter((st) => streetGroups.has(st));
  const mid = Math.ceil(visibleStreets.length / 2);
  const leftStreets = visibleStreets.slice(0, mid);
  const rightStreets = visibleStreets.slice(mid);

  // altura de cada coluna (cabeçalhos + linhas + respiro)
  const colHeight = (streets: string[]): number => {
    let h = blockPadY * 2;
    for (let i = 0; i < streets.length; i++) {
      const entries = streetGroups.get(streets[i])!;
      h += streetHeaderH;
      for (let j = 0; j < entries.length; j++) {
        const mark = entries[j].correct !== undefined ? 4 : 0;
        h += lineH + mark;
      }
      if (i < streets.length - 1) h += streetGap;
    }
    return h;
  };
  const leftH = colHeight(leftStreets);
  const rightH = colHeight(rightStreets);

  // o resultado fecha a coluna mais baixa; o bloco ocupa a maior das duas
  const resultLabel = data.tournamentResult ? `Resultado: ${data.tournamentResult}` : "";
  // o resultado não entra mais na coluna (box final o exibe); blockH = max das colunas
  const blockH = Math.max(leftH, rightH);
  const blockMaxH = S - blockTop - 224; // folga para o rodapé E o box do showdown

  // se a coluna esquerda + resultado estourar, encurta as linhas (raro: máximo
  // ~10 ações na coluna esquerda cabe em ~400px)
  const fitLeft = leftStreets.length > 0 && leftH > blockMaxH;
  const effLineH = fitLeft ? Math.max(22, lineH - 4) : lineH;

  // caixa translúcida do histórico (largura total, altura controlada)
  const colW = S - blockPadX * 2;
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  roundRect(ctx, blockPadX, blockTop, colW, Math.min(blockH, blockMaxH), 12);
  ctx.fill();

  // desenha uma coluna de ruas
  const drawColumn = (streets: string[], cx: number) => {
    let ry = blockTop + blockPadY;
    for (let i = 0; i < streets.length; i++) {
      const street = streets[i];
      const entries = streetGroups.get(street)!;

      // nome da rua em dourado
      ctx.fillStyle = COLOR_GOLD_BRIGHT;
      ctx.font = "bold 20px Georgia, serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(street.toUpperCase(), cx + 16, ry + streetHeaderH / 2);
      ry += streetHeaderH;

      // ações da rua
      for (const entry of entries) {
        const whoColor = entry.isHero ? COLOR_GOLD_BRIGHT : COLOR_CREAM;
        const actionColor = entry.isHero ? COLOR_CREAM : COLOR_CREAM_DIM;
        const fontSize = "19px";
        ctx.font = `bold ${fontSize} Georgia, serif`;
        const whoTxt = entry.who;
        const wWho = ctx.measureText(whoTxt).width;
        ctx.font = `600 ${fontSize} Georgia, serif`;
        const actionTxt = ` ${entry.action}`;
        const wAct = ctx.measureText(actionTxt).width;
        const mark = entry.correct === false ? " ✗" : entry.correct === true ? " ✓" : "";
        ctx.font = `bold ${fontSize} Georgia, serif`;
        const wMark = ctx.measureText(mark).width;

        let x = cx + 16;
        // marca ✓/✗ à esquerda (só para ações do herói decididas)
        if (mark) {
          ctx.fillStyle = entry.correct ? "#5fb96a" : "#e07b6b";
          ctx.fillText(mark, x, ry + effLineH / 2);
          x += wMark + 6;
        }
        ctx.fillStyle = whoColor;
        ctx.font = `bold ${fontSize} Georgia, serif`;
        ctx.fillText(whoTxt, x, ry + effLineH / 2);
        x += wWho;
        ctx.fillStyle = actionColor;
        ctx.font = `600 ${fontSize} Georgia, serif`;
        ctx.fillText(actionTxt, x, ry + effLineH / 2);
        x += wAct;
        ry += effLineH + (mark ? 4 : 0);
      }

      // POTE DA RUA (dourado, sempre que a rua teve pot registrado)
      if (data.potByStreet?.[street] !== undefined) {
        const potTxt = `Pote: ${data.potByStreet[street].toFixed(1)}bb`;
        ctx.fillStyle = COLOR_GOLD;
        ctx.font = "bold 18px Georgia, serif";
        ctx.fillText(potTxt, cx + 16, ry + effLineH / 2);
        ry += effLineH;
      }

      if (i < streets.length - 1) ry += streetGap;
    }

    // resultado da mão: desenhado apenas no box final (abaixo do bloco),
    // nunca dentro da coluna — evita sobreposição com as ações da rua.
    void 0;
  };

  const leftX = blockPadX;
  const rightX = blockPadX + colW / 2 + colGap / 2;

  // ── SHOWDOWN — as mãos reveladas, quem levou o pote e o tamanho do pote.
  // Quando a mão chegou ao showdown, este é o bloco que o público quer ver:
  // o vilão mostra as cartas e o resultado fecha a história.
  // O box do showdown precisa de ~160px; se não couber antes do rodapé, o card
  // fecha só com o pote final (caixa de 48px) para nunca invadir o rodapé. ──
  const showdownDrawY = blockTop + Math.min(blockH, blockMaxH) + 14;
  const canFitShowdown = (data.showdown && data.showdown.length > 0) && (showdownDrawY + 170 < S - 100);
  const canFitPotBox = showdownDrawY + 60 < S - 100;
  if (canFitShowdown) {
    const sdPad = 16;
    const miniW = 58;
    const miniH = 82;
    const miniGap = 10;
    // vilão primeiro (cartas de quem jogou contra), herói depois
    const sdPlayers = [...(data.showdown ?? [])].sort((a, _b) => (a.isHero ? 1 : -1));
    // vencedor destacado em dourado, perdedor em creme comum
    const winner = sdPlayers.find((p) => p.won);
    const potLabel = data.finalPotBB
      ? `Pote: ${data.finalPotBB.toFixed(1)}bb`
      : winner
        ? `Vencedor levou o pote`
        : "";

    ctx.fillStyle = "rgba(0,0,0,0.32)";
    const resultInBox = resultLabel && !potLabel ? 26 : 0; // resultado como linha do box (só se não houver pote)
    const sdBoxH = 8 + miniH + (potLabel ? 34 : 8) + sdPad * 2 + resultInBox;
    const sdBoxTop = showdownDrawY;
    roundRect(ctx, blockPadX, sdBoxTop, colW, sdBoxH, 12);
    ctx.fill();

    // título — combina SHOWDOWN com o resultado da mão na mesma linha
    ctx.fillStyle = COLOR_GOLD_BRIGHT;
    ctx.font = "bold 22px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const titleTxt = resultLabel ? `SHOWDOWN — ${resultLabel.replace(/^Resultado: /, "")}` : "SHOWDOWN";
    ctx.fillText(titleTxt, S / 2, sdBoxTop + sdPad + 11);

    // total de largura dos jogadores (cartas + nome) para centralizar
    const nameFontH = 18;
    let totalW = 0;
    const widths = sdPlayers.map((p) => {
      const cardsW = Math.max(1, p.cards.length) * miniW + (Math.max(1, p.cards.length) - 1) * miniGap;
      ctx.font = `bold ${nameFontH}px Georgia, serif`;
      const wName = ctx.measureText(p.name).width;
      return { cardsW, wName };
    });
    totalW = widths.reduce((t, w) => t + w.cardsW + w.wName, 0) + (sdPlayers.length - 1) * 30;
    const fitW = Math.min(colW - 32, totalW);

    // nunca deixa o grupo de cartas encostar na borda do box (margem interna 20)
    let gx = Math.max(blockPadX + 20, S / 2 - fitW / 2);
    const cardsY = sdBoxTop + sdPad + 22 + 8;
    for (let i = 0; i < sdPlayers.length; i++) {
      const p = sdPlayers[i];
      const w = widths[i];
      const groupW = w.cardsW + w.wName;

      // cartas (mesmo estilo dos cards grandes, versão compacta)
      for (let c = 0; c < Math.max(1, p.cards.length); c++) {
        drawMiniCard(ctx, p.cards[c] ?? makeCard(14, 3), gx + c * (miniW + miniGap), cardsY, miniW, miniH);
      }
      // nome + indicador do vencedor
      const nameColor = p.won ? COLOR_GOLD_BRIGHT : COLOR_CREAM_DIM;
      ctx.fillStyle = nameColor;
      ctx.font = `bold ${nameFontH}px Georgia, serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const nameTxt = p.won ? `${p.name} ${winner ? "👑" : ""} levou` : p.name;
      ctx.fillText(nameTxt, gx + groupW / 2, cardsY + miniH + 14);

      if (p.won && potLabel) {
        ctx.font = `600 16px Georgia, serif`;
        ctx.fillText(potLabel, gx + groupW / 2, cardsY + miniH + 32);
      }
      gx += groupW + 30;
    }
  } else if (canFitPotBox && data.finalPotBB) {
    // mão SEM showdown (todo mundo foldou) ou sem espaço: o pote final fecha a história.
    const potTxt = `Pote final: ${data.finalPotBB.toFixed(1)}bb`;
    const potLabel = resultLabel ? `${resultLabel} — ${potTxt}` : potTxt;
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    const potBoxH = 48;
    roundRect(ctx, blockPadX, showdownDrawY, colW, potBoxH, 12);
    ctx.fill();
    ctx.fillStyle = COLOR_GOLD_BRIGHT;
    ctx.font = "bold 20px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(potLabel, S / 2, showdownDrawY + potBoxH / 2);
  }
  // divisor vertical sutil entre as colunas
  ctx.strokeStyle = "rgba(212,175,55,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(S / 2, blockTop + 18);
  ctx.lineTo(S / 2, blockTop + Math.min(blockH, blockMaxH) - 18);
  ctx.stroke();
  drawColumn(leftStreets, leftX);
  drawColumn(rightStreets, rightX);

  // ── RODAPÉ ──
  const footerY = S - 52;
  ctx.strokeStyle = "rgba(212,175,55,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(200, footerY - 26);
  ctx.lineTo(S - 200, footerY - 26);
  ctx.stroke();
  ctx.fillStyle = COLOR_GOLD_BRIGHT;
  ctx.font = "600 22px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("calloufold.com.br · Grátis · sem dinheiro real", S / 2, footerY);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

/** Carta em versão COMPACTA (mesmo estilo visual dos cards grandes): usada no
 *  showdown do card de histórico, onde o espaço é curto. Fundo creme, cantos
 *  arredondados, naipe e valor nos dois cantos — fiel ao padrão da marca. */
function drawMiniCard(
  ctx: CanvasRenderingContext2D,
  card: Card,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  // Card é um número 0..51: rank = 2 + floor(card/4), suit = card % 4 (0=♣, 1=♦, 2=♥, 3=♠)
  const suits = ["♣", "♦", "♥", "♠"];
  const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const r = rankOf(card);
  const s = suitOf(card);
  const red = s === 1 || s === 2;
  // corpo da carta (creme) com cantos arredondados
  ctx.fillStyle = "#f4efe2";
  roundRect(ctx, x, y, w, h, Math.min(8, w * 0.12));
  ctx.fill();
  // contorno fino para destacar da mesa
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, Math.min(8, w * 0.12));
  ctx.stroke();

  const label = `${ranks[r - 2]}${suits[s]}`;
  ctx.fillStyle = red ? "#c0392b" : "#1a1a1a";
  // valor no canto superior esquerdo, grande em relação ao card
  ctx.font = `bold ${Math.round(w * 0.42)}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + w * 0.28, y + h * 0.28);
  // naipe grande no centro
  ctx.font = `${Math.round(w * 0.7)}px Georgia, serif`;
  ctx.fillText(suits[s], x + w / 2, y + h * 0.62);
}

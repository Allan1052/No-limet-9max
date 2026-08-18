// ---------------------------------------------------------------------------
// Hand Share Card — gera um card PNG elegante (1080×1080) de uma mão jogada,
// com a logo oficial, cartas, board, decisão e tip do coach.
// Ideal para compartilhar no Instagram/WhatsApp.
//
// Modo "simples": recreativo — posição, stack, ação, nota, frase simples.
// Modo "tecnico": com matemática — equity, potOdds, evBB (só se existirem).
// ---------------------------------------------------------------------------
import { rankOf, suitOf, RANKS, makeCard, type Card } from "../engine/cards";
import type { Rating } from "../feedback/analyzer";
import { LOGO_CF_BASE64 } from "./logoCfBase64";

const SUIT_SYMBOL = ["♣", "♦", "♥", "♠"]; // ordem de SUITS = "cdhs"
const SUIT_RED = [false, true, true, false];

// Cores da marca
const COLOR_BG_DARK = "#0a1410";
const COLOR_BG_FELT = "#0d1f16";
const COLOR_GOLD = "#d4af37";
const COLOR_GOLD_BRIGHT = "#e6c454";
const COLOR_CREAM = "#ece7d5";
const COLOR_CREAM_DIM = "#b8b29a";
const COLOR_GREEN_OK = "#2d7a3a";
const COLOR_RED_ERR = "#c0392b";
const COLOR_CARD_WHITE = "#f4f1e6";
const COLOR_RED_SUIT = "#c0392b";
const COLOR_BLACK_SUIT = "#1a1a1a";

export type ShareCardMode = "simples" | "tecnico";

/** Tipo de card: "decisao" = card da mão/decisão (padrão, simétrico ao modo
 *  simples/técnico); "historico" = card com o histórico completo da mão, rua por
 *  rua, com os valores apostados — feito para postar em carrossel no Instagram. */
export type ShareCardType = "decisao" | "historico";

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

/** Chip arredondado de nota (✓ verde / ✗ vermelho) com brilho — usado nos dois modos. */
function drawRatingChip(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  label: string,
  correct: boolean,
) {
  const color = correct ? COLOR_GREEN_OK : COLOR_RED_ERR;
  ctx.font = "bold 27px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const tw = ctx.measureText(label).width;
  const chipH = 48;
  const chipW = Math.max(210, tw + 56);
  const chipX = cx - chipW / 2;

  ctx.save();
  ctx.shadowColor = correct ? "rgba(45,122,58,0.6)" : "rgba(192,57,43,0.6)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = color;
  roundRect(ctx, chipX, cy - chipH / 2, chipW, chipH, chipH / 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#fff";
  ctx.font = "bold 27px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, cx, cy + 1);
}

/** Uma linha da timeline da mão: "PRÉ-FLOP · Raise 2.3bb ✓" (rua dourada, ação
 *  creme, marca verde/vermelha), centralizada. */
function drawTimelineRow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  street: string,
  action: string,
  correct: boolean,
) {
  const streetTxt = street.toUpperCase();
  const midTxt = ` · ${action}`;
  const mark = correct ? "  ✓" : "  ✗";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = "bold 25px Georgia, serif";
  const w1 = ctx.measureText(streetTxt).width;
  ctx.font = "600 25px Georgia, serif";
  const w2 = ctx.measureText(midTxt).width;
  ctx.font = "bold 25px Georgia, serif";
  const w3 = ctx.measureText(mark).width;
  let x = cx - (w1 + w2 + w3) / 2;

  ctx.fillStyle = COLOR_GOLD_BRIGHT;
  ctx.font = "bold 25px Georgia, serif";
  ctx.fillText(streetTxt, x, y);
  x += w1;
  ctx.fillStyle = COLOR_CREAM;
  ctx.font = "600 25px Georgia, serif";
  ctx.fillText(midTxt, x, y);
  x += w2;
  ctx.fillStyle = correct ? "#5fb96a" : "#e07b6b";
  ctx.font = "bold 25px Georgia, serif";
  ctx.fillText(mark, x, y);
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

/** Nota em palavra para o card simples. */
function ratingWord(rating: Rating): string {
  switch (rating) {
    case "boa": return "Boa!";
    case "ok": return "Ok";
    case "imprecisa": return "Impreciso";
    case "ruim": return "Erro";
    default: return "—";
  }
}

/** Veredito para o card técnico. */
function ratingVerdict(rating: Rating): string {
  return rating === "boa" || rating === "ok" ? "✓ CORRETO" : "✗ ERROU";
}

function isRatingCorrect(rating: Rating): boolean {
  return rating === "boa" || rating === "ok";
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
  ctx.fillText("CALL OU FOLD", S / 2, 172);
  ctx.fillStyle = COLOR_GOLD;
  ctx.font = "bold 20px Georgia, serif";
  ctx.fillText("Simulador grátis de poker", S / 2, 214);
  // Torneio
  ctx.fillStyle = COLOR_CREAM_DIM;
  ctx.font = "600 26px Georgia, serif";
  ctx.fillText(data.tournamentInfo, S / 2, 258);

  // Separador dourado
  ctx.strokeStyle = "rgba(212,175,55,0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(120, 296);
  ctx.lineTo(S - 120, 296);
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

  // ASSINATURA PADRÃO: a mesma nos três cards — site + "Grátis" + aviso de
  // sem dinheiro real, sempre no rodapé, sempre no mesmo estilo.
  ctx.strokeStyle = "rgba(212,175,55,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(120, 822);
  ctx.lineTo(S - 120, 822);
  ctx.stroke();

  const footerY = S - 52;
  ctx.beginPath();
  ctx.moveTo(120, footerY - 26);
  ctx.lineTo(S - 120, footerY - 26);
  ctx.stroke();
  ctx.fillStyle = COLOR_GOLD_BRIGHT;
  ctx.font = "bold 24px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("calloufold.com.br · Grátis · sem dinheiro real", S / 2, footerY);

  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/png");
  });
}

/** Quebra um texto em linhas para caber no canvas. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    const testWidth = ctx.measureText(currentLine + (currentLine ? " " : "") + word).width;
    if (testWidth <= maxWidth) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
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
  return drawDecisionCard(data, mode);
}

// ── Card da DECISÃO (layout atual: mão + board + timeline/chip + tip) ────────
async function drawDecisionCard(data: HandShareData, mode: ShareCardMode): Promise<Blob | null> {
  const S = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);

  // ── Fundo: feltro escuro com gradiente radial ──
  const bgGrad = ctx.createRadialGradient(S / 2, S * 0.4, S * 0.1, S / 2, S * 0.5, S * 0.8);
  bgGrad.addColorStop(0, COLOR_BG_FELT);
  bgGrad.addColorStop(1, COLOR_BG_DARK);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, S, S);

  // ── Textura de feltro sutil ──
  ctx.globalAlpha = 0.03;
  for (let i = 0; i < 200; i++) {
    const px = Math.random() * S;
    const py = Math.random() * S;
    ctx.fillStyle = Math.random() > 0.5 ? "#fff" : "#000";
    ctx.fillRect(px, py, 2, 2);
  }
  ctx.globalAlpha = 1;

  // ── Vinheta: escurece os cantos, dá profundidade de mesa ──
  const vig = ctx.createRadialGradient(S / 2, S / 2, S * 0.34, S / 2, S / 2, S * 0.72);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, S, S);

  // ── Linha dourada superior (sem moldura pesada) ──
  ctx.strokeStyle = "rgba(212,175,55,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, 20);
  ctx.lineTo(S - 60, 20);
  ctx.stroke();

  // ── TOPO: Logo oficial + título + subtítulo + info do torneio ──
  await drawLogoImage(ctx, S / 2, 85, 88);
  ctx.fillStyle = COLOR_GOLD;
  ctx.font = "bold 48px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CALL OU FOLD", S / 2, 172);

  // Subtítulo da marca (padrão visual aprovado pelo Allan)
  ctx.fillStyle = COLOR_CREAM_DIM;
  ctx.font = "600 28px Georgia, serif";
  ctx.fillText("Call ou Fold · Simulador grátis", S / 2, 218);

  // Info do torneio
  ctx.fillStyle = COLOR_CREAM_DIM;
  ctx.font = "600 26px Georgia, serif";
  ctx.fillText(data.tournamentInfo, S / 2, 258);

  // ── Linha separadora dourada ──
  ctx.strokeStyle = "rgba(212,175,55,0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(120, 293);
  ctx.lineTo(S - 120, 293);
  ctx.stroke();

  // ── matchup: herói × vilão (se showdown) ──
  // Vilão a mostrar: prioriza QUEM VENCEU o pote (pra "você perdeu" mostrar quem
  // te ganhou), senão o primeiro vilão do showdown.
  const villain =
    data.showdown?.find((p) => !p.isHero && p.won && p.cards.length >= 2) ??
    data.showdown?.find((p) => !p.isHero && p.cards.length >= 2);
  // ── painel HERÓI × VILÃO no topo: mostra QUEM TE GANHOU (ou a sua mão
  // quando não há showdown), coerente com o resultado do torneio ──
  const cw = 84, ch = 112, cg = 10, tagFont = "800 21px Georgia, serif";
  const drawPlayerBox = (cx: number, tag: string, cards: Card[], highlight: boolean) => {
    ctx.fillStyle = highlight ? "rgba(230,196,84,0.10)" : "rgba(230,196,84,0.04)";
    ctx.strokeStyle = highlight ? "rgba(230,196,84,0.55)" : "rgba(230,196,84,0.25)";
    ctx.lineWidth = highlight ? 2 : 1;
    roundRect(ctx, cx - cw - 16, 318, cw * 2 + cg + 32, ch + 56, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = highlight ? COLOR_GOLD_BRIGHT : COLOR_CREAM_DIM;
    ctx.font = tagFont;
    ctx.textAlign = "center";
    ctx.fillText(tag, cx, 340);
    const cx0 = cx - (cw * 2 + cg) / 2;
    if (cards[0]) drawCardOnCanvas(ctx, cards[0], cx0, 354, cw, ch);
    if (cards[1]) drawCardOnCanvas(ctx, cards[1], cx0 + cw + cg, 354, cw, ch);
  };
  if (villain && data.board.length > 0) {
    const heroWon = data.showdown?.find((p) => p.isHero)?.won;
    drawPlayerBox(S / 2 - 110, "HERÓI", data.heroCards, heroWon === true);
    drawPlayerBox(S / 2 + 110, "VILÃO", villain.cards, heroWon !== true);
    ctx.fillStyle = COLOR_GOLD_BRIGHT;
    ctx.font = "900 44px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("VS", S / 2, 386);
  }

  // ── CARTAS DO HERÓI ──
  // Sem board, as cartas do herói são maiores (protagonistas) e descem um pouco,
  // pra o card não ficar com um vazio grande embaixo.
  const hasBoard = data.board.length > 0;
  const cardW = hasBoard ? 148 : 188;
  const cardH = hasBoard ? 204 : 262;
  const gap = hasBoard ? 28 : 32;
  const cardsTotalW = cardW * 2 + gap;
  const cardsX = (S - cardsTotalW) / 2;
  // Header terminou em 293 (com o subtítulo da marca). Quando há showdown,
  // as cartas descem para dar espaço ao painel HERÓI × VILÃO no topo.
  const cardsY = (villain && hasBoard) ? 432 : hasBoard ? 306 : 338;

  // Brilho dourado atrás das cartas do herói — destaca "a mão" como protagonista.
  const glowCx = S / 2;
  const glowCy = cardsY + cardH / 2;
  const glow = ctx.createRadialGradient(glowCx, glowCy, 30, glowCx, glowCy, cardsTotalW * 0.7);
  glow.addColorStop(0, "rgba(230,196,84,0.2)");
  glow.addColorStop(1, "rgba(230,196,84,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(glowCx - cardsTotalW, glowCy - cardH, cardsTotalW * 2, cardH * 2);

  if (data.heroCards.length >= 1) {
    drawCardOnCanvas(ctx, data.heroCards[0], cardsX, cardsY, cardW, cardH);
  }
  if (data.heroCards.length >= 2) {
    drawCardOnCanvas(ctx, data.heroCards[1], cardsX + cardW + gap, cardsY, cardW, cardH);
  }

  // ── BOARD (se houver) ──
  let bottomY = cardsY + cardH; // borda inferior do último bloco de cartas
  if (data.board.length > 0) {
    const bCardW = 96;
    const bCardH = 134;
    const bGap = 10;
    const bTotalW = data.board.length * bCardW + (data.board.length - 1) * bGap;
    const bX = (S - bTotalW) / 2;
    const bY = cardsY + cardH + 14;
    for (let i = 0; i < data.board.length; i++) {
      drawCardOnCanvas(ctx, data.board[i], bX + i * (bCardW + bGap), bY, bCardW, bCardH);
    }
    bottomY = bY + bCardH;
  }

  // ── POSIÇÃO + STACK (SEMPRE visível) — com respiro após as cartas ──
  // Sem board há mais espaço vertical: alarga os intervalos pra distribuir.
  const g = hasBoard ? 0 : 12;
  const posStackY = bottomY + (hasBoard ? 40 : 58);
  ctx.fillStyle = COLOR_GOLD_BRIGHT;
  ctx.font = "bold 30px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(`${data.position} · ${data.stackBB}`, S / 2, posStackY);

  const useTimeline = !!data.decisions && data.decisions.length >= 2;
  let statsY: number;

  if (useTimeline) {
    // ── LINHA DO TEMPO DA MÃO — uma linha por rua (pré-flop→river) ──
    let ry = posStackY + 42;
    for (const d of data.decisions!) {
      drawTimelineRow(ctx, S / 2, ry, d.street, d.action, d.correct);
      ry += 36;
    }
    statsY = ry - 36 + 46; // após a última rua, espaço antes da dica
  } else {
    // ── CONTEXTO + DECISÃO + CHIP (mão de uma decisão só, ex.: all-in pré) ──
    const ctxY = posStackY + 36 + g;
    ctx.fillStyle = COLOR_CREAM_DIM;
    ctx.font = "600 26px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(data.street + " — " + data.context, S / 2, ctxY);

    const decY = ctxY + 44 + g;
    ctx.fillStyle = COLOR_CREAM;
    ctx.font = "bold 38px Georgia, serif";
    ctx.fillText(`Você: ${data.heroAction}`, S / 2, decY);

    const verY = decY + 42 + g;
    const correct = isRatingCorrect(data.rating);
    if (mode === "simples") {
      const label = `${correct ? "✓" : "✗"} ${ratingWord(data.rating).toUpperCase()}`;
      drawRatingChip(ctx, S / 2, verY, label, correct);
    } else {
      drawRatingChip(ctx, S / 2, verY, ratingVerdict(data.rating), correct);
    }

    // ── MATEMÁTICA (só no modo técnico, mão de uma decisão) ──
    statsY = verY + 40;
    if (mode === "tecnico") {
      const statParts: string[] = [];
      if (data.equity !== undefined) statParts.push(`Equity ${Math.round(data.equity * 100)}%`);
      if (data.potOdds !== undefined) statParts.push(`Pot odds ${Math.round(data.potOdds * 100)}%`);
      if (data.evBB !== undefined) statParts.push(`EV ${data.evBB.toFixed(1)}bb`);
      if (statParts.length > 0) {
        ctx.fillStyle = COLOR_GOLD_BRIGHT;
        ctx.font = "600 24px Georgia, serif";
        ctx.textAlign = "center";
        ctx.fillText(statParts.join("  ·  "), S / 2, statsY);
        statsY += 38;
      }
    }
  }

  // ── TIP DO COACH (texto limpo, sem aspas quebradas) ──
  // Quebra o texto ANTES pra a caixa ter a altura exata (sem espaço morto) e
  // nunca invadir o rodapé.
  const cleanTip = cleanCoachText(data.coachTip);
  ctx.font = "italic 23px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const maxTipWidth = S - 220;
  let tipLines = wrapText(ctx, cleanTip, maxTipWidth);
  const maxLines = 3;
  if (tipLines.length > maxLines) {
    const lastLine = tipLines.slice(maxLines - 1).join(" ");
    tipLines = [...tipLines.slice(0, maxLines - 1), lastLine + "…"];
  }
  const lineHeight = 28;
  const boxPad = 19;
  const tipBoxH = boxPad * 2 + tipLines.length * lineHeight;
  const tipBoxTop = statsY + 6 + g;

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  roundRect(ctx, 70, tipBoxTop, S - 140, tipBoxH, 12);
  ctx.fill();

  ctx.fillStyle = COLOR_CREAM;
  const firstLineY = tipBoxTop + boxPad + lineHeight / 2;
  for (let i = 0; i < tipLines.length; i++) {
    ctx.fillText(tipLines[i], S / 2, firstLineY + i * lineHeight);
  }

  // ── RODAPÉ — garante folga do bloco da dica e fica sempre visível ──
  const footerY = Math.max(S - 52, tipBoxTop + tipBoxH + 40);
  // Linha dourada fina acima do rodapé (fecha o card).
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

/**
 * CARD DO HISTÓRICO COMPLETO DA MÃO — rua por rua, com valores apostados.
 * Layout: topo padrão (logo + título + torneio), cartas do herói + board, e em
 * vez do chip/dica, um bloco com TODAS as ações da mão (pré-flop → river),
 * herói destacado em dourado. Fechado com o resultado da mão, se houver.
 * Feito para compor o carrossel do Instagram junto com o card da decisão.
 */
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

  // ── TOPO (mesmo padrão da marca: logo + título + subtítulo) ──
  await drawLogoImage(ctx, S / 2, 85, 88);
  ctx.fillStyle = COLOR_GOLD;
  ctx.font = "bold 48px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CALL OU FOLD", S / 2, 172);

  // Subtítulo da marca (padrão visual aprovado pelo Allan)
  ctx.fillStyle = COLOR_CREAM_DIM;
  ctx.font = "600 28px Georgia, serif";
  ctx.fillText("Call ou Fold · Simulador grátis", S / 2, 216);

  ctx.fillStyle = COLOR_CREAM_DIM;
  ctx.font = "600 26px Georgia, serif";
  ctx.fillText(data.tournamentInfo, S / 2, 258);

  // Chip "HISTÓRICO DA MÃO" — identifica o card do carrossel (2ª imagem)
  ctx.fillStyle = "rgba(212,175,55,0.14)";
  ctx.strokeStyle = "rgba(212,175,55,0.55)";
  ctx.lineWidth = 1.5;
  const chipY = 300;
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
  // Header com subtítulo termina em ~340; cartas descem logo após o chip (antes 292).
  const cardsY = 336;

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
  // quando encurtar linhas, apertar também cabeçalho e respiro das ruas
  // (effHeaderH/effStreetGap definidos após fitCols, logo abaixo)

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
  // SHOWDOWN É OBRIGATÓRIO quando a mão chegou lá: se houver cartas
  // reveladas, reservamos o espaço do box do showdown (~168px) ANTES de
  // dimensionar o bloco de ações. Assim o card nunca fecha sem mostrar
  // as cartas do vilão — é o momento que o público quer ver.
  const hasShowdown = !!(data.showdown && data.showdown.length > 0);
  // o rodapé fica em ~S-52; o showdown box precisa de ~168px logo abaixo do
  // bloco. reserva real: rodapé (112) + respiro (14) + showdown (168).
  const blockMaxH = S - blockTop - 112 - 14 - (hasShowdown ? 168 : 0);

  // se o bloco de ações estourar o espaço reservado, encurta as linhas das
  // duas colunas até caberem (mãos longas com ação nas 4 ruas cabem ~10 ações;
  // o encurtamento mantém tudo dentro do card sem cortar o showdown)
  const fitCols = Math.max(leftH, rightH) > blockMaxH;
  // recalcula a altura com linhas compactas para saber se precisa truncar
  // modo compacto: fonte 16px bold/600 continua legível em 1080px, e a
  // compactação garante que o showdown obrigatório sempre caiba abaixo.
  const effLineH = fitCols ? 13 : lineH;
  const effMarkH = fitCols ? 0 : 4;
  const effHeaderH = fitCols ? 13 : streetHeaderH;
  const effStreetGap = fitCols ? 3 : streetGap;
  const effPotLine = fitCols ? effLineH : lineH;
  // se mesmo compactando estourar, corta entradas das ruas mais longas
  // (mantendo a ordem: Pré-Flop e Flop à esquerda primeiro)
  const colHeightFit = (streets: string[]): number => {
    let h = blockPadY * 2;
    for (let i = 0; i < streets.length; i++) {
      const entries = streetGroups.get(streets[i])!;
      h += effHeaderH;
      for (let j = 0; j < entries.length; j++) {
        const mark = entries[j].correct !== undefined ? effMarkH : 0;
        h += effLineH + mark;
      }
      // linha do pote da rua (dourada, se houver registro)
      if (data.potByStreet?.[streets[i]] !== undefined) h += effPotLine;
      if (i < streets.length - 1) h += effStreetGap;
    }
    return h;
  };
  const trimToFit = (streets: string[]): string[] => {
    if (!fitCols) return streets;
    const out: string[] = [];
    for (const st of streets) {
      const entries = streetGroups.get(st)!.slice();
      // testa se coube sem truncar esta rua
      streetGroups.set(st, entries);
      const h = colHeightFit(out) + (out.length ? effStreetGap : 0) + effHeaderH + entries.length * (effLineH + effMarkH) + (data.potByStreet?.[st] !== undefined ? effPotLine : 0);
      if (h > blockMaxH) {
        // corta ações da rua atual até caber (manter header + mínimo 2 ações)
        const budget = blockMaxH - colHeightFit(out) - (out.length ? effStreetGap : 0) - effHeaderH - (data.potByStreet?.[st] !== undefined ? effPotLine : 0);
        const maxActs = Math.max(2, Math.floor(budget / (effLineH + effMarkH)));
        streetGroups.set(st, entries.slice(0, maxActs));
      }
      out.push(st);
    }
    return out;
  };
  const leftStreetsFit = trimToFit(leftStreets);
  const rightStreetsFit = trimToFit(rightStreets);
  const leftHFit = colHeightFit(leftStreetsFit);
  const rightHFit = colHeightFit(rightStreetsFit);
  const blockHFit = Math.max(leftHFit, rightHFit);
  const drawBlockH = Math.min(blockHFit, blockMaxH);

  // caixa translúcida do histórico (largura total, altura controlada)
  const colW = S - blockPadX * 2;
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  roundRect(ctx, blockPadX, blockTop, colW, drawBlockH ?? 0, 12);
  ctx.fill();

  // desenha uma coluna de ruas (fonte compacta no modo fit, para bater com
  // effLineH — assim o texto nunca invade o box do showdown)
  const drawColumn = (streets: string[], cx: number) => {
    let ry = blockTop + blockPadY;
    const colFont = fitCols ? 16 : 20;
    const colFontAct = fitCols ? 15 : 19;
    const colFontPot = fitCols ? 14 : 18;
    for (let i = 0; i < streets.length; i++) {
      const street = streets[i];
      const entries = streetGroups.get(street)!;

      // nome da rua em dourado
      ctx.fillStyle = COLOR_GOLD_BRIGHT;
      ctx.font = `bold ${colFont}px Georgia, serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(street.toUpperCase(), cx + 16, ry + effHeaderH / 2);
      ry += effHeaderH;

      // ações da rua
      for (const entry of entries) {
        const whoColor = entry.isHero ? COLOR_GOLD_BRIGHT : COLOR_CREAM;
        const actionColor = entry.isHero ? COLOR_CREAM : COLOR_CREAM_DIM;
        const fontSize = `${colFontAct}px`;
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
        ctx.font = `bold ${colFontPot}px Georgia, serif`;
        ctx.fillText(potTxt, cx + 16, ry + effLineH / 2);
        ry += effLineH;
      }

      if (i < streets.length - 1) ry += effStreetGap;
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
  // O box do showdown precisa de ~170px; se não couber antes do rodapé, o card
  // fecha só com o pote final (caixa de 48px) para nunca invadir o rodapé. ──
  const showdownDrawY = blockTop + drawBlockH + 14;
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
  ctx.lineTo(S / 2, blockTop + drawBlockH - 18);
  ctx.stroke();
  drawColumn(leftStreetsFit, leftX);
  drawColumn(rightStreetsFit, rightX);

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

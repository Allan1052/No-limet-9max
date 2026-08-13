// ---------------------------------------------------------------------------
// Hand Share Card — gera um card PNG elegante (1080×1080) de uma mão jogada,
// com a logo oficial, cartas, board, decisão e tip do coach.
// Ideal para compartilhar no Instagram/WhatsApp.
//
// Modo "simples": recreativo — posição, stack, ação, nota, frase simples.
// Modo "tecnico": com matemática — equity, potOdds, evBB (só se existirem).
// ---------------------------------------------------------------------------
import { rankOf, suitOf, RANKS, type Card } from "../engine/cards";
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
export async function drawHandShareCard(data: HandShareData, mode: ShareCardMode = "simples"): Promise<Blob | null> {
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

  // ── TOPO: Logo oficial + título + info do torneio ──
  await drawLogoImage(ctx, S / 2, 85, 88);
  ctx.fillStyle = COLOR_GOLD;
  ctx.font = "bold 48px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CALL OU FOLD", S / 2, 178);

  // Info do torneio
  ctx.fillStyle = COLOR_CREAM_DIM;
  ctx.font = "600 26px Georgia, serif";
  ctx.fillText(data.tournamentInfo, S / 2, 220);

  // ── Linha separadora dourada ──
  ctx.strokeStyle = "rgba(212,175,55,0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(120, 255);
  ctx.lineTo(S - 120, 255);
  ctx.stroke();

  // ── CARTAS DO HERÓI ──
  // Sem board, as cartas do herói são maiores (protagonistas) e descem um pouco,
  // pra o card não ficar com um vazio grande embaixo.
  const hasBoard = data.board.length > 0;
  const cardW = hasBoard ? 148 : 188;
  const cardH = hasBoard ? 204 : 262;
  const gap = hasBoard ? 28 : 32;
  const cardsTotalW = cardW * 2 + gap;
  const cardsX = (S - cardsTotalW) / 2;
  const cardsY = hasBoard ? 268 : 300;

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

  // ── CONTEXTO DA AÇÃO ──
  const ctxY = posStackY + 36 + g;
  ctx.fillStyle = COLOR_CREAM_DIM;
  ctx.font = "600 26px Georgia, serif";
  ctx.fillText(data.street + " — " + data.context, S / 2, ctxY);

  // ── DECISÃO ──
  const decY = ctxY + 44 + g;
  ctx.fillStyle = COLOR_CREAM;
  ctx.font = "bold 38px Georgia, serif";
  ctx.fillText(`Você: ${data.heroAction}`, S / 2, decY);

  // ── VEREDITO / NOTA ──
  const verY = decY + 42 + g;

  const correct = isRatingCorrect(data.rating);
  if (mode === "simples") {
    // Chip com ícone + nota (ex.: "✓ BOA!" / "✗ ERRO")
    const label = `${correct ? "✓" : "✗"} ${ratingWord(data.rating).toUpperCase()}`;
    drawRatingChip(ctx, S / 2, verY, label, correct);
  } else {
    // Chip com veredito técnico ("✓ CORRETO" / "✗ ERROU")
    drawRatingChip(ctx, S / 2, verY, ratingVerdict(data.rating), correct);
  }

  // ── MATEMÁTICA (só no modo técnico) ──
  let statsY = verY + 40;
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

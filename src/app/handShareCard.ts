// ---------------------------------------------------------------------------
// Hand Share Card — gera um card PNG elegante (1080×1080) de uma mão jogada,
// com a logo oficial, cartas, board, decisão e tip do coach.
// Ideal para compartilhar no Instagram/WhatsApp.
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
  const red = SUIT_RED[s];

  // Sombra sutil
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 3;

  // Carta branca com cantos arredondados
  ctx.fillStyle = COLOR_CARD_WHITE;
  roundRect(ctx, x, y, w, h, Math.min(w, h) * 0.08);
  ctx.fill();

  ctx.shadowColor = "transparent";

  // Texto da carta
  ctx.fillStyle = red ? COLOR_RED_SUIT : COLOR_BLACK_SUIT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Rank grande no topo
  ctx.font = `bold ${h * 0.38}px Georgia, serif`;
  ctx.fillText(rank, x + w / 2, y + h * 0.28);

  // Naipe grande no centro
  ctx.font = `${h * 0.42}px Georgia, serif`;
  ctx.fillText(suit, x + w / 2, y + h * 0.68);

  // Rank pequeno embaixo (sem rotação — mais limpo no card)
}

/** Carrega a logo oficial em base64 e a desenha no topo do card. */
function drawLogoImage(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Desenha a logo circular (quadrada com canto arredondado) centralizada
      const dim = size;
      const x = cx - dim / 2;
      const y = cy - dim / 2;

      // Borda circular
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
      // Fallback: desenha CF dourado
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
  /** Tip do coach (frase explicativa). */
  coachTip: string;
  /** Rua da decisão: "Preflop", "Flop", "Turn", "River". */
  street: string;
  /** Info do torneio (ex.: "Torneio $5 · Circuito Mensal · 9-max"). */
  tournamentInfo: string;
  /** Resultado do torneio, se aplicável (ex.: "8º lugar de 47"). */
  tournamentResult?: string;
  /** Contexto da ação (ex.: "Vilão aposta 1/3 pote · Stack: 25bb"). */
  context: string;
}

/**
 * Gera o Hand Share Card como PNG (1080×1080) e devolve um Blob.
 */
export async function drawHandShareCard(data: HandShareData): Promise<Blob | null> {
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

  // ── Moldura dourada fina ──
  ctx.strokeStyle = "rgba(212,175,55,0.6)";
  ctx.lineWidth = 3;
  roundRect(ctx, 30, 30, S - 60, S - 60, 24);
  ctx.stroke();

  // ── Linha dourada interna ──
  ctx.strokeStyle = "rgba(212,175,55,0.25)";
  ctx.lineWidth = 1;
  roundRect(ctx, 42, 42, S - 84, S - 84, 18);
  ctx.stroke();

  // ── TOPO: Logo oficial + título + info do torneio ──
  await drawLogoImage(ctx, S / 2, 95, 100);
  ctx.fillStyle = COLOR_GOLD;
  ctx.font = "bold 52px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CALL OU FOLD", S / 2, 195);

  // Info do torneio
  ctx.fillStyle = COLOR_CREAM_DIM;
  ctx.font = "600 30px Georgia, serif";
  ctx.fillText(data.tournamentInfo, S / 2, 242);

  // Resultado do torneio (se houver)
  if (data.tournamentResult) {
    ctx.fillStyle = COLOR_GOLD_BRIGHT;
    ctx.font = "bold 28px Georgia, serif";
    ctx.fillText(data.tournamentResult, S / 2, 280);
  }

  // ── Linha separadora dourada ──
  ctx.strokeStyle = "rgba(212,175,55,0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(120, 310);
  ctx.lineTo(S - 120, 310);
  ctx.stroke();

  // ── CARTAS DO HERÓI (2 grandes) ──
  const cardW = 180;
  const cardH = 250;
  const gap = 30;
  const cardsTotalW = cardW * 2 + gap;
  const cardsX = (S - cardsTotalW) / 2;
  const cardsY = 340;

  if (data.heroCards.length >= 1) {
    drawCardOnCanvas(ctx, data.heroCards[0], cardsX, cardsY, cardW, cardH);
  }
  if (data.heroCards.length >= 2) {
    drawCardOnCanvas(ctx, data.heroCards[1], cardsX + cardW + gap, cardsY, cardW, cardH);
  }

  // ── BOARD (se houver) ──
  if (data.board.length > 0) {
    const bCardW = 130;
    const bCardH = 180;
    const bGap = 12;
    const bTotalW = data.board.length * bCardW + (data.board.length - 1) * bGap;
    const bX = (S - bTotalW) / 2;
    const bY = cardsY + cardH + 30;

    for (let i = 0; i < data.board.length; i++) {
      drawCardOnCanvas(ctx, data.board[i], bX + i * (bCardW + bGap), bY, bCardW, bCardH);
    }
  }

  // ── CONTEXTO DA AÇÃO ──
  const ctxY = data.board.length > 0 ? 340 + 250 + 30 + 180 + 40 : 340 + 250 + 40;

  ctx.fillStyle = COLOR_CREAM_DIM;
  ctx.font = "600 28px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(data.street + " — " + data.context, S / 2, ctxY);

  // ── DECISÃO ──
  const decY = ctxY + 50;

  // Ação do herói
  ctx.fillStyle = COLOR_CREAM;
  ctx.font = "bold 42px Georgia, serif";
  ctx.fillText(`Você: ${data.heroAction}`, S / 2, decY);

  // Avaliação do coach
  const coachY = decY + 48;
  const isCorrect = data.rating === "boa" || data.rating === "ok";
  const badgeColor = isCorrect ? COLOR_GREEN_OK : COLOR_RED_ERR;
  const badgeText = isCorrect ? "✓ CORRETO" : "✗ ERROU";

  // Badge arredondado
  const badgeW = 240;
  const badgeH = 46;
  const badgeX = S / 2 - badgeW / 2;
  ctx.fillStyle = badgeColor;
  roundRect(ctx, badgeX, coachY - badgeH / 2, badgeW, badgeH, 23);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.font = "bold 26px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, S / 2, coachY);

    // ── TIP DO COACH ──
  const tipY = coachY + 55;
  // Fundo escurecido para o tip
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  roundRect(ctx, 70, tipY - 30, S - 140, 130, 12);
  ctx.fill();
  ctx.fillStyle = COLOR_CREAM;
  ctx.font = "italic 24px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Quebra o tip em até 3 linhas se necessário
  const maxTipWidth = S - 220;
  const tipWords = data.coachTip.split(" ");
  const tipLines: string[] = [];
  let currentLine = "";
  for (const word of tipWords) {
    const testWidth = ctx.measureText(currentLine + (currentLine ? " " : "") + word).width;
    if (testWidth <= maxTipWidth) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) tipLines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) tipLines.push(currentLine);
  // Limitar a 3 linhas
  const maxLines = 3;
  const displayLines = tipLines.length > maxLines
    ? [...tipLines.slice(0, maxLines - 1), tipLines.slice(maxLines - 1).join(" ") + "…"]
    : tipLines;
  const lineHeight = 30;
  const startTipY = tipY + 10;
  for (let i = 0; i < displayLines.length; i++) {
    ctx.fillText(`"${displayLines[i]}"`, S / 2, startTipY + i * lineHeight);
  }

  // ── RODAPÉ ──
  const footerY = tipY + 130 + 30;
  ctx.fillStyle = COLOR_GOLD;
  ctx.font = "600 22px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("calloufold.com.br · Grátis · sem dinheiro real", S / 2, footerY);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

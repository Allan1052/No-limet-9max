// ---------------------------------------------------------------------------
// Training Share Card — gera um card PNG (1080×1080) de um resultado de
// treino (Drill Mode, Treino de Maestria, Hand Lab).
//
// Identidade visual da marca: dourado + feltro escuro, logo oficial CF.
// ---------------------------------------------------------------------------
import { LOGO_CF_BASE64 } from "./logoCfBase64";

const COLOR_BG_DARK = "#0a1410";
const COLOR_BG_FELT = "#0d1f16";
const COLOR_GOLD = "#d4af37";
const COLOR_GOLD_BRIGHT = "#e6c454";
const COLOR_CREAM = "#ece7d5";
const COLOR_CREAM_DIM = "#b8b29a";
const COLOR_GREEN = "#2d7a3a";
const COLOR_RED = "#c0392b";
const COLOR_WHITE = "#f4f1e6";

export interface TrainingShareData {
  /** Tipo de treino: "Drill Mode", "Treino de Maestria", "Hand Lab". */
  trainingType: string;
  /** Spot/situação (ex.: "BTN vs SB 3-bet, 25bb"). */
  spot: string;
  /** Score (ex.: "22/30"). */
  score: string;
  /** Taxa de acerto (ex.: "73%"). */
  accuracy: string;
  /** Avaliação (ex.: "Intermediário", "Mestre", "Principiante"). */
  rating: string;
  /** Duração (ex.: "4min 12s"). */
  duration?: string;
  /** Mensagem extra (ex.: "Você dominou o push/fold!"). */
  extra?: string;
  /** Cartas do herói, se aplicável (ex.: Hand Lab). */
  heroCards?: string;
  /** Board, se aplicável. */
  board?: string;
  /** Ação (ex.: "CALL", "FOLD"). */
  action?: string;
  /** Equity (ex.: "45%"). */
  equity?: string;
  /** Pot odds (ex.: "33%"). */
  potOdds?: string;
}

function drawLogoImage(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const x = cx - size / 2;
      const y = cy - size / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, x, y, size, size);
      ctx.restore();
      ctx.strokeStyle = COLOR_GOLD;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2 + 1, 0, Math.PI * 2);
      ctx.stroke();
      resolve();
    };
    img.src = LOGO_CF_BASE64;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export async function drawTrainingCard(
  data: TrainingShareData,
): Promise<Blob | null> {
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

  // ── Vinheta ──
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

  // ── TOPO: Logo + título ──
  await drawLogoImage(ctx, S / 2, 85, 88);
  ctx.fillStyle = COLOR_GOLD;
  ctx.font = "bold 48px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CALL OU FOLD", S / 2, 178);

  // ── Tipo de treino (badge) ──
  ctx.fillStyle = "rgba(212,175,55,0.15)";
  const badgeW = ctx.measureText(data.trainingType).width + 60;
  roundRect(ctx, S / 2 - badgeW / 2, 215, badgeW, 44, 22);
  ctx.fill();
  ctx.strokeStyle = COLOR_GOLD;
  ctx.lineWidth = 1;
  roundRect(ctx, S / 2 - badgeW / 2, 215, badgeW, 44, 22);
  ctx.stroke();
  ctx.fillStyle = COLOR_GOLD;
  ctx.font = "bold 28px Georgia, serif";
  ctx.fillText(data.trainingType, S / 2, 237);

  // ── Spot (situação treinada) ──
  ctx.fillStyle = COLOR_CREAM;
  ctx.font = "36px Georgia, serif";
  ctx.textAlign = "center";
  const spotLines = wrapText(ctx, data.spot, S - 120);
  spotLines.forEach((line, i) => {
    ctx.fillText(line, S / 2, 310 + i * 48);
  });

  // ── Separador dourado ──
  ctx.strokeStyle = COLOR_GOLD;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(S * 0.15, 320 + spotLines.length * 48 + 15);
  ctx.lineTo(S * 0.85, 320 + spotLines.length * 48 + 15);
  ctx.stroke();

  // ── SCORE (número grande) ──
  const scoreY = 320 + spotLines.length * 48 + 80;
  ctx.fillStyle = COLOR_GOLD_BRIGHT;
  ctx.font = "bold 96px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(data.score, S / 2, scoreY);

  // ── Accuracy ──
  ctx.fillStyle = COLOR_CREAM;
  ctx.font = "36px Georgia, serif";
  ctx.fillText(`${data.accuracy} de acerto`, S / 2, scoreY + 60);

  // ── Rating badge ──
  const ratingColor = data.rating.toLowerCase().includes("mestre") || data.rating.toLowerCase().includes("avançado")
    ? COLOR_GOLD : data.rating.toLowerCase().includes("intermedi") ? COLOR_GREEN : COLOR_CREAM_DIM;
  ctx.fillStyle = ratingColor;
  ctx.font = "bold 40px Georgia, serif";
  ctx.fillText(data.rating, S / 2, scoreY + 130);

  // ── Extra / Duração ──
  if (data.extra) {
    ctx.fillStyle = COLOR_CREAM_DIM;
    ctx.font = "italic 28px Georgia, serif";
    const extraLines = wrapText(ctx, data.extra, S - 140);
    extraLines.forEach((line, i) => {
      ctx.fillText(line, S / 2, scoreY + 190 + i * 40);
    });
  }

  // ── Cartas / Board (Hand Lab) ──
  let yOffset = scoreY + 200;
  if (data.heroCards) {
    ctx.fillStyle = COLOR_WHITE;
    ctx.font = "bold 32px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`Suas cartas: ${data.heroCards}`, S / 2, yOffset);
    yOffset += 50;
  }
  if (data.board) {
    ctx.fillStyle = COLOR_WHITE;
    ctx.font = "bold 32px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`Board: ${data.board}`, S / 2, yOffset);
    yOffset += 50;
  }
  if (data.action) {
    const actionColor = data.action === "FOLD" ? COLOR_RED : data.action === "CALL" || data.action === "RAISE" ? COLOR_GREEN : COLOR_CREAM;
    ctx.fillStyle = actionColor;
    ctx.font = "bold 36px Georgia, serif";
    ctx.fillText(`Decisão: ${data.action}`, S / 2, yOffset);
    yOffset += 45;
  }
  if (data.equity && data.potOdds) {
    ctx.fillStyle = COLOR_CREAM_DIM;
    ctx.font = "28px Georgia, serif";
    ctx.fillText(`Equity: ${data.equity} · Pot odds: ${data.potOdds}`, S / 2, yOffset);
    yOffset += 40;
  }

  // ── Duração ──
  if (data.duration) {
    ctx.fillStyle = COLOR_CREAM_DIM;
    ctx.font = "24px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(`⏱ ${data.duration}`, S / 2, S - 100);
  }

  // ── RODAPÉ: URL ──
  ctx.fillStyle = COLOR_CREAM_DIM;
  ctx.font = "24px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("Treina de graça · calloufold.com.br", S / 2, S - 60);

  // ── Linha dourada inferior ──
  ctx.strokeStyle = "rgba(212,175,55,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, S - 20);
  ctx.lineTo(S - 60, S - 20);
  ctx.stroke();

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, "image/png");
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

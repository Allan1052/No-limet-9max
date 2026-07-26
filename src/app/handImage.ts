// Gera uma IMAGEM bonita de um spot (formato quadrado, ideal pra redes) — o
// visual "Call ou Fold?" que engaja no TikTok/Instagram/WhatsApp. Desenha num
// canvas e devolve um Blob PNG para compartilhar ou baixar.

import { rankOf, suitOf, RANKS, type Card } from "../engine/cards";

const SUIT_SYMBOL = ["♣", "♦", "♥", "♠"]; // ordem de SUITS = "cdhs"
const SUIT_RED = [false, true, true, false];

function drawCard(ctx: CanvasRenderingContext2D, card: Card, x: number, y: number, w: number, h: number) {
  const r = rankOf(card);
  const s = suitOf(card);
  const rank = RANKS[r - 2];
  const suit = SUIT_SYMBOL[s];
  const red = SUIT_RED[s];
  // Carta branca com cantos arredondados.
  ctx.fillStyle = "#f4f1e6";
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.fillStyle = red ? "#c0392b" : "#1a1a1a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${h * 0.42}px system-ui, sans-serif`;
  ctx.fillText(rank, x + w / 2, y + h * 0.38);
  ctx.font = `${h * 0.36}px system-ui, sans-serif`;
  ctx.fillText(suit, x + w / 2, y + h * 0.74);
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

export interface SpotImageInput {
  hand: Card[];
  title: string; // ex.: "Você desafia: Call, Fold ou Raise?"
  context: string; // ex.: "BTN · 25bb · CO abriu 2.3bb"
  question: string; // ex.: "Qual a jogada certa?"
  footer: string; // ex.: "Resolva no Call ou Fold"
}

/** Desenha o spot e devolve um PNG (1080×1080). */
export function drawSpotImage(input: SpotImageInput): Promise<Blob | null> {
  const S = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);

  // Fundo (feltro dark-gold).
  const g = ctx.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, "#1b2015");
  g.addColorStop(1, "#0d0f0d");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  // Moldura dourada.
  ctx.strokeStyle = "rgba(212,175,55,0.55)";
  ctx.lineWidth = 6;
  roundRect(ctx, 24, 24, S - 48, S - 48, 28);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#d4af37";
  ctx.font = "bold 62px system-ui, sans-serif";
  ctx.fillText("♠ Call ou Fold", S / 2, 130);

  ctx.fillStyle = "#e8e6dc";
  ctx.font = "600 40px system-ui, sans-serif";
  ctx.fillText(input.title, S / 2, 250);

  // Cartas do herói (2 grandes, centralizadas).
  const cw = 210;
  const ch = 300;
  const gap = 34;
  const totalW = cw * 2 + gap;
  const x0 = (S - totalW) / 2;
  const y0 = 320;
  if (input.hand[0] != null) drawCard(ctx, input.hand[0], x0, y0, cw, ch);
  if (input.hand[1] != null) drawCard(ctx, input.hand[1], x0 + cw + gap, y0, cw, ch);

  // Contexto.
  ctx.fillStyle = "#c9b458";
  ctx.font = "600 44px system-ui, sans-serif";
  ctx.fillText(input.context, S / 2, 730);

  // Pergunta em destaque.
  ctx.fillStyle = "#f4f1e6";
  ctx.font = "bold 56px system-ui, sans-serif";
  ctx.fillText(input.question, S / 2, 830);

  // Rodapé (CTA).
  ctx.fillStyle = "rgba(212,175,55,0.85)";
  ctx.font = "600 34px system-ui, sans-serif";
  ctx.fillText(input.footer, S / 2, 980);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

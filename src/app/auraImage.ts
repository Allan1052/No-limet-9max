// Gera uma IMAGEM (1080×1080) do momento "farmei áurea" pra compartilhar nas
// redes — o avatar do jogador com o total de áurea e o nível. Desenha num
// canvas e devolve um Blob PNG. Mesma linguagem visual do drawSpotImage.

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

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export interface AuraCardInput {
  avatarUrl: string;
  avatarColor: string;
  auraTotal: number;
  word: string; // "ÁUREA"
  tierEmoji: string;
  tierLabel: string;
  kicker: string; // "FARMEI ÁUREA"
  footer: string; // "Treine de graça · calloufold.com.br"
}

export async function drawAuraCard(input: AuraCardInput): Promise<Blob | null> {
  const S = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

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

  // Marca.
  ctx.fillStyle = "#d4af37";
  ctx.font = "bold 52px system-ui, sans-serif";
  ctx.fillText("♠ Call ou Fold", S / 2, 116);

  // Kicker "FARMEI ÁUREA".
  ctx.fillStyle = "#e6c454";
  ctx.font = "bold 44px system-ui, sans-serif";
  ctx.fillText(input.kicker, S / 2, 196);

  // Avatar com brilho dourado.
  const cx = S / 2;
  const cy = 460;
  const r = 150;
  const img = await loadImg(input.avatarUrl);
  ctx.save();
  ctx.shadowColor = "rgba(230,196,84,0.85)";
  ctx.shadowBlur = 70;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = input.avatarColor || "#e6c454";
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (img) {
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  } else {
    ctx.fillStyle = "#2a2f1f";
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = "#e6c454";
  ctx.lineWidth = 8;
  ctx.stroke();

  // Total de áurea (grande).
  ctx.fillStyle = "#e6c454";
  ctx.font = "bold 128px Georgia, 'Times New Roman', serif";
  ctx.fillText(String(input.auraTotal), S / 2, 738);
  ctx.fillStyle = "#c9b458";
  ctx.font = "600 40px system-ui, sans-serif";
  ctx.fillText(input.word, S / 2, 798);

  // Nível.
  ctx.fillStyle = "#e8e6dc";
  ctx.font = "600 46px system-ui, sans-serif";
  ctx.fillText(`${input.tierEmoji} ${input.tierLabel}`, S / 2, 888);

  // Rodapé (CTA).
  ctx.fillStyle = "rgba(212,175,55,0.85)";
  ctx.font = "600 34px system-ui, sans-serif";
  ctx.fillText(input.footer, S / 2, 984);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

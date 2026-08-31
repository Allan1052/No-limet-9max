import { drawHandShareCard, cleanCoachText, type HandShareData, type ShareCardMode } from "./handShareCard";
import { buildInstagramPremiumDecisionView, instagramPremiumLayout } from "./handShareInstagramPremium";

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("premium-card-image"));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Card de feed: mantém os dados e as cartas do renderer validado, mas reorganiza
 * a leitura para Instagram. A imagem base é usada apenas como fonte visual da
 * mesa/cartas; a decisão é redesenhada com hierarquia Você × Coach V2.
 */
export async function drawInstagramPremiumShareCard(
  data: HandShareData,
  mode: ShareCardMode = "simples",
): Promise<Blob | null> {
  const base = await drawHandShareCard(data, mode, "decisao");
  if (!base) return null;

  const W = instagramPremiumLayout.width;
  const H = instagramPremiumLayout.height;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const image = await blobToImage(base);
  const view = buildInstagramPremiumDecisionView(data);

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#08120d");
  bg.addColorStop(0.52, "#0b1711");
  bg.addColorStop(1, "#050907");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // halo sutil, sem aparência de cassino/neon exagerado
  const halo = ctx.createRadialGradient(W / 2, 420, 40, W / 2, 420, 520);
  halo.addColorStop(0, "rgba(212,175,55,0.13)");
  halo.addColorStop(1, "rgba(212,175,55,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, 920);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#e6c454";
  ctx.font = "900 52px Georgia, serif";
  ctx.fillText("CALL OU FOLD", W / 2, 68);
  ctx.fillStyle = "#a99f86";
  ctx.font = "700 22px system-ui, sans-serif";
  ctx.fillText(`${data.street.toUpperCase()} · ${data.position} · ${data.stackBB}`, W / 2, 112);

  // Recorte do renderer já validado: mão/board permanecem fiéis ao card atual,
  // mas ficam maiores e viram o principal elemento visual do post.
  const cropY = 270;
  const cropH = 430;
  const heroX = 46;
  const heroY = 148;
  const heroW = W - 92;
  const heroH = 520;
  ctx.save();
  roundRect(ctx, heroX, heroY, heroW, heroH, 28);
  ctx.clip();
  ctx.drawImage(image, 24, cropY, 1032, cropH, heroX, heroY, heroW, heroH);
  const shade = ctx.createLinearGradient(0, heroY, 0, heroY + heroH);
  shade.addColorStop(0, "rgba(0,0,0,0.02)");
  shade.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.fillStyle = shade;
  ctx.fillRect(heroX, heroY, heroW, heroH);
  ctx.restore();
  ctx.strokeStyle = "rgba(212,175,55,0.48)";
  ctx.lineWidth = 2;
  roundRect(ctx, heroX, heroY, heroW, heroH, 28);
  ctx.stroke();

  // Comparação central: a mensagem principal deve ser legível no primeiro olhar.
  const compareY = 700;
  const gap = 18;
  const boxW = (W - 92 - gap) / 2;
  const boxH = 150;
  const drawDecisionBox = (x: number, label: string, value: string, accent: string) => {
    ctx.fillStyle = "rgba(255,255,255,0.035)";
    roundRect(ctx, x, compareY, boxW, boxH, 22);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    roundRect(ctx, x, compareY, boxW, boxH, 22);
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.fillStyle = "#a99f86";
    ctx.font = "800 20px system-ui, sans-serif";
    ctx.fillText(label, x + 24, compareY + 36);
    ctx.fillStyle = "#f4efdf";
    let fs = 34;
    ctx.font = `900 ${fs}px system-ui, sans-serif`;
    while (ctx.measureText(value).width > boxW - 48 && fs > 21) {
      fs -= 1;
      ctx.font = `900 ${fs}px system-ui, sans-serif`;
    }
    ctx.fillText(value, x + 24, compareY + 94);
  };

  drawDecisionBox(46, "VOCÊ FEZ", view.heroAction.replace(/^VOCÊ:\s*/, ""), "rgba(236,231,213,0.24)");
  drawDecisionBox(46 + boxW + gap, "COACH V2", view.coachAction.replace(/^COACH V2:\s*/, ""), "#d4af37");

  // Chips: só existem quando o Motor V2 entregou a métrica.
  let chipsY = compareY + boxH + 28;
  if (view.metrics.length > 0) {
    ctx.font = "800 22px system-ui, sans-serif";
    const chipWidths = view.metrics.map((m) => ctx.measureText(m).width + 44);
    const total = chipWidths.reduce((a, b) => a + b, 0) + gap * (chipWidths.length - 1);
    let x = Math.max(46, (W - total) / 2);
    for (let i = 0; i < view.metrics.length; i++) {
      const cw = chipWidths[i];
      ctx.fillStyle = "rgba(212,175,55,0.10)";
      roundRect(ctx, x, chipsY, cw, 50, 25);
      ctx.fill();
      ctx.strokeStyle = "rgba(212,175,55,0.52)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, x, chipsY, cw, 50, 25);
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillStyle = "#e8d99b";
      ctx.fillText(view.metrics[i], x + cw / 2, chipsY + 26);
      x += cw + gap;
    }
    chipsY += 74;
  }

  // Razão curta: mantém o conteúdo do Coach, mas reduz o aspecto de relatório.
  const reasonTop = chipsY + 8;
  ctx.textAlign = "left";
  ctx.fillStyle = "#d4af37";
  ctx.font = "900 20px system-ui, sans-serif";
  ctx.fillText("POR QUÊ", 58, reasonTop);
  ctx.fillStyle = "#eee9db";
  ctx.font = "650 27px system-ui, sans-serif";
  const lines = wrap(ctx, cleanCoachText(data.coachTip), W - 116).slice(0, 4);
  let ly = reasonTop + 42;
  for (const line of lines) {
    ctx.fillText(line, 58, ly);
    ly += 36;
  }

  // Assinatura consistente da série.
  ctx.strokeStyle = "rgba(212,175,55,0.28)";
  ctx.beginPath();
  ctx.moveTo(58, H - 92);
  ctx.lineTo(W - 58, H - 92);
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.fillStyle = "#d4af37";
  ctx.font = "900 22px system-ui, sans-serif";
  ctx.fillText(view.signature, 58, H - 54);
  ctx.textAlign = "right";
  ctx.fillStyle = "#817966";
  ctx.font = "650 18px system-ui, sans-serif";
  ctx.fillText("calloufold.com.br · só estudo", W - 58, H - 54);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

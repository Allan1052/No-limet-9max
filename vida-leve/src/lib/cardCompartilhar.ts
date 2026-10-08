/**
 * Card de progresso para WhatsApp/Instagram (1080×1350, formato retrato do
 * feed). Desenhado em canvas — sem servidor, sem foto, sem peso absoluto.
 */
export interface DadosCard {
  nome: string;
  /** null = a pessoa escolheu não mostrar os quilos. */
  kgPerdidos: number | null;
  semanas: number;
  sequenciaMissoes: number;
  conquistas: number;
  emojisConquistas: string[];
}

/** Escreve centralizado; se não couber na largura, diminui a fonte. */
function textoCentro(ctx: CanvasRenderingContext2D, texto: string, y: number, fonte: string, cor: string, larguraMax = 960) {
  ctx.font = fonte;
  const px = Number(/(\d+)px/.exec(fonte)?.[1] ?? 40);
  const largura = ctx.measureText(texto).width;
  if (largura > larguraMax) ctx.font = fonte.replace(`${px}px`, `${Math.floor((px * larguraMax) / largura)}px`);
  ctx.fillStyle = cor;
  ctx.textAlign = "center";
  ctx.fillText(texto, 540, y);
}

export function frasePrincipal(d: DadosCard): { grande: string; pequena: string } {
  const sem = d.semanas <= 1 ? "na 1ª semana" : `em ${d.semanas} semanas`;
  if (d.kgPerdidos !== null && d.kgPerdidos >= 0.5) {
    return { grande: `−${d.kgPerdidos.toFixed(1).replace(".", ",")} kg`, pequena: sem };
  }
  if (d.sequenciaMissoes >= 2) return { grande: `${d.sequenciaMissoes} dias`, pequena: "seguidos cumprindo minhas missões" };
  return { grande: `${d.conquistas} conquista${d.conquistas === 1 ? "" : "s"}`, pequena: sem };
}

export async function gerarCard(d: DadosCard): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Seu navegador não conseguiu gerar a imagem.");

  const fundo = ctx.createLinearGradient(0, 0, 1080, 1350);
  fundo.addColorStop(0, "#047857");
  fundo.addColorStop(1, "#0284c7");
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, 1080, 1350);

  // círculos decorativos
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  for (const [x, y, r] of [[900, 180, 260], [120, 1180, 300], [980, 1100, 140]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const fonte = (peso: number, px: number) => `${peso} ${px}px Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
  textoCentro(ctx, "🌱 Vida Leve", 170, fonte(700, 52), "rgba(255,255,255,0.9)");
  textoCentro(ctx, `${d.nome.split(" ")[0]} está mudando de hábitos`, 300, fonte(600, 46), "#ffffff");

  const { grande, pequena } = frasePrincipal(d);
  textoCentro(ctx, grande, 620, fonte(800, 190), "#ffffff");
  textoCentro(ctx, pequena, 720, fonte(500, 52), "rgba(255,255,255,0.9)");

  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.beginPath();
  ctx.roundRect(140, 820, 800, 200, 40);
  ctx.fill();
  textoCentro(
    ctx,
    `🔥 ${d.sequenciaMissoes} ${d.sequenciaMissoes === 1 ? "dia" : "dias"} de missões   ·   🏅 ${d.conquistas} ${d.conquistas === 1 ? "conquista" : "conquistas"}`,
    905,
    fonte(600, 40),
    "#ffffff",
    740,
  );
  textoCentro(ctx, d.emojisConquistas.slice(0, 8).join("  "), 980, fonte(400, 50), "#ffffff");

  textoCentro(ctx, "Uma semana por vez. 💚", 1180, fonte(600, 46), "#ffffff");
  textoCentro(ctx, "Sem dieta maluca: água, proteína e pequenos hábitos.", 1250, fonte(400, 34), "rgba(255,255,255,0.85)");

  return new Promise((ok, erro) => canvas.toBlob((b) => (b ? ok(b) : erro(new Error("Falha ao gerar a imagem."))), "image/png"));
}

/** Compartilha (celular) ou baixa (computador). */
export async function compartilharImagem(blob: Blob, nomeArquivo = "vida-leve-progresso.png"): Promise<"compartilhado" | "baixado"> {
  const arquivo = new File([blob], nomeArquivo, { type: "image/png" });
  if (navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], text: "Meu progresso no Vida Leve 💚" });
      return "compartilhado";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "compartilhado";
    }
  }
  baixarArquivo(blob, nomeArquivo);
  return "baixado";
}

export function baixarArquivo(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

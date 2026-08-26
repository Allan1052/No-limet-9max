// ---------------------------------------------------------------------------
// Gerador de cards do Instagram — EMBUTIDO no app (rodando no celular do Allan).
//
// A ideia (pedido do Allan): um botão ESCONDIDO — só ele vê, via URL secreta —
// que gera os cards da série "A mesma mão, 3 fases" direto no celular. Assim ele
// ajusta os cards até ficarem bons, sem gastar créditos gerando fora do app.
//
// Como funciona, 100% no navegador (sem libs externas, sem rede):
//   1. `analyzeHand` roda a MESMA mão vs all-in em 3 estágios (início/bolha/mesa
//      final) — os dados do card vêm do MOTOR, nunca inventados.
//   2. Montamos o card como SVG PURO (<text>/<rect>) — NÃO foreignObject: o
//      Chrome NÃO rasteriza HTML dentro de <img> por segurança (fica em branco).
//      SVG puro com só texto/formas rasteriza sempre e não "suja" (taint) o canvas.
//   3. SVG → <img> → <canvas> → PNG. Fontes do sistema (serifa) → sem webfont.
//
// Formato: 1080×1920 (9:16, feed/story do Instagram).
// ---------------------------------------------------------------------------
import { rankOf, suitOf, type Card } from "../engine/cards";
import { analyzeHand, type HandLabSpec } from "../train/stage";

const CARD_W = 1080;
const CARD_H = 1920;
const SERIF = "Georgia, 'Times New Roman', serif";

const RANK_CH = "23456789TJQKA";
const SUIT_GLYPH = ["♣", "♦", "♥", "♠"]; // índice = suitOf (0=c,1=d,2=h,3=s)

// Paleta (mesma do card3f de referência).
const C = {
  bgTop: "#14251b",
  bgMid: "#0d1f16",
  bgBot: "#070f0b",
  gold: "#e6c454",
  goldDim: "#c9a227",
  border: "#6b551d",
  border2: "#7a5f1e",
  ink: "#efe9d8",
  cream: "#cbbf9a",
  muted: "#9a8f6a",
  faint: "#4a3d17",
  body: "#d8d2bd",
  call: "#57b06a",
  fold: "#e07b6b",
  red: "#d3564a",
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Uma carta → glifo colorido (naipe vermelho em ouros/copas). */
function cardParts(c: Card): { r: string; suit: string; red: boolean } {
  const s = suitOf(c);
  return { r: RANK_CH[rankOf(c) - 2], suit: SUIT_GLYPH[s], red: s === 1 || s === 2 };
}

/** Duas cartas → "K♠Q♠" (texto puro, para o selo). */
function handPlain(cards: Card[]): string {
  return cards.map((c) => RANK_CH[rankOf(c) - 2] + SUIT_GLYPH[suitOf(c)]).join("");
}

/** Quebra o texto em linhas de no máximo `max` caracteres (por palavras). */
function wrap(text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur.length === 0) cur = w;
    else if ((cur + " " + w).length <= max) cur += " " + w;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** <text> multi-linha centralizado (cada linha um <tspan>). */
function multiline(
  lines: string[],
  x: number,
  y: number,
  lineH: number,
  attrs: string,
): string {
  const tspans = lines
    .map((ln, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : lineH}">${esc(ln)}</tspan>`)
    .join("");
  return `<text x="${x}" y="${y}" ${attrs}>${tspans}</text>`;
}

/** Retângulo arredondado com borda. */
function box(x: number, y: number, w: number, h: number, opts: { fill?: string; stroke?: string; sw?: number; r?: number } = {}): string {
  const { fill = "none", stroke = C.border, sw = 1.5, r = 18 } = opts;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

interface PhaseCopy {
  label: string;
  action: string;
  sub: string;
  why: string;
  key: string;
  isCall: boolean;
}

/** Texto compacto por fase (call/fold vs all-in) — templado pela decisão do motor. */
function phaseCopy(stage: "inicio" | "bolha" | "mesa_final", recommended: string, hand: string, stack: number): PhaseCopy {
  const isCall = recommended === "call";
  const act = isCall ? "CALL" : "FOLD";
  if (stage === "inicio") {
    return {
      label: "INÍCIO",
      action: act,
      sub: `${stack}bb · sem ICM`,
      why: isCall
        ? `Sem pressão de prêmio, ${hand} paga o shove pelas odds — é conta de fichas pura.`
        : `Mesmo sem ICM, ${hand} não alcança o preço contra o range de all-in — foldar é +EV.`,
      key: isCall ? "o preço manda" : "não paga o preço",
      isCall,
    };
  }
  if (stage === "bolha") {
    return {
      label: "BOLHA",
      action: act,
      sub: `${stack}bb · ICM no talo`,
      why: isCall
        ? `Mesmo com o ICM no talo, ${hand} é forte o bastante pra pagar o shove.`
        : `Bustar aqui = ganhar zero. O ICM sobe o preço exigido e ${hand} deixa de pagar.`,
      key: isCall ? "premium paga assim mesmo" : "preservar > dobrar",
      isCall,
    };
  }
  return {
    label: "MESA FINAL",
    action: act,
    sub: `${stack}bb · já no $`,
    why: isCall
      ? `Já premiado, o ICM afrouxa em relação à bolha — o preço fecha e ${hand} paga.`
      : `No dinheiro, mas o ICM ainda pesa: ${hand} fica abaixo do preço e foldar preserva prêmio.`,
    key: isCall ? "menos ICM que a bolha" : "escolha as brigas",
    isCall,
  };
}

/** Monta o SVG completo do card "A mesma mão, 3 fases" a partir do spec. */
export function buildThreeFasesSvg(spec: HandLabSpec): string {
  const hand = handPlain(spec.hand);
  const stack = Math.round(spec.stackBB);
  const stages: ("inicio" | "bolha" | "mesa_final")[] = ["inicio", "bolha", "mesa_final"];
  const phases = stages.map((st) => {
    const a = analyzeHand({ ...spec, stage: st, situation: "vsallin" });
    return phaseCopy(st, a.recommended, a.handType, stack);
  });

  const parts: string[] = [];

  // ---- fundo ----
  parts.push(
    `<defs><radialGradient id="bg" cx="50%" cy="0%" r="120%">` +
    `<stop offset="0%" stop-color="${C.bgTop}"/><stop offset="45%" stop-color="${C.bgMid}"/><stop offset="100%" stop-color="${C.bgBot}"/></radialGradient>` +
    `<pattern id="grid" width="54" height="54" patternUnits="userSpaceOnUse">` +
    `<path d="M54 0H0V54" fill="none" stroke="${C.gold}" stroke-width="1" opacity="0.06"/></pattern></defs>`,
  );
  parts.push(`<rect width="${CARD_W}" height="${CARD_H}" fill="url(#bg)"/>`);
  parts.push(`<rect width="${CARD_W}" height="${CARD_H}" fill="url(#grid)"/>`);
  parts.push(box(24, 24, CARD_W - 48, CARD_H - 48, { stroke: C.border, sw: 1.5, r: 26 }));

  const M = 44; // margem lateral
  const IW = CARD_W - M * 2; // largura útil

  // ---- header ----
  const hy = 44;
  const hh = 100;
  parts.push(box(M, hy, IW, hh, { stroke: C.border2, r: 18, fill: "rgba(230,196,84,0.05)" }));
  // logo CF
  parts.push(box(M + 24, hy + 24, 78, 52, { stroke: C.border, sw: 2, r: 8 }));
  parts.push(`<text x="${M + 63}" y="${hy + 60}" font-family="${SERIF}" font-size="40" font-weight="900" fill="${C.gold}" text-anchor="middle">CF</text>`);
  parts.push(`<text x="${M + 118}" y="${hy + 48}" font-family="${SERIF}" font-size="34" font-weight="800" fill="${C.ink}">Call<tspan font-style="italic" font-weight="600" font-size="26" fill="${C.cream}"> ou </tspan>Fold</text>`);
  parts.push(`<text x="${M + 120}" y="${hy + 78}" font-family="${SERIF}" font-size="13" letter-spacing="3" fill="${C.muted}">AQUI É POSSÍVEL</text>`);
  parts.push(`<text x="${CARD_W - M - 24}" y="${hy + 42}" font-family="${SERIF}" font-size="22" font-weight="800" letter-spacing="2" fill="${C.gold}" text-anchor="end">ESTUDO · MTT · DECISÃO</text>`);
  parts.push(`<text x="${CARD_W - M - 24}" y="${hy + 74}" font-family="${SERIF}" font-size="20" fill="${C.cream}" text-anchor="end">feito por um recreativo</text>`);

  // ---- série + selo ----
  const cx = CARD_W / 2;
  parts.push(`<text x="${cx}" y="${hy + hh + 66}" font-family="${SERIF}" font-size="26" font-weight="800" letter-spacing="4" fill="${C.gold}" text-anchor="middle">— A MESMA MÃO, 3 FASES —</text>`);
  const sealText = `MTT 9-MAX · ${hand} · ${stack}BB · vs ALL-IN`;
  const sealW = Math.min(IW, sealText.length * 15 + 52);
  const sealY = hy + hh + 92;
  parts.push(box(cx - sealW / 2, sealY, sealW, 52, { stroke: C.border, sw: 1, r: 14, fill: "rgba(230,196,84,0.04)" }));
  parts.push(`<text x="${cx}" y="${sealY + 34}" font-family="${SERIF}" font-size="22" font-weight="700" letter-spacing="1.5" fill="${C.cream}" text-anchor="middle">${esc(sealText)}</text>`);

  // ---- mão (título) ----
  const maoY = sealY + 118;
  // cartas coloridas centralizadas + " — a mesma decisão"
  const cs = spec.hand.map(cardParts);
  const cardStr = cs
    .map((p) => `<tspan fill="${C.ink}">${p.r}</tspan><tspan fill="${p.red ? C.red : C.ink}">${p.suit}</tspan>`)
    .join("");
  parts.push(`<text x="${cx}" y="${maoY}" font-family="${SERIF}" font-size="46" font-weight="800" text-anchor="middle">${cardStr}<tspan fill="${C.ink}"> — a mesma decisão</tspan></text>`);
  parts.push(`<text x="${cx}" y="${maoY + 56}" font-family="${SERIF}" font-size="46" font-weight="800" fill="${C.ink}" text-anchor="middle">em três momentos do torneio</text>`);

  // ---- colunas ----
  const colGap = 20;
  const colW = (IW - colGap * 2) / 3;
  const colY = maoY + 112;
  const colH = 968;
  const colHeadColor = [C.cream, C.gold, C.cream];
  phases.forEach((p, i) => {
    const x = M + i * (colW + colGap);
    parts.push(box(x, colY, colW, colH, { stroke: C.border, r: 18, fill: "rgba(255,255,255,0.015)" }));
    const ccx = x + colW / 2;
    // título + divisória
    parts.push(`<text x="${ccx}" y="${colY + 44}" font-family="${SERIF}" font-size="26" font-weight="800" letter-spacing="1.5" fill="${colHeadColor[i]}" text-anchor="middle">${esc(p.label)}</text>`);
    parts.push(`<line x1="${x + 20}" y1="${colY + 62}" x2="${x + colW - 20}" y2="${colY + 62}" stroke="${C.faint}" stroke-width="1"/>`);
    // ação
    parts.push(`<text x="${ccx}" y="${colY + 128}" font-family="${SERIF}" font-size="46" font-weight="900" fill="${p.isCall ? C.call : C.fold}" text-anchor="middle">${p.action}</text>`);
    // sub
    parts.push(`<text x="${ccx}" y="${colY + 162}" font-family="${SERIF}" font-size="18" font-weight="700" fill="${C.goldDim}" text-anchor="middle">${esc(p.sub)}</text>`);
    // key box (rodapé da coluna)
    const kbH = 86;
    const kbY = colY + colH - kbH - 24;
    parts.push(box(x + 20, kbY, colW - 40, kbH, { stroke: "#5a4a1c", sw: 1, r: 12, fill: "rgba(230,196,84,0.05)" }));
    parts.push(`<text x="${ccx}" y="${kbY + 30}" font-family="${SERIF}" font-size="13" font-weight="800" letter-spacing="2" fill="${C.goldDim}" text-anchor="middle">PONTO-CHAVE</text>`);
    const keyLines = wrap(p.key, 20);
    parts.push(multiline(keyLines, ccx, kbY + 58, 24, `font-family="${SERIF}" font-size="19" font-weight="700" fill="${C.ink}" text-anchor="middle"`));
    // why (wrapped) — centralizado verticalmente entre o sub e o ponto-chave
    const whyLines = wrap(p.why, 24);
    const lineH = 34;
    const availTop = colY + 190;
    const availBot = kbY - 20;
    const startY = (availTop + availBot) / 2 - ((whyLines.length - 1) * lineH) / 2;
    parts.push(multiline(whyLines, ccx, startY, lineH, `font-family="${SERIF}" font-size="21" fill="${C.body}" text-anchor="middle"`));
  });

  // ---- âncora ----
  const anY = colY + colH + 40;
  const anH = 150;
  parts.push(box(M, anY, IW, anH, { stroke: C.border2, sw: 1, r: 18, fill: "rgba(230,196,84,0.05)" }));
  parts.push(`<text x="${cx}" y="${anY + 56}" font-family="${SERIF}" font-size="32" font-weight="700" fill="${C.gold}" text-anchor="middle">Pot odds dizem quanto você precisa ganhar;</text>`);
  parts.push(`<text x="${cx}" y="${anY + 98}" font-family="${SERIF}" font-size="32" font-weight="700" fill="${C.gold}" text-anchor="middle">o ICM diz quanto custa ser eliminado.</text>`);
  parts.push(`<text x="${cx}" y="${anY + 130}" font-family="${SERIF}" font-size="16" font-style="italic" fill="#8a7f5a" text-anchor="middle">frase-âncora fixa da série</text>`);

  // ---- CTA ----
  const ctaY = anY + anH + 24;
  const ctaH = 68;
  parts.push(box(M, ctaY, IW, ctaH, { stroke: C.border2, sw: 1, r: 16 }));
  parts.push(`<text x="${cx}" y="${ctaY + 44}" font-family="${SERIF}" font-size="26" font-weight="800" letter-spacing="2" fill="${C.gold}" text-anchor="middle">▶ TREINE O MESMO SPOT NO APP</text>`);

  // ---- footer ----
  const ftY = ctaY + ctaH + 16;
  const ftH = 60;
  parts.push(box(M, ftY, IW, ftH, { stroke: C.faint, sw: 1, r: 14 }));
  parts.push(`<text x="${M + 26}" y="${ftY + 38}" font-family="${SERIF}" font-size="20" font-weight="700" fill="${C.muted}">UMA MÃO POR VEZ · SÓ ESTUDO</text>`);
  parts.push(`<text x="${CARD_W - M - 26}" y="${ftY + 38}" font-family="${SERIF}" font-size="20" font-weight="700" fill="${C.gold}" text-anchor="end">calloufold.com.br</text>`);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">` +
    parts.join("") +
    `</svg>`
  );
}

/** SVG do card → PNG Blob, tudo no navegador (canvas). */
export function svgToPngBlob(svg: string, scale = 1): Promise<Blob> {
  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = CARD_W * scale;
      canvas.height = CARD_H * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("sem contexto 2D"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("toBlob falhou"));
      }, "image/png");
    };
    img.onerror = () => reject(new Error("falha ao carregar SVG"));
    img.src = url;
  });
}

/** Dispara o download de um Blob (salva na galeria/arquivos do celular). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Gera e baixa o card "3 fases" do spec atual. Retorna o nome do arquivo. */
export async function generateThreeFasesCard(spec: HandLabSpec): Promise<string> {
  const svg = buildThreeFasesSvg(spec);
  const blob = await svgToPngBlob(svg);
  const name = `cof-3fases-${handPlain(spec.hand)}-${Math.round(spec.stackBB)}bb.png`;
  downloadBlob(blob, name);
  return name;
}

// ---------------------------------------------------------------------------
// Flag do botão escondido — só quem tem a URL secreta ativa.
// ---------------------------------------------------------------------------
const GEN_FLAG = "cof-gen";
const GEN_CODE = "allan"; // ?gen=allan liga; ?gen=off desliga

/** Lê a URL: ?gen=allan liga o gerador (persistente); ?gen=off desliga. */
export function syncGenFlagFromUrl(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const g = params.get("gen");
    if (g === GEN_CODE) localStorage.setItem(GEN_FLAG, "1");
    else if (g === "off") localStorage.removeItem(GEN_FLAG);
  } catch {
    /* localStorage indisponível — ignora */
  }
}

/** O gerador está ligado neste aparelho? */
export function isGenEnabled(): boolean {
  try {
    return localStorage.getItem(GEN_FLAG) === "1";
  } catch {
    return false;
  }
}

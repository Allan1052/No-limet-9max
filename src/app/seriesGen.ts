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
import { analyzeHand, phasePressureLabel, type HandLabSpec } from "../train/stage";

const CARD_W = 1080;
const CARD_H = 1920;
const SERIF = "Georgia, 'Times New Roman', serif";
const OFFICIAL_LOGO_HREF = "/logo.png";

interface OfficialLogoPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SvgToPngOptions {
  officialLogo?: OfficialLogoPlacement;
}

const THREE_PHASES_LOGO: OfficialLogoPlacement = { x: 62, y: 52, width: 306, height: 84 };
const FOUR_PHASES_LOGO: OfficialLogoPlacement = { x: 66, y: 56, width: 306, height: 90 };

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
  // A assinatura oficial é composta no canvas após o SVG rasterizar.
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

/** Carrega uma imagem do mesmo domínio para a composição final do card. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`falha ao carregar ${src}`));
    image.src = src;
  });
}

/** Desenha uma imagem dentro de uma caixa, preservando a proporção oficial. */
function drawContainedImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  placement: OfficialLogoPlacement,
  scale: number,
): void {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) throw new Error("logo oficial sem dimensões");

  const ratio = Math.min(placement.width / sourceWidth, placement.height / sourceHeight);
  const drawWidth = sourceWidth * ratio;
  const drawHeight = sourceHeight * ratio;
  const drawX = placement.x + (placement.width - drawWidth) / 2;
  const drawY = placement.y + (placement.height - drawHeight) / 2;
  ctx.drawImage(image, drawX * scale, drawY * scale, drawWidth * scale, drawHeight * scale);
}

/** SVG do card → PNG Blob, tudo no navegador (canvas). */
export function svgToPngBlob(svg: string, scale = 1, options: SvgToPngOptions = {}): Promise<Blob> {
  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      void (async () => {
        const canvas = document.createElement("canvas");
        canvas.width = CARD_W * scale;
        canvas.height = CARD_H * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("sem contexto 2D");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        if (options.officialLogo) {
          const logo = await loadImage(OFFICIAL_LOGO_HREF);
          drawContainedImage(ctx, logo, options.officialLogo, scale);
        }

        const blob = await new Promise<Blob>((resolveBlob, rejectBlob) => {
          canvas.toBlob((nextBlob) => {
            if (nextBlob) resolveBlob(nextBlob);
            else rejectBlob(new Error("toBlob falhou"));
          }, "image/png");
        });
        resolve(blob);
      })().catch(reject);
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
  const blob = await svgToPngBlob(svg, 1, { officialLogo: THREE_PHASES_LOGO });
  const name = `cof-3fases-${handPlain(spec.hand)}-${Math.round(spec.stackBB)}bb.png`;
  downloadBlob(blob, name);
  return name;
}

// ---------------------------------------------------------------------------
// CARD DE RESPOSTA DE QUIZ — "a resposta nas 4 fases do torneio".
// A mesma mão avaliada em Início · Meio · Bolha · Mesa Final, com a AÇÃO do
// motor por fase. Serve pra postar o "reveal" de um quiz do Instagram.
// ---------------------------------------------------------------------------

const POS_PHRASE: Record<string, string> = {
  BB: "no Big Blind",
  SB: "no Small Blind",
  BTN: "no Button",
  CO: "no Cutoff",
  HJ: "no Hijack",
  LJ: "no Lojack",
  MP: "no Meio",
  UTG1: "em UTG+1",
  UTG: "em UTG",
};

/** Desenha uma carta de baralho (naipe colorido). */
function drawCard(x: number, y: number, c: Card): string {
  const p = cardParts(c);
  const w = 150, h = 210;
  const col = p.red ? C.red : "#16130c";
  return (
    box(x, y, w, h, { fill: "#f4f1e6", stroke: C.gold, sw: 3, r: 16 }) +
    `<text x="${x + 18}" y="${y + 52}" font-family="${SERIF}" font-size="46" font-weight="800" fill="${col}">${p.r}</text>` +
    `<text x="${x + 20}" y="${y + 92}" font-family="${SERIF}" font-size="34" fill="${col}">${p.suit}</text>` +
    `<text x="${x + w / 2}" y="${y + h / 2 + 40}" font-family="${SERIF}" font-size="96" fill="${col}" text-anchor="middle">${p.suit}</text>` +
    `<text x="${x + w - 18}" y="${y + h - 24}" font-family="${SERIF}" font-size="46" font-weight="800" fill="${col}" text-anchor="end">${p.r}</text>`
  );
}

/** Ação do motor → rótulo + cor para o badge. */
function actionBadge(action: string): { label: string; color: string } {
  if (action === "fold") return { label: "FOLD", color: C.fold };
  if (action === "call") return { label: "CALL", color: C.call };
  if (action === "allin") return { label: "ALL-IN", color: C.gold };
  return { label: "RAISE", color: C.gold };
}


const SITUATION_SHORT: Record<string, string> = {
  open: "VOCÊ ABRE",
  vsopen: "VILÃO ABRIU",
  vs3bet: "VILÃO 3-BETOU",
  vsallin: "VILÃO ALL-IN",
};


// ---------------------------------------------------------------------------
// CLASSIFICADOR — decide AUTOMATICAMENTE qual card cabe no spot.
//
// A regra (pedido do Allan, pra gerar tudo automático sem sair nonsense):
//   • "4 fases" (história do ICM) só cabe quando o stack é CURTO o bastante pra
//     existir em QUALQUER fase (≤ ~25bb) E a decisão MUDA entre as fases. Um
//     stack fundo (200bb) não pode estar na bolha/mesa final — então nunca vira
//     card de 4 fases.
//   • Senão → "decisão única": uma resposta só, com o porquê e a alternativa.
// ---------------------------------------------------------------------------
const FASES_MAX_BB = 25; // acima disso o stack não "cabe" nas fases finais (sem ICM real)

export interface CardClassification {
  kind: "fases" | "unica";
  /** A decisão muda entre as 4 fases? */
  flips: boolean;
  /** O stack é curto o bastante pra caber em todas as fases? */
  shortEnough: boolean;
  /** As 4 decisões (início/meio/bolha/mesa_final), na ordem. */
  decisions: string[];
  /** Explicação legível da escolha. */
  reason: string;
}

/** Olha o spot e decide qual card usar (e por quê). Puro — só lê o motor. */
export function classifyCardSpot(spec: HandLabSpec): CardClassification {
  const stages: ("inicio" | "meio" | "bolha" | "mesa_final")[] = ["inicio", "meio", "bolha", "mesa_final"];
  const decisions = stages.map((st) => analyzeHand({ ...spec, stage: st }).recommended);
  const flips = new Set(decisions).size > 1;
  const shortEnough = spec.stackBB <= FASES_MAX_BB;
  const kind: "fases" | "unica" = flips && shortEnough ? "fases" : "unica";
  let reason: string;
  if (kind === "fases") {
    reason = `Stack curto (${Math.round(spec.stackBB)}bb) e a decisão muda pelas fases — o ICM conta a história.`;
  } else if (!shortEnough) {
    reason = `Stack fundo (${Math.round(spec.stackBB)}bb): não cabe na bolha/mesa final e o ICM quase não pesa — decisão única.`;
  } else {
    reason = `A decisão é a mesma nas 4 fases (${decisions[0].toUpperCase()}) — não há flip de ICM, decisão única.`;
  }
  return { kind, flips, shortEnough, decisions, reason };
}

/** Card de DECISÃO ÚNICA — uma resposta grande + porquê + a alternativa. */
export function buildSingleAnswerSvg(spec: HandLabSpec): string {
  const a = analyzeHand(spec);
  const b = actionBadge(a.recommended);
  const stack = Math.round(spec.stackBB);
  const cs = spec.hand.map(cardParts);
  const handColored = cs.map((p) => `<tspan fill="${C.ink}">${p.r}</tspan><tspan fill="${p.red ? C.red : C.ink}">${p.suit}</tspan>`).join("");
  const posPhrase = POS_PHRASE[spec.heroPosition] ?? spec.heroPosition;
  const P: string[] = [];
  const cx = CARD_W / 2, M = 44, IW = CARD_W - 88;

  P.push(
    `<defs><radialGradient id="bg" cx="50%" cy="0%" r="120%"><stop offset="0%" stop-color="${C.bgTop}"/><stop offset="45%" stop-color="${C.bgMid}"/><stop offset="100%" stop-color="${C.bgBot}"/></radialGradient>` +
    `<pattern id="grid" width="54" height="54" patternUnits="userSpaceOnUse"><path d="M54 0H0V54" fill="none" stroke="${C.gold}" stroke-width="1" opacity="0.06"/></pattern></defs>`,
  );
  P.push(`<rect width="${CARD_W}" height="${CARD_H}" fill="url(#bg)"/><rect width="${CARD_W}" height="${CARD_H}" fill="url(#grid)"/>`);
  P.push(box(24, 24, CARD_W - 48, CARD_H - 48, { r: 26 }));
  // header (logo oficial é composto depois; aqui só o lado direito)
  P.push(box(M, 44, IW, 100, { stroke: C.border2, r: 18, fill: "rgba(230,196,84,0.05)" }));
  P.push(`<text x="${CARD_W - M - 24}" y="86" font-family="${SERIF}" font-size="22" font-weight="800" letter-spacing="2" fill="${C.gold}" text-anchor="end">ESTUDO · MTT · DECISÃO</text>`);
  P.push(`<text x="${CARD_W - M - 24}" y="118" font-family="${SERIF}" font-size="20" fill="${C.cream}" text-anchor="end">feito por um recreativo</text>`);
  // eyebrow + título + cartas
  P.push(`<text x="${cx}" y="230" font-family="${SERIF}" font-size="26" font-weight="800" letter-spacing="5" fill="${C.gold}" text-anchor="middle">✔ A RESPOSTA</text>`);
  P.push(`<text x="${cx}" y="298" font-family="${SERIF}" font-size="52" font-weight="900" text-anchor="middle">${handColored}<tspan fill="${C.ink}"> ${esc(posPhrase.toUpperCase())}</tspan></text>`);
  P.push(drawCard(cx - 160, 340, spec.hand[0]));
  P.push(drawCard(cx + 10, 340, spec.hand[1]));
  // selo do spot
  const seal = `MTT · ${STAGE_UP[spec.stage]} · ${stack}BB · ${SITUATION_SHORT[spec.situation]}`;
  P.push(box(cx - 280, 576, 560, 48, { stroke: C.border, sw: 1, r: 14, fill: "rgba(230,196,84,0.04)" }));
  P.push(`<text x="${cx}" y="608" font-family="${SERIF}" font-size="20" font-weight="700" letter-spacing="1" fill="${C.cream}" text-anchor="middle">${esc(seal)}</text>`);
  // Rótulo honesto de pressão (chip-EV vs ICM) da fase
  P.push(`<text x="${cx}" y="656" font-family="${SERIF}" font-size="19" font-weight="700" fill="${C.goldDim}" text-anchor="middle">${esc(phasePressureLabel(spec.stage).tag)}</text>`);
  // BADGE gigante
  P.push(`<text x="${cx}" y="790" font-family="${SERIF}" font-size="140" font-weight="900" fill="${b.color}" text-anchor="middle">${b.label}</text>`);
  // POR QUÊ
  const whyY = 850;
  P.push(box(M, whyY, IW, 210, { stroke: C.border, r: 18, fill: "rgba(255,255,255,0.015)" }));
  P.push(`<text x="${M + 28}" y="${whyY + 44}" font-family="${SERIF}" font-size="20" font-weight="800" letter-spacing="2" fill="${C.goldDim}">POR QUÊ</text>`);
  const simpleTrim = a.simple.replace(/^Era [A-ZÀ-Ú-]+\.\s*/, ""); // tira o "Era CALL." do começo
  P.push(multiline(wrap(simpleTrim, 52).slice(0, 4), M + 28, whyY + 88, 38, `font-family="${SERIF}" font-size="24" fill="${C.body}"`));
  // POR QUE NÃO a alternativa
  if (a.whyNot) {
    const wnY = whyY + 240;
    P.push(box(M, wnY, IW, 200, { stroke: C.border2, r: 18, fill: "rgba(224,123,107,0.06)" }));
    P.push(`<text x="${M + 28}" y="${wnY + 44}" font-family="${SERIF}" font-size="20" font-weight="800" letter-spacing="2" fill="${C.fold}">POR QUE NÃO ${esc(a.whyNot.label)}?</text>`);
    P.push(multiline(wrap(a.whyNot.text, 52).slice(0, 4), M + 28, wnY + 88, 38, `font-family="${SERIF}" font-size="24" fill="${C.body}"`));
  }
  // âncora
  const anY = 1560;
  P.push(box(M, anY, IW, 140, { stroke: C.border2, sw: 1, r: 18, fill: "rgba(230,196,84,0.05)" }));
  P.push(multiline(wrap(a.anchor.replace(/^💡\s*/, ""), 46), cx, anY + 56, 40, `font-family="${SERIF}" font-size="27" font-weight="700" fill="${C.gold}" text-anchor="middle"`));
  // cta + footer
  const ctaY = anY + 168;
  P.push(box(M, ctaY, IW, 68, { stroke: C.border2, sw: 1, r: 16 }));
  P.push(`<text x="${cx}" y="${ctaY + 44}" font-family="${SERIF}" font-size="26" font-weight="800" letter-spacing="2" fill="${C.gold}" text-anchor="middle">▶ TREINE ESSE SPOT NO APP</text>`);
  const ftY = ctaY + 84;
  P.push(box(M, ftY, IW, 60, { stroke: C.faint, sw: 1, r: 14 }));
  P.push(`<text x="${M + 26}" y="${ftY + 38}" font-family="${SERIF}" font-size="20" font-weight="700" fill="${C.muted}">UMA MÃO POR VEZ · SÓ ESTUDO</text>`);
  P.push(`<text x="${CARD_W - M - 26}" y="${ftY + 38}" font-family="${SERIF}" font-size="20" font-weight="700" fill="${C.gold}" text-anchor="end">calloufold.com.br</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">` + P.join("") + `</svg>`;
}

const STAGE_UP: Record<string, string> = {
  inicio: "INÍCIO",
  meio: "MEIO",
  bolha: "BOLHA",
  mesa_final: "MESA FINAL",
};

/**
 * Gera o card CERTO automaticamente: o classificador decide entre "4 fases" e
 * "decisão única". Retorna o nome do arquivo e qual card foi usado.
 */
export async function generateAutoCard(spec: HandLabSpec): Promise<{ name: string; kind: "fases" | "unica" }> {
  const cls = classifyCardSpot(spec);
  // "fases" usa o card POLIDO da Manus (buildFourFasesInstagramSvg); "unica" usa
  // o card de decisão única. Card 4 fases é ÚNICO agora — meu protótipo saiu.
  const svg = cls.kind === "fases" ? buildFourFasesInstagramSvg(spec) : buildSingleAnswerSvg(spec);
  const blob = await svgToPngBlob(svg, 1, { officialLogo: FOUR_PHASES_LOGO });
  const tag = cls.kind === "fases" ? "4fases" : "decisao";
  const name = `cof-${tag}-${handPlain(spec.hand)}-${Math.round(spec.stackBB)}bb.png`;
  downloadBlob(blob, name);
  return { name, kind: cls.kind };
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


// ---------------------------------------------------------------------------
// Card de resposta Instagram — 4 fases.
// Evolução do gerador privado anterior: mantém o mesmo renderer SVG determinístico,
// mas usa quatro estágios oficiais e a hierarquia de contraste aprovada no card A7s.
// ---------------------------------------------------------------------------

const C4 = {
  bgTop: "#1b3829",
  bgMid: "#103022",
  bgBot: "#081a12",
  panel: "#1d3b2b",
  panelSoft: "#244734",
  gold: "#f2cf5b",
  goldDim: "#d8b644",
  border: "#a58532",
  borderSoft: "#6f8b5c",
  ink: "#fbf7ea",
  cream: "#e6ddc7",
  muted: "#b9c3ae",
  body: "#f5f2e8",
  call: "#3bdd7b",
  fold: "#ff8b7a",
  other: "#f2cf5b",
};

type FourStage = "inicio" | "meio" | "bolha" | "mesa_final";

interface FourPhaseCopy {
  label: string;
  action: string;
  sub: string;
  why: string;
  tone: "call" | "fold" | "other";
}

function actionLabel(action: string): string {
  if (action === "allin") return "ALL-IN";
  return action.toUpperCase();
}

function actionTone(action: string): FourPhaseCopy["tone"] {
  if (action === "call") return "call";
  if (action === "fold") return "fold";
  return "other";
}

function phaseLabel(stage: FourStage): string {
  return {
    inicio: "INÍCIO",
    meio: "MEIO",
    bolha: "BOLHA",
    mesa_final: "MESA FINAL",
  }[stage];
}

function phaseSub(stage: FourStage): string {
  return {
    inicio: "sem pressão de ICM",
    meio: "ICM começa a aparecer",
    bolha: "ICM aperta",
    mesa_final: "ICM no centro",
  }[stage];
}

function phaseWhy(stage: FourStage, action: string, hand: string): string {
  const call = action === "call";
  const raise = action === "raise" || action === "allin";
  if (stage === "inicio") {
    if (call) return `${hand} paga: o preço cabe na conta de fichas.`;
    if (raise) return `${hand} toma a iniciativa: ainda há espaço para pressionar.`;
    return `${hand} não alcança o preço; preservar fichas é melhor.`;
  }
  if (stage === "meio") {
    if (call) return `A conta de fichas ainda permite ${hand} continuar.`;
    if (raise) return `Com stacks menores, ${hand} ganha valor ao pressionar.`;
    return `A pressão cresce e ${hand} não paga o preço exigido.`;
  }
  if (stage === "bolha") {
    if (call) return `Mesmo na bolha, ${hand} é forte o bastante para pagar.`;
    if (raise) return `A bolha aumenta a fold equity de ${hand}.`;
    return `Quebrar aqui custa caro: o ICM pede mais disciplina.`;
  }
  if (call) return `Já premiado, ${hand} ainda encontra um pagamento claro.`;
  if (raise) return `O ICM protege o pódio, mas ${hand} pode pressionar.`;
  return `O ICM protege o pódio: não vale arriscar por pouco. `;
}

function fourPhaseCopy(stage: FourStage, recommended: string, hand: string): FourPhaseCopy {
  return {
    label: phaseLabel(stage),
    action: actionLabel(recommended),
    sub: phaseSub(stage),
    why: phaseWhy(stage, recommended, hand),
    tone: actionTone(recommended),
  };
}

function cardColor(tone: FourPhaseCopy["tone"]): string {
  return tone === "call" ? C4.call : tone === "fold" ? C4.fold : C4.other;
}

function playingCardSvg(c: Card, x: number, y: number, w: number, h: number): string {
  const p = cardParts(c);
  const suitColor = p.red ? "#d94f4f" : "#10130f";
  const r = Math.round(w * 0.08);
  return [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#fbf7ea" stroke="${C4.gold}" stroke-width="4"/>`,
    `<text x="${x + 22}" y="${y + 58}" font-family="${SERIF}" font-size="52" font-weight="900" fill="#10130f">${esc(p.r)}</text>`,
    `<text x="${x + 22}" y="${y + 102}" font-family="${SERIF}" font-size="42" font-weight="900" fill="${suitColor}">${esc(p.suit)}</text>`,
    `<text x="${x + w / 2}" y="${y + h * 0.64}" font-family="${SERIF}" font-size="92" font-weight="900" text-anchor="middle" fill="${suitColor}">${esc(p.suit)}</text>`,
    `<text x="${x + w - 22}" y="${y + h - 20}" font-family="${SERIF}" font-size="50" font-weight="900" text-anchor="end" fill="#10130f">${esc(p.r)}</text>`,
  ].join("");
}

function fourStageContext(spec: HandLabSpec): string {
  const situation = spec.situation === "vsallin"
    ? `${spec.villainPosition} ALL-IN`
    : spec.situation === "vs3bet"
      ? `${spec.villainPosition} 3-BET`
      : spec.situation === "vsopen"
        ? `${spec.villainPosition} ABRIU`
        : "VOCÊ AGE PRIMEIRO";
  return `${spec.heroPosition} · ${Math.round(spec.stackBB)}BB · ${situation}`;
}

function answerHeader(spec: HandLabSpec, hand: string): { title: string; subtitle: string } {
  const actor = spec.situation === "vsallin" ? `${spec.villainPosition} deu all-in` : fourStageContext(spec);
  return {
    title: `${hand} NO ${spec.heroPosition}`,
    subtitle: `${actor} — a resposta DEPENDE DA FASE`,
  };
}

/** Card vertical de resposta, com quatro fases oficiais e contraste para celular. */
export function buildFourFasesInstagramSvg(spec: HandLabSpec): string {
  const hand = handPlain(spec.hand);
  const stages: FourStage[] = ["inicio", "meio", "bolha", "mesa_final"];
  const phases = stages.map((stage) => {
    const analysis = analyzeHand({ ...spec, stage });
    return fourPhaseCopy(stage, analysis.recommended, analysis.handType || hand);
  });
  const { title, subtitle } = answerHeader(spec, hand);
  const parts: string[] = [];
  const S = CARD_W;
  const M = 48;
  const IW = S - M * 2;
  const cx = S / 2;

  parts.push(
    `<defs><linearGradient id="answer-bg" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0%" stop-color="${C4.bgTop}"/><stop offset="54%" stop-color="${C4.bgMid}"/><stop offset="100%" stop-color="${C4.bgBot}"/>` +
    `</linearGradient><pattern id="answer-grid" width="54" height="54" patternUnits="userSpaceOnUse">` +
      `<path d="M54 0H0V54" fill="none" stroke="${C4.gold}" stroke-width="1" opacity="0.055"/>` +
    `</pattern></defs>`,
  );
  parts.push(`<rect width="${S}" height="${CARD_H}" fill="url(#answer-bg)"/>`);
  parts.push(`<rect width="${S}" height="${CARD_H}" fill="url(#answer-grid)"/>`);
  parts.push(box(24, 24, S - 48, CARD_H - 48, { stroke: C4.border, sw: 2, r: 28 }));

  // Cabeçalho compacto com contraste alto.
  const hy = 48;
  const hh = 106;
  parts.push(box(M, hy, IW, hh, { stroke: C4.border, sw: 2, r: 18, fill: "rgba(36,71,52,0.88)" }));
  // A assinatura oficial é composta no canvas após o SVG rasterizar.
  parts.push(`<text x="${S - M - 24}" y="${hy + 45}" font-family="${SERIF}" font-size="22" font-weight="900" letter-spacing="2" fill="${C4.gold}" text-anchor="end">ESTUDO · MTT · DECISÃO</text>`);
  parts.push(`<text x="${S - M - 24}" y="${hy + 78}" font-family="${SERIF}" font-size="20" fill="${C4.cream}" text-anchor="end">feito por um recreativo</text>`);

  // Título e cartas.
  parts.push(`<text x="${cx}" y="${hy + hh + 58}" font-family="${SERIF}" font-size="27" font-weight="900" letter-spacing="4" fill="${C4.gold}" text-anchor="middle">✓ A RESPOSTA · 4 FASES</text>`);
  parts.push(`<text x="${cx}" y="${hy + hh + 112}" font-family="${SERIF}" font-size="48" font-weight="900" fill="${C4.ink}" text-anchor="middle">${esc(title)}</text>`);
  parts.push(`<text x="${cx}" y="${hy + hh + 150}" font-family="${SERIF}" font-size="23" font-weight="700" fill="${C4.cream}" text-anchor="middle">${esc(subtitle)}</text>`);

  const cw = 132;
  const ch = 174;
  const cardGap = 20;
  const cardsW = cw * 2 + cardGap;
  const cardsY = 330;
  const cardsX = (S - cardsW) / 2;
  if (spec.hand[0] != null) parts.push(playingCardSvg(spec.hand[0], cardsX, cardsY, cw, ch));
  if (spec.hand[1] != null) parts.push(playingCardSvg(spec.hand[1], cardsX + cw + cardGap, cardsY, cw, ch));

  const sealY = 532;
  const sealText = fourStageContext(spec);
  const sealW = Math.min(IW, Math.max(420, sealText.length * 14 + 60));
  parts.push(box(cx - sealW / 2, sealY, sealW, 56, { stroke: C4.border, sw: 2, r: 16, fill: "rgba(36,71,52,0.95)" }));
  parts.push(`<text x="${cx}" y="${sealY + 36}" font-family="${SERIF}" font-size="22" font-weight="900" letter-spacing="1.2" fill="${C4.ink}" text-anchor="middle">${esc(sealText)}</text>`);

  // Grade de quatro fases: duas linhas de dois cards, com ação muito visível.
  const gridY = 640;
  const gap = 18;
  const colW = (IW - gap) / 2;
  const rowH = 344;
  phases.forEach((phase, i) => {
    const x = M + (i % 2) * (colW + gap);
    const y = gridY + Math.floor(i / 2) * (rowH + gap);
    parts.push(box(x, y, colW, rowH, { stroke: C4.border, sw: 2, r: 20, fill: "rgba(36,71,52,0.90)" }));
    const pcx = x + colW / 2;
    parts.push(`<text x="${pcx}" y="${y + 48}" font-family="${SERIF}" font-size="26" font-weight="900" letter-spacing="1.2" fill="${C4.gold}" text-anchor="middle">${phase.label}</text>`);
    parts.push(`<line x1="${x + 26}" y1="${y + 70}" x2="${x + colW - 26}" y2="${y + 70}" stroke="${C4.borderSoft}" stroke-width="1.5"/>`);
    parts.push(`<text x="${pcx}" y="${y + 105}" font-family="${SERIF}" font-size="18" font-weight="900" fill="${C4.cream}" text-anchor="middle">${phase.sub}</text>`);
    parts.push(`<text x="${pcx}" y="${y + 184}" font-family="${SERIF}" font-size="56" font-weight="900" fill="${cardColor(phase.tone)}" text-anchor="middle">${phase.action}</text>`);
    const whyLines = wrap(phase.why, 31);
    const whyStart = y + 242 - ((whyLines.length - 1) * 28) / 2;
    parts.push(multiline(whyLines, pcx, whyStart, 28, `font-family="${SERIF}" font-size="23" font-weight="700" fill="${C4.body}" text-anchor="middle"`));
  });

  const anchorY = 1412;
  const actor = spec.situation === "vsallin" ? "quem shovou" : "quem agiu antes";
  parts.push(box(M, anchorY, IW, 156, { stroke: C4.border, sw: 2, r: 20, fill: "rgba(36,71,52,0.94)" }));
  parts.push(`<text x="${cx}" y="${anchorY + 55}" font-family="${SERIF}" font-size="31" font-weight="900" fill="${C4.gold}" text-anchor="middle">A mão é só METADE da conta.</text>`);
  parts.push(`<text x="${cx}" y="${anchorY + 96}" font-family="${SERIF}" font-size="29" font-weight="900" fill="${C4.gold}" text-anchor="middle">A outra metade é ${esc(actor)} e EM QUE FASE do torneio.</text>`);
  parts.push(`<text x="${cx}" y="${anchorY + 130}" font-family="${SERIF}" font-size="16" font-style="italic" fill="${C4.cream}" text-anchor="middle">mesma mão · contexto diferente · decisão diferente</text>`);

  const ctaY = 1592;
  parts.push(`<rect x="${M}" y="${ctaY}" width="${IW}" height="78" rx="18" fill="${C4.gold}" stroke="${C4.gold}" stroke-width="2"/>`);
  parts.push(`<text x="${cx}" y="${ctaY + 50}" font-family="${SERIF}" font-size="28" font-weight="900" letter-spacing="2" fill="#12251a" text-anchor="middle">▶ TREINE O MESMO SPOT NO APP</text>`);

  const ftY = 1700;
  parts.push(box(M, ftY, IW, 66, { stroke: C4.borderSoft, sw: 1.5, r: 16, fill: "rgba(8,26,18,0.55)" }));
  parts.push(`<text x="${M + 26}" y="${ftY + 42}" font-family="${SERIF}" font-size="20" font-weight="900" fill="${C4.cream}">UMA MÃO POR VEZ · SÓ ESTUDO</text>`);
  parts.push(`<text x="${S - M - 26}" y="${ftY + 42}" font-family="${SERIF}" font-size="20" font-weight="900" fill="${C4.gold}" text-anchor="end">calloufold.com.br</text>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${CARD_H}" viewBox="0 0 ${S} ${CARD_H}">${parts.join("")}</svg>`;
}

/** Renderiza o card de resposta como PNG, sem iniciar download. */
export async function renderFourFasesInstagramCard(spec: HandLabSpec): Promise<Blob> {
  return svgToPngBlob(buildFourFasesInstagramSvg(spec), 1, { officialLogo: FOUR_PHASES_LOGO });
}

/** Gera e baixa o card vertical de quatro fases. */
export async function generateFourFasesInstagramCard(spec: HandLabSpec): Promise<string> {
  const blob = await renderFourFasesInstagramCard(spec);
  const name = `cof-resposta-4-fases-${handPlain(spec.hand)}-${Math.round(spec.stackBB)}bb.png`;
  await downloadBlob(blob, name);
  return name;
}

/** Legenda curta, preenchida a partir das decisões reais do motor. */
export function buildFourFasesInstagramCaption(spec: HandLabSpec): string {
  const hand = handPlain(spec.hand);
  const stages: FourStage[] = ["inicio", "meio", "bolha", "mesa_final"];
  const phaseLines = stages.map((stage) => {
    const analysis = analyzeHand({ ...spec, stage });
    return `${phaseLabel(stage)}: ${actionLabel(analysis.recommended)} — ${phaseWhy(stage, analysis.recommended, analysis.handType || hand)}`;
  });
  const actor = spec.situation === "vsallin" ? "quem shovou" : "quem agiu antes";
  return [
    `A mesma mão pode mudar de resposta conforme a fase do torneio: ${hand} no ${spec.heroPosition}.`,
    "",
    ...phaseLines,
    "",
    `A mão é só metade da conta. A outra metade é ${actor} e em que fase do torneio você está.`,
    "",
    "Alguém já te falou sobre isso? Em qual fase você mais fica na dúvida?",
    "",
    "Call ou Fold · app gratuito de estudo de poker MTT 9-max · sem dinheiro real.",
    "#poker #pokerbrasil #pokerestrategia #MTT #GTO #ICM #calloufold",
  ].join("\n");
}

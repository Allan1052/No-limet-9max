import { rankOf, suitOf, type Card } from "../engine/cards";
import {
  analyzeHand,
  parseHand,
  type HandAnalysis,
  type HandLabSpec,
} from "../train/stage";
import type { DecisionConfidence } from "../train/confidence";

export const SHARE_CARD_FORMATS = {
  feed: { width: 1080, height: 1350, aspectRatio: "4:5" },
  story: { width: 1080, height: 1920, aspectRatio: "9:16" },
} as const;

export type ReferenceCardFormat = keyof typeof SHARE_CARD_FORMATS;
export type ReferenceCardSlide = 1 | 2;

export interface ReferenceCardModel {
  hand: Card[];
  context: string;
  verdict: string;
  comparisonVerdict?: string;
  comparisonStage?: string;
  equity?: number;
  potOdds?: number;
  requiredEquity?: number;
  confidence: DecisionConfidence;
  why: string;
  stage: string;
  position: string;
  stackBB: number;
}

const GOLD = "#E6C454";
const BG_TOP = "#0A1F16";
const BG_BOTTOM = "#06120C";
const INK = "#F1EBDD";
const MUTED = "#B9AE8B";
const CARD_FACE = "#F7F4EC";
const RED_SUIT = "#C0362C";
const BLACK_SUIT = "#151515";
const FOLD = "#C96B60";
const CALL = "#74A981";
const SERIF = "Fraunces, Georgia, 'Times New Roman', serif";
const MONO = "'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace";
const RANKS = "23456789TJQKA";

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function stageLabel(stage: string): string {
  if (stage === "mesa_final") return "MESA FINAL";
  if (stage === "bolha") return "BOLHA";
  if (stage === "meio") return "MEIO";
  return "INÍCIO";
}

function actionContext(spec: HandLabSpec): string {
  if (spec.situation === "vsallin") return `${spec.villainPosition} DEU ALL-IN`;
  if (spec.situation === "vs3bet") return `${spec.villainPosition} DEU 3-BET`;
  if (spec.situation === "vsopen") return `${spec.villainPosition} ABRIU`;
  return "POTE NÃO ABERTO";
}

export function buildReferenceCardModel(
  analysis: HandAnalysis,
  comparison?: HandAnalysis,
): ReferenceCardModel {
  const comparisonDiffers = comparison && comparison.recommended !== analysis.recommended;
  return {
    hand: analysis.spec.hand,
    context: `${stageLabel(analysis.spec.stage)} · ${analysis.spec.heroPosition} · ${Math.round(analysis.spec.stackBB)}BB · ${actionContext(analysis.spec)}`,
    verdict: analysis.recommended,
    comparisonVerdict: comparisonDiffers ? comparison.recommended : undefined,
    comparisonStage: comparisonDiffers ? stageLabel(comparison.spec.stage) : undefined,
    equity: analysis.metrics.heroEquity,
    potOdds: analysis.metrics.potOdds,
    requiredEquity: analysis.metrics.requiredEquity,
    confidence: analysis.confidence,
    why: analysis.simple,
    stage: stageLabel(analysis.spec.stage),
    position: analysis.spec.heroPosition,
    stackBB: analysis.spec.stackBB,
  };
}

/** Prévia oficial A7s: decisões e números vêm do analyzeHand. */
export function buildA7sReferencePreview(): { finalTable: HandAnalysis; early: HandAnalysis; model: ReferenceCardModel } {
  const hand = parseHand("As7s");
  if (!hand) throw new Error("Falha ao montar A7s da prévia");
  const base: Omit<HandLabSpec, "stage"> = {
    heroPosition: "BB",
    villainPosition: "BTN",
    situation: "vsallin",
    stackBB: 15,
    hand,
    anteBB: 1,
  };
  const finalTable = analyzeHand({ ...base, stage: "mesa_final" });
  const early = analyzeHand({ ...base, stage: "inicio" });
  return { finalTable, early, model: buildReferenceCardModel(finalTable, early) };
}

/**
 * Naipe em vetor puro. Não depende de glifo Unicode/fallback de fonte, então
 * rasteriza igual em canvas, Android e browsers que não têm ♠/♥/♦/♣ na fonte.
 */
function suitMark(suitIndex: number, cx: number, cy: number, size: number, color: string): string {
  const scale = size / 100;
  const open = `<g transform="translate(${cx} ${cy}) scale(${scale})" fill="${color}">`;
  if (suitIndex === 1) {
    return `${open}<path d="M0 -48 L43 0 L0 48 L-43 0 Z"/></g>`;
  }
  if (suitIndex === 2) {
    return `${open}<path d="M0 43 C-11 29 -43 8 -43 -17 C-43 -37 -18 -49 0 -28 C18 -49 43 -37 43 -17 C43 8 11 29 0 43 Z"/></g>`;
  }
  if (suitIndex === 0) {
    return `${open}<circle cx="0" cy="-23" r="23"/><circle cx="-24" cy="6" r="23"/><circle cx="24" cy="6" r="23"/><path d="M-12 14 H12 C11 30 17 39 28 48 H-28 C-17 39 -11 30 -12 14 Z"/></g>`;
  }
  return `${open}<path d="M0 -48 C-12 -31 -43 -9 -43 17 C-43 37 -18 46 0 29 C18 46 43 37 43 17 C43 -9 12 -31 0 -48 Z"/><path d="M-12 22 H12 C11 34 17 42 27 49 H-27 C-17 42 -11 34 -12 22 Z"/></g>`;
}

function cardFace(card: Card, x: number, y: number, w: number, h: number, rotation: number): string {
  const suitIndex = suitOf(card);
  const rank = RANKS[rankOf(card) - 2];
  const color = suitIndex === 1 || suitIndex === 2 ? RED_SUIT : BLACK_SUIT;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const cornerX = x + w * 0.15;
  const cornerRankY = y + h * 0.17;
  const cornerSuitY = y + h * 0.255;
  return `<g transform="rotate(${rotation} ${cx} ${cy})" filter="url(#cardShadow)">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.round(w * 0.08)}" fill="${CARD_FACE}" stroke="${GOLD}" stroke-opacity=".65" stroke-width="2"/>
    <text x="${cornerX}" y="${cornerRankY}" font-family="${SERIF}" font-size="${Math.round(h * 0.15)}" font-weight="900" fill="${color}" text-anchor="middle">${rank}</text>
    ${suitMark(suitIndex, cornerX, cornerSuitY, h * 0.082, color)}
    ${suitMark(suitIndex, cx, y + h * 0.55, h * 0.28, color)}
    <g transform="rotate(180 ${cx} ${cy})">
      <text x="${cornerX}" y="${cornerRankY}" font-family="${SERIF}" font-size="${Math.round(h * 0.15)}" font-weight="900" fill="${color}" text-anchor="middle">${rank}</text>
      ${suitMark(suitIndex, cornerX, cornerSuitY, h * 0.082, color)}
    </g>
  </g>`;
}

function textLines(text: string, maxChars: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (!line) line = word;
    else if ((line + " " + word).length <= maxChars) line += " " + word;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

function multiline(lines: string[], x: number, y: number, lineHeight: number, attrs: string): string {
  return `<text x="${x}" y="${y}" ${attrs}>${lines.map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : lineHeight}">${esc(line)}</tspan>`).join("")}</text>`;
}

function pct(value: number | undefined): string | undefined {
  return value === undefined ? undefined : `${Math.round(value * 100)}%`;
}

function background(width: number, height: number): string {
  return `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${BG_TOP}"/><stop offset="1" stop-color="${BG_BOTTOM}"/></linearGradient>
    <radialGradient id="halo" cx="50%" cy="0%" r="58%"><stop offset="0" stop-color="${GOLD}" stop-opacity=".22"/><stop offset="55%" stop-color="${GOLD}" stop-opacity=".04"/><stop offset="100%" stop-color="${GOLD}" stop-opacity="0"/></radialGradient>
    <filter id="cardShadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#000" flood-opacity=".52"/><feDropShadow dx="0" dy="0" stdDeviation="7" flood-color="${GOLD}" flood-opacity=".2"/></filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${Math.round(height * 0.42)}" fill="url(#halo)"/>
  <rect x="28" y="28" width="${width - 56}" height="${height - 56}" rx="30" fill="none" stroke="${GOLD}" stroke-opacity=".72" stroke-width="1.5"/>`;
}

function header(width: number, y: number, context?: string): string {
  const center = width / 2;
  return `${suitMark(3, center - 178, y - 12, 28, GOLD)}
    <text x="${center + 18}" y="${y}" font-family="${SERIF}" font-size="36" font-weight="900" letter-spacing="3" fill="${GOLD}" text-anchor="middle">CALL OU FOLD</text>
    ${context ? `<text x="${center}" y="${y + 55}" font-family="${MONO}" font-size="22" font-weight="600" letter-spacing="1.5" fill="${MUTED}" text-anchor="middle">${esc(context)}</text>` : ""}`;
}

function footer(width: number, y: number, teaching = false): string {
  const center = width / 2;
  return `${teaching ? `<text x="${center}" y="${y - 30}" font-family="${MONO}" font-size="21" fill="${MUTED}" text-anchor="middle">Estude essa mão de graça</text>` : ""}
    <text x="${center}" y="${y}" font-family="${MONO}" font-size="20" letter-spacing="1.2" fill="${GOLD}" text-anchor="middle">calloufold.com.br</text>`;
}

function slideOne(model: ReferenceCardModel, format: ReferenceCardFormat): string {
  const { width, height } = SHARE_CARD_FORMATS[format];
  const tall = format === "story";
  const center = width / 2;
  const headerY = tall ? 150 : 115;
  const cardW = tall ? 300 : 270;
  const cardH = tall ? 435 : 390;
  const cardsY = tall ? 430 : 300;
  const cardsX = center - cardW + 36;
  const headlineY = cardsY + cardH + (tall ? 170 : 125);
  const ctaY = headlineY + 105;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${background(width, height)}
    ${header(width, headerY, model.context)}
    ${cardFace(model.hand[0], cardsX, cardsY, cardW, cardH, -7)}
    ${cardFace(model.hand[1], cardsX + cardW * 0.72, cardsY + 8, cardW, cardH, 7)}
    <text x="${center}" y="${headlineY}" font-family="${SERIF}" font-size="${tall ? 104 : 88}" font-weight="900" fill="${INK}" text-anchor="middle">Call ou Fold?</text>
    <text x="${center}" y="${headlineY + 62}" font-family="${MONO}" font-size="25" fill="${MUTED}" text-anchor="middle">A maioria erra essa.</text>
    <rect x="${center - 245}" y="${ctaY}" width="490" height="72" rx="36" fill="${GOLD}"/>
    <text x="${center - 10}" y="${ctaY + 46}" font-family="${MONO}" font-size="23" font-weight="900" fill="#0B160F" text-anchor="middle">COMENTA SUA RESPOSTA</text>
    <path d="M${center + 188} ${ctaY + 27} V${ctaY + 47} M${center + 178} ${ctaY + 39} L${center + 188} ${ctaY + 49} L${center + 198} ${ctaY + 39}" fill="none" stroke="#0B160F" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    ${footer(width, height - 70)}
  </svg>`;
}

function metricRow(label: string, value: string | undefined, x: number, y: number, width: number): string {
  if (!value) return "";
  return `<line x1="${x}" y1="${y - 32}" x2="${x + width}" y2="${y - 32}" stroke="${GOLD}" stroke-opacity=".22"/>
    <text x="${x}" y="${y}" font-family="${MONO}" font-size="22" font-weight="700" fill="${GOLD}">${esc(label)}</text>
    <text x="${x + width}" y="${y}" font-family="${MONO}" font-size="25" font-weight="800" fill="${INK}" text-anchor="end">${esc(value)}</text>`;
}

function slideTwo(model: ReferenceCardModel, format: ReferenceCardFormat): string {
  const { width, height } = SHARE_CARD_FORMATS[format];
  const tall = format === "story";
  const center = width / 2;
  const verdict = model.verdict.toUpperCase();
  const verdictColor = model.verdict === "fold" ? FOLD : model.verdict === "call" ? CALL : GOLD;
  const headerY = tall ? 150 : 115;
  const verdictY = tall ? 360 : 290;
  const comparison = model.comparisonVerdict && model.comparisonStage
    ? `…na ${model.stage.toLowerCase()}. No ${model.comparisonStage.toLowerCase()} seria ${model.comparisonVerdict.toUpperCase()}.`
    : `Decisão para este spot: ${verdict}.`;
  const boxX = 86;
  const boxY = tall ? 545 : 440;
  const boxW = width - 172;
  const boxH = tall ? 980 : 700;
  const whyLines = textLines(model.why, tall ? 60 : 67).slice(0, tall ? 5 : 3);
  const eq = pct(model.equity);
  const po = pct(model.potOdds);
  const req = pct(model.requiredEquity);
  const confidence = model.confidence.label.toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${background(width, height)}
    ${header(width, headerY)}
    <text x="${center}" y="${verdictY}" font-family="${SERIF}" font-size="${tall ? 150 : 126}" font-weight="900" fill="${verdictColor}" text-anchor="middle">${esc(verdict)}</text>
    <line x1="160" y1="${verdictY + 44}" x2="${width - 160}" y2="${verdictY + 44}" stroke="${GOLD}" stroke-opacity=".42"/>
    ${multiline(textLines(comparison, 55), center, verdictY + 102, 34, `font-family="${MONO}" font-size="24" fill="${INK}" text-anchor="middle"`)}
    <rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="24" fill="#07150E" fill-opacity=".64" stroke="${GOLD}" stroke-opacity=".55"/>
    <text x="${boxX + 34}" y="${boxY + 62}" font-family="${MONO}" font-size="22" font-weight="800" fill="${GOLD}">POR QUÊ</text>
    ${multiline(whyLines, boxX + 34, boxY + 104, 32, `font-family="${MONO}" font-size="20" fill="${MUTED}"`)}
    ${metricRow("PREÇO DO POTE", po, boxX + 34, boxY + (tall ? 350 : 285), boxW - 68)}
    ${metricRow("SUA EQUITY", eq, boxX + 34, boxY + (tall ? 470 : 390), boxW - 68)}
    ${metricRow("EXIGÊNCIA COM ICM", req, boxX + 34, boxY + (tall ? 590 : 495), boxW - 68)}
    <line x1="${boxX + 34}" y1="${boxY + boxH - 150}" x2="${boxX + boxW - 34}" y2="${boxY + boxH - 150}" stroke="${GOLD}" stroke-opacity=".22"/>
    <text x="${boxX + 34}" y="${boxY + boxH - 100}" font-family="${MONO}" font-size="22" font-weight="800" fill="${GOLD}">SELO DE CONFIANÇA</text>
    <text x="${boxX + boxW - 34}" y="${boxY + boxH - 100}" font-family="${MONO}" font-size="23" font-weight="900" fill="${INK}" text-anchor="end">${esc(confidence)}</text>
    ${multiline(textLines(model.confidence.reason, 72).slice(0, 2), boxX + 34, boxY + boxH - 58, 28, `font-family="${MONO}" font-size="17" fill="${MUTED}"`)}
    ${footer(width, height - 70, true)}
  </svg>`;
}

export function renderReferenceCardSvg(
  model: ReferenceCardModel,
  format: ReferenceCardFormat,
  slide: ReferenceCardSlide,
): string {
  return slide === 1 ? slideOne(model, format) : slideTwo(model, format);
}

/** SVG puro → img → canvas → PNG, sem foreignObject e sem recurso cross-origin. */
export async function renderReferenceCardPng(
  model: ReferenceCardModel,
  format: ReferenceCardFormat,
  slide: ReferenceCardSlide,
): Promise<Blob | null> {
  const { width, height } = SHARE_CARD_FORMATS[format];
  const svg = renderReferenceCardSvg(model, format, slide);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Falha ao rasterizar SVG do card"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, width, height);
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.92));
  } finally {
    URL.revokeObjectURL(url);
  }
}

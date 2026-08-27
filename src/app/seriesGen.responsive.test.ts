import { describe, expect, it } from "vitest";
import { makeCard } from "../engine/cards";
import type { HandLabSpec } from "../train/stage";
import { buildSingleQuizSvg } from "./seriesGen";

const VIEW_W = 1080;
const VIEW_H = 1920;
const SAFE = 24;

function attribute(tag: string, name: string): number | string | null {
  const match = tag.match(new RegExp(`${name}="([^"]*)"`));
  if (!match) return null;
  const value = match[1];
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}

function textContent(tag: string): string {
  return tag
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Estimativa conservadora para fonte serifada no SVG, suficiente para pegar overflow. */
function estimatedTextWidth(text: string, fontSize: number): number {
  const wide = (text.match(/[MW@#%&]/g) ?? []).length;
  const narrow = (text.match(/[ijlI.,:'|]/g) ?? []).length;
  const regular = Math.max(0, text.length - wide - narrow);
  return (wide * 0.82 + regular * 0.58 + narrow * 0.28) * fontSize;
}

function assertTextFits(svg: string, scale: number): void {
  const textTags = [...svg.matchAll(/<text\b[^>]*>[\s\S]*?<\/text>/g)].map((m) => m[0]);
  for (const tag of textTags) {
    const x = attribute(tag, "x");
    const y = attribute(tag, "y");
    const fontSize = attribute(tag, "font-size");
    const anchor = attribute(tag, "text-anchor") ?? "start";
    const text = textContent(tag);
    if (typeof x !== "number" || typeof y !== "number" || typeof fontSize !== "number" || !text) continue;

    const width = estimatedTextWidth(text, fontSize);
    const left = anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x;
    const right = anchor === "middle" ? x + width / 2 : anchor === "end" ? x : x + width;
    const top = y - fontSize;
    const bottom = y + fontSize * 0.35;

    expect(left, `${scale}x overflow left: ${text}`).toBeGreaterThanOrEqual(SAFE);
    expect(right, `${scale}x overflow right: ${text}`).toBeLessThanOrEqual(VIEW_W - SAFE);
    expect(top, `${scale}x overflow top: ${text}`).toBeGreaterThanOrEqual(SAFE);
    expect(bottom, `${scale}x overflow bottom: ${text}`).toBeLessThanOrEqual(VIEW_H - SAFE);
  }
}

function assertRectsFit(svg: string, scale: number): void {
  const rectTags = [...svg.matchAll(/<rect\b[^>]*\/?>(?:<\/rect>)?/g)].map((m) => m[0]);
  for (const tag of rectTags) {
    const x = attribute(tag, "x");
    const y = attribute(tag, "y");
    const width = attribute(tag, "width");
    const height = attribute(tag, "height");
    if (![x, y, width, height].every((v) => typeof v === "number")) continue;
    expect(x, `${scale}x rect x`).toBeGreaterThanOrEqual(0);
    expect(y, `${scale}x rect y`).toBeGreaterThanOrEqual(0);
    expect((x as number) + (width as number), `${scale}x rect right`).toBeLessThanOrEqual(VIEW_W);
    expect((y as number) + (height as number), `${scale}x rect bottom`).toBeLessThanOrEqual(VIEW_H);
  }
}

const base: HandLabSpec = {
  heroPosition: "SB",
  villainPosition: "BTN",
  situation: "vsopen",
  stage: "inicio",
  stackBB: 12,
  hand: [makeCard(14, 3), makeCard(8, 1)],
  anteBB: 1,
};

const cases: Array<[string, HandLabSpec]> = [
  ["A8o SB vs BTN open, stack curto", base],
  ["KQo BTN vs CO open, stack fundo", {
    ...base,
    heroPosition: "BTN",
    villainPosition: "CO",
    stackBB: 100,
    hand: [makeCard(13, 3), makeCard(12, 2)],
  }],
  ["A7o BB contra all-in", {
    ...base,
    heroPosition: "BB",
    villainPosition: "BTN",
    situation: "vsallin",
    stackBB: 15,
    hand: [makeCard(14, 3), makeCard(7, 3)],
  }],
  ["KQs SB contra 3-bet", {
    ...base,
    situation: "vs3bet",
    stackBB: 40,
    hand: [makeCard(13, 3), makeCard(12, 3)],
  }],
];

describe("responsividade geométrica do quiz Instagram", () => {
  it.each(cases)("mantém todos os textos e blocos dentro da área segura — %s", (_name, spec) => {
    const svg = buildSingleQuizSvg(spec, { villainStackBB: Math.max(spec.stackBB, 20) });
    for (const scale of [1, 0.75, 0.625, 0.5]) {
      assertTextFits(svg, scale);
      assertRectsFit(svg, scale);
    }
  });

  it("mantém contrato de conteúdo no caso publicado A8o", () => {
    const svg = buildSingleQuizSvg(base, { villainStackBB: 20 });
    expect(svg).toContain("ALL-IN OU FOLD?");
    expect(svg).toContain("SB · 12bb · BTN abriu · vilão cobre");
    expect(svg).toContain("CHIP-EV · SEM ICM INFORMADO");
    expect(svg).not.toContain("✔ A RESPOSTA");
  });
});

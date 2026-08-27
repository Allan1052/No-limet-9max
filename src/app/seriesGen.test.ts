import { describe, expect, it } from "vitest";
import { makeCard } from "../engine/cards";
import type { HandLabSpec } from "../train/stage";
import {
  buildFourFasesInstagramCaption,
  buildFourFasesInstagramSvg,
} from "./seriesGen";

const spec: HandLabSpec = {
  heroPosition: "BB",
  villainPosition: "BTN",
  situation: "vsallin",
  stage: "inicio",
  stackBB: 15,
  hand: [makeCard(14, 3), makeCard(7, 3)],
  anteBB: 1,
};

const visualSpec: HandLabSpec = {
  heroPosition: "BTN",
  villainPosition: "CO",
  situation: "vsopen",
  stage: "inicio",
  stackBB: 200,
  hand: [makeCard(13, 3), makeCard(12, 2)],
  anteBB: 1,
};

describe("card Instagram de resposta em quatro fases", () => {
  it("monta um SVG vertical com as quatro fases e a identidade de alto contraste", () => {
    const svg = buildFourFasesInstagramSvg(visualSpec);

    expect(svg).toContain('width="1080" height="1920"');
    expect(svg).toContain("✓ A RESPOSTA · 4 FASES");
    expect(svg).toContain("K♠Q♥ NO BTN");
    expect(svg).toContain("INÍCIO");
    expect(svg).toContain("MEIO");
    expect(svg).toContain("BOLHA");
    expect(svg).toContain("MESA FINAL");
    expect(svg).toContain("#3bdd7b");
    expect(svg).toContain("#ff8b7a");
    expect(svg).toContain("TREINE O MESMO SPOT NO APP");
    expect(svg).toContain('href="/logo.png');
  });

  it("preenche uma legenda com as decisões das quatro fases", () => {
    const caption = buildFourFasesInstagramCaption(spec);

    expect(caption).toContain("A♠7♠");
    expect(caption).toContain("INÍCIO:");
    expect(caption).toContain("MEIO:");
    expect(caption).toContain("BOLHA:");
    expect(caption).toContain("MESA FINAL:");
    expect(caption).toContain("Alguém já te falou sobre isso?");
    expect(caption).toContain("#calloufold");
  });
});

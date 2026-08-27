import { describe, expect, it } from "vitest";
import { makeCard } from "../engine/cards";
import type { HandLabSpec } from "../train/stage";
import {
  buildFourFasesInstagramCaption,
  buildFourFasesInstagramSvg,
  buildSingleAnswerCaption,
  buildSingleAnswerSvg,
  classifyCardSpot,
  svgToPngBlob,
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
    expect(svg).toContain("Chip-EV · preço em fichas");
    expect(svg).toContain("Transição · pressão crescente");
    expect(svg).toContain("ICM alto · risco de ficar fora");
    expect(svg).toContain("ICM ativo · pay jumps");
    expect(svg).toContain("#3bdd7b"); // CALL (verde) — KQo paga nas 4 fases
    // A cor de FOLD só aparece num spot que REALMENTE flipa por ICM (curto, vs
    // all-in). KQo no BTN vs abertura do CO é CALL nas 4 fases — não flipa (um
    // flat premium não folda por ICM). Quem flipa é A7s vs all-in curto.
    expect(buildFourFasesInstagramSvg(spec)).toContain("#ff8b7a"); // FOLD (vermelho)
    expect(svg).toContain("TREINE O MESMO SPOT NO APP");
    expect(svg).not.toContain("<image");
  });

  it("compõe a assinatura oficial no canvas sem embuti-la no bundle", async () => {
    const originalImage = globalThis.Image;
    const originalDocument = globalThis.document;
    const drawnSources: string[] = [];

    class MockImage {
      naturalWidth = 1600;
      naturalHeight = 560;
      width = 1600;
      height = 560;
      private _src = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      get src(): string {
        return this._src;
      }

      set src(value: string) {
        this._src = value;
        queueMicrotask(() => this.onload?.());
      }
    }

    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage: (image: MockImage) => drawnSources.push(image.src),
      }),
      toBlob: (callback: BlobCallback) => callback(new Blob(["png"], { type: "image/png" })),
    };

    Object.defineProperty(globalThis, "Image", { configurable: true, value: MockImage });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { createElement: () => canvas },
    });

    try {
      await svgToPngBlob("<svg xmlns=\"http://www.w3.org/2000/svg\" />", 1, {
        officialLogo: { x: 66, y: 56, width: 306, height: 90 },
      });
    } finally {
      Object.defineProperty(globalThis, "Image", { configurable: true, value: originalImage });
      Object.defineProperty(globalThis, "document", { configurable: true, value: originalDocument });
    }

    expect(drawnSources).toHaveLength(2);
    expect(drawnSources[0]).toMatch(/^data:image\/svg\+xml/);
    expect(drawnSources[1]).toBe("/logo.png");
  });

  it("classifica um spot fundo como decisão única e não cria uma história de fases", () => {
    const classification = classifyCardSpot(visualSpec);
    expect(classification.kind).toBe("unica");
    expect(classification.shortEnough).toBe(false);
    const svg = buildSingleAnswerSvg(visualSpec);
    expect(svg).toContain("✔ A RESPOSTA");
    expect(svg).not.toContain("4 FASES");
    expect(svg).toContain("Chip-EV · preço em fichas");
    const caption = buildSingleAnswerCaption(visualSpec);
    expect(caption).toContain("K♠Q♥ no BTN: ");
    expect(caption).toContain("Chip-EV · preço em fichas");
    expect(caption).not.toContain("INÍCIO:");
    expect(caption).toContain("Você faria igual neste spot?");
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

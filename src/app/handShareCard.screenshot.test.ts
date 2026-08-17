// Teste de renderização do card de histórico com SHOWDOWN e POTE POR RUA.
// Usa node-canvas como polyfill do <canvas>/Image global e um document
// mínimo (createElement só precisa suportar "canvas"); gera o PNG real em /tmp.
import { describe, it, beforeAll } from "vitest";
import { makeCard } from "../engine/cards";
// @ts-expect-error jsdom sem @types
import { JSDOM } from "jsdom";
import { createCanvas, Image } from "canvas";
// @ts-expect-error node:fs sem @types/node
import * as fs from "node:fs";

const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);

beforeAll(() => {
  const g = globalThis as unknown as {
    document: Document;
    Image: typeof Image;
    HTMLCanvasElement: unknown;
    HTMLImageElement: unknown;
  };
  g.document = dom.window.document;
  g.Image = Image as unknown as never;
  g.HTMLCanvasElement = Object.getPrototypeOf(createCanvas(1, 1));
  g.HTMLImageElement = Image.prototype;
  // document.createElement precisa devolver um canvas do node-canvas
  const realCreate = dom.window.document.createElement.bind(
    dom.window.document,
  );
  (dom.window.document.createElement as never) = ((
    tag: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): any => {
    if (tag !== "canvas") return realCreate(tag);
    const c = createCanvas(0, 0);
    // toBlob: o código usa canvas.toBlob(cb, type)
    (c as unknown as Record<string, unknown>).toBlob = (
      cb: (b: Blob | null) => void,
      type?: string,
    ): void => {
      const buf = (c as unknown as {
        toBuffer: (t: string) => Uint8Array;
      }).toBuffer((type ?? "image/png") as never);
      cb(new Blob([buf.buffer as BlobPart], { type: type ?? "image/png" }));
    };
    return c;
  }) as never;
});

import {
  drawHandShareCard,
  type HandShareData,
} from "./handShareCard";

const data: HandShareData = {
  heroCards: [makeCard(9, 0), makeCard(9, 2)], // 9c 9h
  board: [
    makeCard(3, 2), makeCard(9, 1), makeCard(11, 3), makeCard(5, 0), makeCard(3, 0),
  ],
  heroAction: "ALL-IN",
  coachAction: "RAISE",
  rating: "ruim",
  coachTip:
    "All-in aqui é overbet: com 0bb, o certo era um Raise de tamanho normal.",
  street: "Turn",
  tournamentInfo: "Torneio $1K · Circuito Etapa 4 · 9-max",
  tournamentResult: "7º lugar de 180",
  context: "Você aposta 38bb · Stack: 53bb",
  position: "LJ",
  stackBB: "53bb",
  buyIn: 1000,
  actionLog: [
    { street: "Pré-Flop", who: "Vilão", action: "Raise 115", isHero: false, correct: undefined },
    { street: "Pré-Flop", who: "Você", action: "Call 95", isHero: true, correct: undefined },
    { street: "Flop", who: "Vilão", action: "Check", isHero: false, correct: undefined },
    { street: "Flop", who: "Você", action: "Raise 85", isHero: true, correct: true },
    { street: "Flop", who: "Vilão", action: "Call 85", isHero: false, correct: undefined },
    { street: "Turn", who: "Vilão", action: "Check", isHero: false, correct: undefined },
    { street: "Turn", who: "Você", action: "All-in 53bb", isHero: true, correct: false },
  ],
  potByStreet: { "Pré-Flop": 23.0, "Flop": 41.0, "Turn": 94.0 },
  finalPotBB: 94.0,
  showdown: [
    {
      name: "Você",
      cards: [makeCard(9, 0), makeCard(9, 2)], // 9c 9h
      isHero: true,
      won: false,
    },
    {
      name: "Azoff",
      cards: [makeCard(8, 2), makeCard(9, 1)], // 8h 9d
      isHero: false,
      won: true,
    },
  ],
};

describe("card de histórico com showdown", () => {
  it("gera o PNG real com showdown e potes por rua em /tmp", async () => {
    const blob = await drawHandShareCard(data, "simples", "historico");
    if (!blob) throw new Error("card não gerado");
    const buf = new Uint8Array(await blob.arrayBuffer());
    fs.writeFileSync("/tmp/card_historico_showdown.png", buf);
    if (buf.length < 5000) throw new Error("PNG menor que o esperado");
  });
});

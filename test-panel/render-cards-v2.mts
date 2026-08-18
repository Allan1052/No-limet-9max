// Renderiza os 3 tipos de card (decisao, narrativa, historico) usando o MESMO
// polyfill do node-canvas do teste oficial do repo (handShareCard.screenshot.test.ts).
import esbuild from "esbuild";
import { JSDOM } from "jsdom";
import { createCanvas, Image } from "canvas";
import * as fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync("/home/ubuntu/no-limet-9max-audit/src/app/handShareCard.ts", "utf8");
await esbuild.build({
  stdin: { contents: src, loader: "ts", resolveDir: "/home/ubuntu/no-limet-9max-audit/src/app" },
  bundle: true,
  format: "iife",
  globalName: "CARDMOD",
  outfile: "/tmp/cardmod.js",
  write: true,
  platform: "browser",
  target: "es2020",
});

// polyfill idêntico ao do teste oficial
const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
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
const realCreate = dom.window.document.createElement.bind(dom.window.document);
(dom.window.document.createElement as unknown) = (tag: string): any => {
  if (tag !== "canvas") return realCreate(tag);
  const c = createCanvas(0, 0);
  (c as unknown as Record<string, unknown>).toBlob = (
    cb: (b: Blob | null) => void,
    type?: string,
  ): void => {
    const buf = (c as unknown as { toBuffer(t?: string): Buffer }).toBuffer(
      type === "image/jpeg" ? "image/jpeg" : "image/png",
    );
    cb(new Blob([buf], { type: type || "image/png" }));
  };
  return c;
};
// Image.prototype.src setter precisa carregar base64
const imgSrc = Object.getOwnPropertyDescriptor(Image.prototype, "src");
if (!imgSrc || !imgSrc.set) {
  Object.defineProperty(Image.prototype, "src", {
    set(v: string) {
      (this as unknown as { onload?: () => void; onerror?: () => void }).onload?.();
    },
    get: () => "",
    configurable: true,
  });
}

const modSrc = fs.readFileSync("/tmp/cardmod.js", "utf8");
console.log("cardmod head:", modSrc.slice(0, 120));
// O eval do JSDOM não vaza var para o global do vm do Node; usar new Function no contexto do window
try {
  const fn = new dom.window.Function(modSrc + "\nreturn CARDMOD;");
  var mod: any = fn.call(dom.window);
} catch (e) {
  console.log("eval error:", e instanceof Error ? e.message : e);
  console.log("---tail---", modSrc.slice(-800));
  process.exit(1);
}
console.log("exports:", mod ? Object.keys(mod).filter((k: string) => k.startsWith("draw")) : "undefined");

const hand = {
  heroCards: [28, 29],
  board: [26, 34, 47, 18, 33],
  heroAction: "Call 88bb",
  coachAction: "Call",
  rating: "ruim",
  coachTip:
    "Você pagou o all-in com par de nove no river. O vilão de UTG tem range polarizado; sem reads, a frequência principal aqui é fold.",
  street: "River",
  tournamentInfo: "Torneio $1.000 · Circuito",
  tournamentResult: "4º de 180",
  context: "Vilão aposta 88bb de UTG · Stack: 96bb",
  position: "MP",
  stackBB: "96bb",
  stage: "Meio",
  equity: 0.38,
  decisions: [
    { street: "Pré-Flop", action: "Raise 2bb", correct: true },
    { street: "Flop", action: "Check-Call", correct: true },
    { street: "Turn", action: "Aposta 6bb", correct: true },
    { street: "River", action: "Check", correct: false },
  ],
  actionLog: [
    { who: "Vilão", action: "Raise 3.5bb", street: "Pré-Flop", isHero: false },
    { who: "Você", action: "Call 3.5bb", street: "Pré-Flop", isHero: true, correct: true },
    { who: "Vilão", action: "Aposta 11bb", street: "Flop", isHero: false },
    { who: "Você", action: "Call 11bb", street: "Flop", isHero: true, correct: true },
    { who: "Vilão", action: "Check", street: "Turn", isHero: false },
    { who: "Você", action: "Aposta 6bb", street: "Turn", isHero: true, correct: true },
    { who: "Vilão", action: "All-in 88bb", street: "River", isHero: false },
    { who: "Você", action: "Call 88bb", street: "River", isHero: true, correct: false },
  ],
  buyIn: 1000,
  potByStreet: { "Pré-Flop": 9, Flop: 31, Turn: 43, River: 219 },
  finalPotBB: 219,
  showdown: [
    { name: "Você", cards: [28, 29], isHero: true, won: false },
    { name: "Vilão", cards: [48, 50], isHero: false, won: true },
  ],
};

const outDir = "/tmp/cards-claude";
fs.mkdirSync(outDir, { recursive: true });
for (const t of ["decisao", "narrativa", "historico"]) {
  try {
    const blob: Blob = await Promise.race([
      mod.drawHandShareCard(hand, "simples", t),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout 15s")), 15000)),
    ]);
    const buf = Buffer.from(await blob.arrayBuffer());
    fs.writeFileSync(path.join(outDir, `card_${t}.png`), buf);
    console.log(`[OK] card_${t}.png ${buf.length}b`);
  } catch (e) {
    console.log(`[ERR] ${t}:`, e instanceof Error ? e.message : e);
  }
}
console.log("done");
process.exit(0);

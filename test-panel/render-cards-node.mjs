// Renderiza os 3 cards usando jsdom + canvas no Node
import fs from "fs";
import esbuild from "esbuild";
import { JSDOM } from "jsdom";

const src = fs.readFileSync("/home/ubuntu/no-limet-9max-audit/src/app/handShareCard.ts", "utf8");
// bundle do módulo para CJS/iife sem TS
const out = await esbuild.build({
  stdin: { contents: src, loader: "ts", resolveDir: "/home/ubuntu/no-limet-9max-audit/src/app" },
  bundle: true,
  format: "iife",
  globalName: "CARDMOD",
  outfile: "/tmp/cardmod.js",
  write: true,
  platform: "browser",
  target: "es2020",
});
console.log("bundled", Object.keys(out.metafile?.outputs || {}).length);

import { createCanvas } from "canvas";

const dom = new JSDOM(`<!doctype html><html><body></body></html>`, {
  runScripts: "outside-only",
  pretendToBeVisual: true,
});
global.window = dom.window;
global.document = dom.window.document;
global.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
global.HTMLCanvasElement = dom.window.HTMLCanvasElement;
global.Image = dom.window.Image;
HTMLCanvasElement.prototype.getContext = function(type) {
  if (type === "2d") {
    this.__ctx = this.__ctx || createCanvas(this.width, this.height).getContext("2d");
    const ctx = this.__ctx;
    ctx.canvas.width = this.width; ctx.canvas.height = this.height;
    return ctx;
  }
  return null;
};
HTMLCanvasElement.prototype.toBlob = function(cb, type) {
  const native = createCanvas(this.width, this.height);
  native.getContext("2d").drawImage(this, 0, 0);
  native.toBlob(cb, type);
};

dom.window.eval(fs.readFileSync("/tmp/cardmod.js", "utf8"));
const mod = dom.window.CARDMOD;
console.log("exports:", Object.keys(mod).filter(k => k.startsWith("draw")));

const hand = {
  heroCards: [28, 29], board: [26, 34, 47, 18, 33],
  heroAction: "Call 88bb", coachAction: "Call", rating: "ruim",
  coachTip: "Você pagou o all-in com par de nove no river. O vilão de UTG tem range polarizado; sem reads, a frequência principal aqui é fold.",
  street: "River", tournamentInfo: "Torneio $1.000 · Circuito", tournamentResult: "4º de 180",
  context: "Vilão aposta 88bb de UTG · Stack: 96bb", position: "MP", stackBB: "96bb", stage: "Meio",
  equity: 0.38, decisions: [
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
  buyIn: 1000, potByStreet: { "Pré-Flop": 9, Flop: 31, Turn: 43, River: 219 }, finalPotBB: 219,
  showdown: [
    { name: "Você", cards: [28, 29], isHero: true, won: false },
    { name: "Vilão", cards: [48, 50], isHero: false, won: true },
  ],
};

function toBase64(blob) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result.toString().split(",")[1]);
    fr.onerror = rej;
    fr.readAsDataURL(blob);
  });
}

const outDir = "/tmp/cards-claude";
fs.mkdirSync(outDir, { recursive: true });
await (async () => {
  for (const t of ["decisao", "narrativa", "historico"]) {
    try {
      const withTimeout = async () => {
        const p = mod.drawHandShareCard(hand, "simples", t);
        return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout 15s")), 15000))]);
      };
      const blob = await withTimeout();
      if (!blob) { console.log("[WARN]", t, "nulo"); continue; }
      const b64 = await toBase64(blob);
      fs.writeFileSync(`${outDir}/card_${t}.png`, Buffer.from(b64, "base64"));
      console.log("[OK]", `card_${t}.png`, blob.size);
    } catch (e) {
      console.log("[ERR]", t, String(e && e.message || e));
    }
  }
  console.log("done");
})();

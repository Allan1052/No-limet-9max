// Renderiza os 3 cards reais do bundle LIVE (calloufold.com.br) para análise visual.
import * as fs from "node:fs";
import { createCanvas, Image } from "canvas";
import { JSDOM } from "jsdom";

const stubs = fs.readFileSync("/tmp/stubs.js", "utf8");
const code = fs.readFileSync("/tmp/live-share-mod.js", "utf8");

const patched = code
  .replace(/(?<=[^;\s\w])(?=(?:async )?function [\w$]+\()/g, ";")
  .replace(/(?<=[^;\s\w(])(?=const )/g, ";");

const wrapped =
  stubs +
  "(function(){" +
  "var __out__={};" +
  patched
    .replace(/async function ([\w$]+)\(([^)]*)\)\{/g, (mm, name, params) => `__out__.${name} = async function(${params}){`)
    .replace(/function ([\w$]+)\(([^)]*)\)\{/g, (mm, name, params) => `__out__.${name} = function(${params}){`) +
  ";return __out__;})()";

const __out__: any = dom.window.eval(
  "(function(){" + wrapped + "})()"
);
console.log("fns:", Object.keys(__out__));

// placeholder (remover o eval posterior)

// ---- JSDOM + canvas ----
const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, { url: "https://calloufold.com.br" });
const { window } = dom;
const canvasProto = createCanvas(10, 10).constructor.prototype;
window.HTMLCanvasElement.prototype.getContext = canvasProto.getContext.bind(canvasProto);
if (typeof canvasProto.toDataURL === "function") window.HTMLCanvasElement.prototype.toDataURL = canvasProto.toDataURL.bind(canvasProto);
if (typeof canvasProto.toBlob === "function") window.HTMLCanvasElement.prototype.toBlob = canvasProto.toBlob.bind(canvasProto);
window.HTMLImageElement = Image;
window.Image = Image;
window.requestAnimationFrame = (cb: any) => setTimeout(cb, 16);
window.getComputedStyle = () => ({ fontFamily: "Georgia, serif", fontSize: "16px" }) as any;
window.document.createElement = ((tag: string) => {
  if (tag === "canvas") return createCanvas(1080, 1350) as any;
  return dom.window.document.createElement(tag);
}) as any;
dom.window.eval(wrapped);
const __out__: any = dom.window.eval("__out__");

console.log("fns:", Object.keys(__out__));

// ---- Mock de mão completa ----
const enc = (r: number, s: number) => (r - 2) * 4 + s;
const hand = {
  heroCards: [enc(9, 3), enc(9, 0)], // 9♠ 9♣
  villainCards: [enc(14, 2), enc(11, 1)], // A♥ J♦
  board: [enc(3, 2), enc(9, 1), enc(11, 3), enc(5, 0), enc(3, 0)], // 3♥ 9♦ J♠ 5♣ 3♣
  actions: [
    { street: "preflop", hero: "call", villain: "raise", amount: 2.3 },
    { street: "flop", hero: "call", villain: "bet", amount: 4.5 },
    { street: "turn", hero: "call", villain: "check" },
    { street: "river", hero: "bet", villain: "allin", amount: 12 },
  ],
  showdown: {
    heroWins: true,
    heroCards: [enc(9, 3), enc(9, 0)],
    villainCards: [enc(14, 2), enc(11, 1)],
    winnerText: "Trinca de 9s!",
    equity: 82,
  },
  tournamentResult: { name: "Torneio de 1K", place: 7, total: 180, buyIn: 1000 },
  position: "BTN",
  stackBB: 30,
  potBB: 52,
  finalPotBB: 52,
  buyIn: 1000,
  hasHistory: true,
  heroName: "um recreativo qualquer",
  shareCaption: "Essa mão eu joguei no Call ou Fold — simulador grátis de poker. 🃏\nSem dinheiro real. Só estudo.",
};

async function render(name: string, type: "simples" | "decisao" | "historico" | "narrativa") {
  try {
    const blob = await __out__.Zt(hand, type);
    if (!blob) {
      console.log(name, "-> null");
      return;
    }
    const buf = Buffer.from(await blob.arrayBuffer());
    fs.writeFileSync(`/tmp/cards-live/${name}.png`, buf);
    console.log(name, "ok", buf.length);
  } catch (e: any) {
    console.log(name, "ERR:", e?.message ?? e);
  }
}

fs.mkdirSync("/tmp/cards-live", { recursive: true });
(async () => {
  await render("card_decisao", "decisao");
  await render("card_historico", "historico");
  await render("card_rua_por_rua", "narrativa");
})();

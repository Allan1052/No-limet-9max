// Renderiza os 3 cards REAIS do bundle live (o que o Allan vê no ar) em JSDOM.
// Usa /tmp/live-share-mod.js extraído pelo extract-module.py.
// Stubs necessários: Mt (logo async), Ma (carta grande), Se (roundRect),
// xe/G/re (rankOf/suitOf), Vn/Wn/De (handNameFromCards), wd (streetNarrative),
// Is/$s (cores), A (wrap text), p (clamp).
import { JSDOM } from "jsdom";
import { createCanvas, Image, registerFont } from "canvas";
import * as fs from "node:fs";

const code = fs.readFileSync("/tmp/live-share-mod.js", "utf8");

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
const imgSrc = Object.getOwnPropertyDescriptor(Image.prototype, "src");
if (!imgSrc || !imgSrc.set) {
  Object.defineProperty(Image.prototype, "src", {
    set() {
      (this as unknown as { onload?: () => void }).onload?.();
    },
    get: () => "",
    configurable: true,
  });
}

const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
const SUITS = ["♣", "♦", "♥", "♠"];
const HAND_NAMES = [
  "Carta alta", "Par", "Dois pares", "Trinca", "Sequência", "Flush",
  "Full house", "Quadra", "Straight flush", "Royal flush",
];
const stubs = `
var xe = function(c){ return RANKS[(c-2)%13]; };
var G = function(c){ return Math.floor((c-2)/13)+2; };
var re = function(c){ return (c-2)%4; };
var De = function(cards){ return cards.map(c=>({r:G(c),s:re(c)})); };
var Wn = function(hand){
  var pairs={}, sets={}, runs=0;
  var rs=hand.map(h=>h.r).sort((a,b)=>a-b);
  for(var r of rs){pairs[r]=(pairs[r]||0)+1;}
  var counts=Object.values(pairs).sort((a,b)=>b-a);
  if(counts[0]===4)return 6;
  if(counts[0]===3&&counts[1]===2)return 7;
  if(counts[0]===3)return 3;
  if(counts[0]===2&&counts[1]===2)return 2;
  if(counts[0]===2)return 1;
  var sorted=[...new Set(rs)].sort((a,b)=>a-b);
  var run=1,best=1;
  for(var i=1;i<sorted.length;i++){if(sorted[i]===sorted[i-1]+1){run++;best=Math.max(best,run);}else if(sorted[i]!==sorted[i-1]){run=1;}}
  if(best>=5&&hand.length>=5)return 4;
  var suits=hand.map(h=>h.s);
  var suitCount={};for(var x of suits){suitCount[x]=(suitCount[x]||0)+1;}
  if(Object.values(suitCount).some(v=>v>=5))return 5;
  return 0;
};
var Vn = HAND_NAMES;
var Is = "#1a2e1a";
var $s = "#0c140c";
var p = function(txt, maxW, ctx){ if(ctx.measureText(txt).width<=maxW)return txt; var k=txt; while(k.length>4&&ctx.measureText(k+"…").width>maxW)k=k.slice(0,-1); return k+"…"; };
var A = function(txt, maxW, ctx){ var words=txt.split(" "); var lines=[]; var cur=""; for(var w of words){var t=cur?cur+" "+w:w; if(ctx.measureText(t).width<=maxW)cur=t; else{if(cur)lines.push(cur);cur=w;}} if(cur)lines.push(cur); return lines; };
`;

// Inserir ';' antes de cada função convertida se o char anterior não for ';'/'{'
let patched = code.replace(/(\}?)(async function (Ed|Zd|zd|Zt|Hd|Id|qo|Vs|kn)\(e(?:,[^)]*)?\)\{)/g, (m, prev, fn) => {
  if (prev === ";" || prev === "\n") return fn;
  return ";" + fn;
});
const wrapped =
  stubs +
  "(function(){" +
  "var __out__={};" +
  patched.replace(/async function (Ed|Zd|zd|Zt|Hd|Id|qo|Vs|kn)\(e(?:,[^)]*)?\)\{/g, (mm, name) => `__out__.${name} = async function(e, a, t, o){`) +
  ";return __out__;})()";
const __out__ = (0, dom.window.eval)(wrapped);

// Implementação real dos stubs de desenho (copiados da lógica do repositório)
const Mt = async (ctx: any, x: number, y: number, size: number) => {
  // logo CF: círculo dourado com CF
  ctx.save();
  ctx.fillStyle = "#0b0906";
  ctx.beginPath();
  ctx.arc(x, y, size / 2 + 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e6c454";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, size / 2 + 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#e6c454";
  ctx.font = `900 ${size * 0.42}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CF", x, y);
  ctx.restore();
};
const Se = (ctx: any, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};
const Ma = (ctx: any, card: number, x: number, y: number, w: number, h: number) => {
  const rank = RANKS[(card - 2) % 13];
  const suitIdx = (card - 2) % 4;
  const suit = SUITS[suitIdx];
  const red = suitIdx === 1 || suitIdx === 2;
  const color = red ? "#c8372e" : "#11100e";
  ctx.save();
  ctx.fillStyle = "#faf6ec";
  ctx.strokeStyle = "#d8d2c0";
  ctx.lineWidth = 2;
  Se(ctx, x, y, w, h, Math.min(10, w * 0.12));
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = `900 ${w * 0.38}px Georgia, serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(rank, x + w * 0.1, y + h * 0.06);
  ctx.font = `${w * 0.3}px Georgia, serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(suit, x + w * 0.9, y + h * 0.94);
  ctx.font = `${w * 0.5}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(suit, x + w / 2, y + h / 2);
  ctx.restore();
};
const wd = (data: any) =>
  (data.actionLog || []).map((e: any) => ({
    label: e.street,
    heroShort: e.isHero ? e.action : "—",
    villainShort: e.isHero ? "—" : e.action,
  }));

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

const asyncFns = Array.from(code.matchAll(/async function (\w+)\(e\)\{/g)).map((m) => m[1]);
console.log("async fns:", asyncFns);

const outDir = "/tmp/cards-live";
fs.mkdirSync(outDir, { recursive: true });
for (const name of asyncFns) {
  try {
    const blob: Blob = await Promise.race([
      (__out__ as Record<string, (h: unknown) => Promise<Blob | null>>)[name](hand),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout 15s")), 15000)),
    ]);
    if (!blob) {
      console.log(`[WARN] ${name}: nulo`);
      continue;
    }
    const buf = Buffer.from(await blob.arrayBuffer());
    fs.writeFileSync(`${outDir}/live_${name}.png`, buf);
    console.log(`[OK] live_${name}.png ${buf.length}b`);
  } catch (e) {
    console.log(`[ERR] ${name}:`, e instanceof Error ? e.message : e);
  }
}
console.log("done");
process.exit(0);

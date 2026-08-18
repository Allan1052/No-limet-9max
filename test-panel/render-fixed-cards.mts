// Renderiza os 3 cards corrigidos via Chromium + vite dev server (módulo ES real)
// chromium headless roda em localhost:9222 (mesma infra dos screenshot tests do repo)
import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const DEV_URL = "http://localhost:5177";
const OUT_DIR = "/tmp/cards-corrigidos";

type MockData = Record<string, any>;
const HERO_CARDS = [52, 30]; // A♠ J♠
const VILLAIN_CARDS = [47, 13]; // K♥ 5♦
const BOARD: number[] = [13, 47, 46, 21, 10]; // 5♦ K♥ Q♥ 8♠ 3♥

// Mão longa com 4 ruas de ação — força o encurtamento de colunas e o showdown obrigatório
const ACTIONS: MockData[] = [
  { street: "preflop", player: "BTN (você)", action: "raise", amount: 240, chipsBefore: 1000, chipsAfter: 760 },
  { street: "preflop", player: "BB vilão", action: "call", amount: 200, chipsBefore: 1000, chipsAfter: 800 },
  { street: "flop", player: "BB vilão", action: "check", amount: 0, chipsBefore: 800, chipsAfter: 800 },
  { street: "flop", player: "BTN (você)", action: "bet", amount: 300, chipsBefore: 760, chipsAfter: 460 },
  { street: "flop", player: "BB vilão", action: "call", amount: 300, chipsBefore: 800, chipsAfter: 500 },
  { street: "turn", player: "BB vilão", action: "check", amount: 0, chipsBefore: 500, chipsAfter: 500 },
  { street: "turn", player: "BTN (você)", action: "bet", amount: 200, chipsBefore: 460, chipsAfter: 260 },
  { street: "turn", player: "BB vilão", action: "raise", amount: 400, chipsBefore: 500, chipsAfter: 100 },
  { street: "turn", player: "BTN (você)", action: "call", amount: 200, chipsBefore: 260, chipsAfter: 60 },
  { street: "river", player: "BB vilão", action: "check", amount: 0, chipsBefore: 100, chipsAfter: 100 },
  { street: "river", player: "BTN (você)", action: "bet", amount: 60, chipsBefore: 60, chipsAfter: 0 },
  { street: "river", player: "BB vilão", action: "call", amount: 60, chipsBefore: 100, chipsAfter: 40 },
];

const MOCK = {
  heroCards: HERO_CARDS,
  villainCards: VILLAIN_CARDS,
  board: BOARD,
  decision: { street: "turn", recommendation: "call", confidence: 68, options: ["fold", "call", "raise"] as string[] },
  pot: 1240,
  heroStack: 1000,
  villainStack: 1000,
  bigBlind: 40,
  heroPosition: "BTN",
  villainPosition: "BB",
  tournament: { name: "Circuito · Etapa 4", buyIn: 1000 },
  result: { heroChips: 0, villainChips: 1100, pot: 1240 },
  actions: ACTIONS,
  showdown: true,
  heroFinalHand: "Um par de ases",
  villainFinalHand: "Dois pares: reis e damas",
  timestamp: new Date("2026-08-18T00:30:00"),
  equity: { hero: 52, villain: 48 },
  street: "turn",
  recommendation: "call",
};

async function main() {
  const browser = await puppeteer.connect({ browserURL: "http://localhost:9222" });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
  page.on("console", (m) => {
    if (m.type() === "error") console.error("CONSOLE ERROR:", m.text());
  });

  await page.goto(DEV_URL, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    document.documentElement.innerHTML = "";
    document.body.style.margin = "0";
  });

  const results = await page.evaluate(
    async (mock: MockData) => {
      // importar o módulo real via transform do vite
      const mod = await (globalThis as any).import(
        `${location.origin}/src/app/handShareCard.ts`
      );
      const fn = mod.drawHandShareCard as (
        data: any,
        type?: string,
        format?: string
      ) => Promise<Blob>;
      const out: { name: string; blob: Blob }[] = [];
      for (const [name, type] of [
        ["card_decisao", "decisao"],
        ["card_historico", "historico"],
      ] as const) {
        const blob = await fn(mock, type, "1080x1080");
        out.push({ name, blob });
      }
      return out;
    },
    MOCK
  );

  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const r of results) {
    const buf = Buffer.from(await r.blob.arrayBuffer());
    const file = path.join(OUT_DIR, r.name + ".png");
    fs.writeFileSync(file, buf);
    console.log("saved", file, buf.length);
  }
  await page.close();
  await browser.disconnect();
}

main().catch((e) => {
  console.error("FATAL:", e?.message || e);
  process.exit(1);
});

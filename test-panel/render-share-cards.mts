// Renderiza os 3 tipos de card de compartilhamento (decisao, historico, narrativa)
// com dados de uma mão de teste realista, para inspeção visual.
import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";

const PROJECT = "/home/ubuntu/no-limet-9max-audit";
const OUT = "/tmp/cards-claude";
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.connect({ browserURL: "http://localhost:9222" });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });

// dados da mão de teste: 99 vs AJs — "bad beat" clássico
const handData = {
  heroCards: [45, 46], // 9♣ 9♦  (rank 9=(9-2)*4+... ) -> rank 9 = 7*4+... ; 9♣=(9-2)*4+0=28? vamos usar encoding (rank-2)*4+suit
  board: [],
  heroAction: "Call 3.5bb",
  coachAction: "Call",
  rating: "boa",
  coachTip: "Par de nove contra raise de UTG é margem. O vilão tem range forte aqui, mas o preço do call paga para tentar bater a trinca.",
  street: "Pré-Flop",
  tournamentInfo: "Torneio $1.000 · Circuito · 9-max",
  tournamentResult: "4º de 180",
  context: "Vilão aposta 3.5bb de UTG · Stack: 96bb",
  position: "MP",
  stackBB: "96bb",
  stage: "Início",
  equity: 0.38,
  potOdds: 0.28,
  evBB: -0.4,
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
    { name: "Você", cards: [28, 29], isHero: true, won: false }, // 9♣ 9♦ → (9-2)*4+0=28, 9♦=29
    { name: "Vilão", cards: [48, 50], isHero: false, won: true }, // A♣=(14-2)*4+0=48, A♥=50
  ],
};

const script = `
window.__handData = ${JSON.stringify(handData)};
window.__drawDecision = null;
`;
await page.evaluateOnNewDocument(script);

// Carrega o app completo; Vite transforma .ts via o pipeline de dev (tipo="module")
await page.goto("http://localhost:5174/", { waitUntil: "domcontentloaded" });
await page.evaluate(async () => {
  const script = document.createElement("script");
  script.type = "module";
  script.textContent = `
    import * as mod from "/src/app/handShareCard.ts";
    window.__cardMod = mod;
    window.__cardReady = true;
  `;
  window.addEventListener("error", (e) => { window.__cardModError = String(e.message); });
  script.onerror = () => { window.__cardModError = (window.__cardModError || "") + " | onerror"; };
  window.addEventListener("unhandledrejection", (e) => { window.__cardModError = String(e.reason); });
  window.__scriptError = (e) => { (window as any).__cardModError = String(e && e.message ? e.message : e); };
  document.body.appendChild(script);
});
// aguarda o módulo carregar
try {
  await page.waitForFunction(() => (window as any).__cardReady, { timeout: 20000 });
} catch {
  const info = await page.evaluate(() => ({ err: (window as any).__cardModError, hasMod: !!(window as any).__cardMod }));
  console.log("[__cardReady falhou:", JSON.stringify(info));
  throw new Error("módulo não carregou");
}
await new Promise((r) => setTimeout(r, 800));

// Helper para converter data → blob → download
const renderAndSave = async (type: string, mode = "simples") => {
  const blob = await page.evaluate(
    async ([t, m]) => {
      const mod = (window as any).__cardMod;
      const blob = await mod.drawHandShareCard((window as any).__handData, m, t);
      if (!blob) return null;
      const buf = Buffer.from(await blob.arrayBuffer());
      return buf.toString("base64");
    },
    [type, mode],
  );
  if (!blob) {
    console.log(`[WARN] ${type}: blob nulo`);
    return;
  }
  fs.writeFileSync(path.join(OUT, `card_${type}.png`), Buffer.from(blob, "base64"));
  console.log(`[OK] card_${type}.png`);
};

await renderAndSave("decisao");
await renderAndSave("narrativa");
await renderAndSave("historico");

await page.close();
await browser.disconnect();
console.log("done");
process.exit(0);

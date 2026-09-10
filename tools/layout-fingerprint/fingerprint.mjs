// Impressão digital de LAYOUT: mede caixas e estilos-chave nas duas mesas.
// Serve para provar, com número, se desligar uma camada de CSS muda algo.
import { chromium } from "playwright-core";
import fs from "node:fs";

const out = process.argv[2] || "./fp.json";

// Mão fixa (9-max com ante) usada para medir a tela de REVIEW sempre igual.
const HAND = `PokerStars Hand #241299999999: Tournament #3456789012, $10+$1 USD Hold'em No Limit - Level XII (300/600) - 2024/01/15 22:14:33 ET
Table '3456789012 5' 9-max Seat #9 is the button
Seat 1: Alice (12500 in chips)
Seat 2: Bob (9420 in chips)
Seat 3: Carol (21000 in chips)
Seat 4: Dave (9800 in chips)
Seat 5: Hero (15000 in chips)
Seat 6: Frank (16000 in chips)
Seat 7: Gina (7300 in chips)
Seat 8: Hugo (18800 in chips)
Seat 9: Ivan (11100 in chips)
Alice: posts the ante 75
Bob: posts the ante 75
Carol: posts the ante 75
Dave: posts the ante 75
Hero: posts the ante 75
Frank: posts the ante 75
Gina: posts the ante 75
Hugo: posts the ante 75
Ivan: posts the ante 75
Alice: posts small blind 300
Bob: posts big blind 600
*** HOLE CARDS ***
Dealt to Hero [Ah Qs]
Carol: folds
Dave: folds
Hero: raises 700 to 1300
Frank: folds
Gina: folds
Hugo: calls 1300
Ivan: folds
Alice: folds
Bob: folds
*** FLOP *** [Qd 7h 2c]
Hero: bets 1500
Hugo: raises 3000 to 4500
Hero: calls 3000
*** TURN *** [Qd 7h 2c] [Ks]
Hugo: bets 6000
Hero: folds
Uncalled bet (6000) returned to Hugo
Hugo collected 11475 from pot
*** SUMMARY ***
Total pot 11475 | Rake 0
Board [Qd 7h 2c Ks]
Seat 8: Hugo collected (11475)`;

const SEL = [
  ".app", ".play", ".table-wrap.table-modern", ".table-modern .felt", ".tbl-center-col",
  ".table-brand-mark", ".tbl-tips-btn", ".play-exit-btn", ".play-tstatus", ".play-coach-bar",
  ".controls", ".bottom-action-bar", ".action-choice-fold", ".action-choice-call", ".raise-submit",
  ".right-bet-panel", ".raise-size-stack", ".raise-size-option", ".fine-tune-toggle",
  ".seat.hero", ".seat.hero .pod", ".seat.hero .hole .card", ".seat.hero .name", ".seat.hero .stack",
  ".ir-fullscreen", ".ir-head", ".ir-coach", ".ir-table", ".ir-bar", ".ir-round", ".ir-chip",
];

async function snap(page, tag) {
  return await page.evaluate(({ SEL, tag }) => {
    const r = { tag, items: {} };
    const round = (n) => Math.round(n * 10) / 10;
    for (const s of SEL) {
      const els = document.querySelectorAll(s);
      if (!els.length) continue;
      r.items[s] = [...els].slice(0, 12).map((el) => {
        const b = el.getBoundingClientRect();
        const c = getComputedStyle(el);
        return [round(b.x), round(b.y), round(b.width), round(b.height),
                c.fontSize, c.color, c.backgroundColor, c.borderRadius, c.transform, c.zIndex, c.opacity];
      });
    }
    // todos os assentos: posição é o que mais importa
    r.seats = [...document.querySelectorAll(".table-modern .seat")].map((el) => {
      const b = el.getBoundingClientRect();
      return [round(b.x), round(b.y), round(b.width), round(b.height)];
    });
    return r;
  }, { SEL, tag });
}

const b = await chromium.launch({ executablePath: process.env.CF_CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args:["--no-sandbox"] });
const ctx = await b.newContext({ viewport:{width:360,height:800}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
const p = await ctx.newPage();
await p.goto(process.env.CF_URL || "http://127.0.0.1:4173/", { waitUntil:"networkidle" });
await p.waitForTimeout(1000);
for (const s of ["text=Quero melhorar tudo","text=COMEÇAR POR AQUI","text=Pular"]) {
  try { const el=p.locator(s).first(); await el.waitFor({state:"visible",timeout:5000}); await el.click(); await p.waitForTimeout(700);} catch(e){}
}
const res = {};
// ---- MESA DE JOGO ----
await p.locator(".bottom-nav >> text=Treinar").click(); await p.waitForTimeout(900);
await p.locator(".hub-chips >> text=Jogar").first().click(); await p.waitForTimeout(2500);
try { await p.locator("text=NOVA MÃO").first().click(); await p.waitForTimeout(4000); } catch(e){}
res.mesa = await snap(p, "mesa");
await p.screenshot({ path: out.replace(".json", "-mesa.png") });
try { await p.locator(".fine-tune-toggle").first().click(); await p.waitForTimeout(700); } catch(e){}
res.mesaAberta = await snap(p, "mesaAberta");
// ---- REVIEW ----
try { await p.locator(".play-exit-btn").first().click(); await p.waitForTimeout(1200); } catch(e){}
await p.locator(".bottom-nav >> text=Perfil").click({ timeout: 8000 }); await p.waitForTimeout(900);
await p.locator("text=Importar").first().click(); await p.waitForTimeout(1200);
const ta = p.locator("textarea.import-textarea");
await ta.waitFor({ state: "visible", timeout: 8000 });
await ta.fill(HAND);
await p.locator("text=DESCOBRIR MEUS VAZAMENTOS").first().click();
await p.waitForTimeout(3000);
res.review = await snap(p, "review");
await p.screenshot({ path: out.replace(".json", "-review.png") });
fs.writeFileSync(out, JSON.stringify(res, null, 1));
console.log("FP:", out);
await b.close();

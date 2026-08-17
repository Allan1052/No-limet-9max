import puppeteer from "puppeteer-core";
const prefix = process.argv[2] || "anat";
const base = process.argv[3] || "http://localhost:5175";
const browser = await puppeteer.connect({ browserURL: "http://localhost:9222" });
const pages = await browser.pages();
let page = pages.find((p) => p.url().includes("5175"));
if (!page) { page = await browser.newPage(); }
await page.setViewport({ width: 420, height: 920, deviceScaleFactor: 1 });
await page.evaluate(() => { try { localStorage.setItem("poker-sim-lang", "pt"); } catch(e){} });
await page.goto(base + "/", { waitUntil: "networkidle0", timeout: 30000 });
await new Promise((r) => setTimeout(r, 3500));
// fechar overlays
for (let i = 0; i < 6; i++) {
  const r = await page.evaluate(() => {
    const els = [...document.querySelectorAll("div,button,a")].filter((e) => {
      const rect = e.getBoundingClientRect();
      const txt = (e.textContent || "").trim();
      return rect.width > 60 && rect.height > 30 &&
        (txt === "START PLAYING" || txt.includes("Começar") || txt === "Entendi" || txt.startsWith("Jogar"));
    });
    if (els.length) { els[0].click(); return "clicked"; }
    return "none";
  });
  if (r === "none") break;
  await new Promise((res) => setTimeout(res, 400));
}
// Estudar
const studyTab = await page.evaluate(() => {
  const els = [...document.querySelectorAll(".bn-item .bn-l")].filter((e) => ["Estudar","Study","Lernen"].includes((e.textContent||"").trim()) && e.offsetParent !== null);
  if (!els.length) return null;
  const r = els[0].getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 };
});
if (!studyTab) throw new Error("aba Estudar nao achada");
await page.mouse.click(studyTab.x, studyTab.y);
await new Promise((r) => setTimeout(r, 1500));
// Anatomia
const anatBtn = await page.evaluate(() => {
  const els = [...document.querySelectorAll(".hub-chip,button")].filter((e) => (e.textContent||"").trim().startsWith("Anatomia") && e.offsetParent !== null);
  if (!els.length) return null;
  const r = els[0].getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 };
});
if (!anatBtn) throw new Error("botão Anatomia nao achado");
await page.mouse.click(anatBtn.x, anatBtn.y);
await new Promise((r) => setTimeout(r, 2000));
// modo Torneio (para liberar os tiers)
const modoT = await page.evaluate(() => {
  const els = [...document.querySelectorAll(".raiox-mode,button")].filter((e) => (e.textContent||"").trim() === "Torneio" && e.offsetParent !== null);
  if (!els.length) return null;
  const r = els[0].getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 };
});
if (modoT) { await page.mouse.click(modoT.x, modoT.y); await new Promise((r)=>setTimeout(r,1200)); }
// micro (default ja selecionado) + elite
const tiers = await page.evaluate(() => [...document.querySelectorAll(".raiox-tier")].map((e)=>({t:(e.textContent||"").trim()})));
console.log("tiers:", JSON.stringify(tiers));
if (tiers.some((x)=>/Elite|Elite$/i.test(x.t)) || tiers.some((x)=>/elite/i.test(x.t))) {
  await page.evaluate(() => {
    const el = [...document.querySelectorAll(".raiox-tier")].find((e) => /Elite/i.test(e.textContent||""));
    if (el) el.scrollIntoView({ block: "center" });
  });
  await new Promise((r)=>setTimeout(r,700));
  const eliteBtn = await page.evaluate(() => {
    const els = [...document.querySelectorAll(".raiox-tier")].filter((e) => /Elite/i.test(e.textContent||"") && e.offsetParent !== null);
    if (!els.length) return null;
    const r = els[0].getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 };
  });
  console.log("eliteBtn:", eliteBtn);
  if (eliteBtn) {
    await page.mouse.click(eliteBtn.x, eliteBtn.y);
    await new Promise((r)=>setTimeout(r,1500));
  }
}
// screenshot tela cheia
await page.screenshot({ path: `/tmp/${prefix}-anat-full.png`, fullPage: true });
console.log("fullpage ok");
await browser.disconnect();

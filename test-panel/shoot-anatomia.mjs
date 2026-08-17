import puppeteer from "puppeteer-core";

const prefix = process.argv[2] || "anat"; // antes | depois
const base = process.argv[3] || "http://localhost:5175"; // URL base (ar = https://calloufold.com.br)
const browser = await puppeteer.connect({ browserURL: "http://localhost:9222" });
const pages = await browser.pages();
let page = pages.find((p) => p.url().includes("5175"));
if (!page) {
  page = await browser.newPage();
  await page.goto(base + "/", { waitUntil: "networkidle0", timeout: 30000 });
}
await page.setViewport({ width: 420, height: 920, deviceScaleFactor: 1 });
// Forcar idioma PT para prints consistentes
await page.evaluate(() => {
  try {
    localStorage.setItem("poker-sim-lang", "pt");
    const keys = Object.keys(localStorage);
    const langKey = keys.find((k) => /^cof-?.*lang/i.test(k));
    if (langKey) localStorage.setItem(langKey, "pt");
  } catch (e) {}
});
await page.goto(base + "/", { waitUntil: "networkidle0", timeout: 30000 });
await new Promise((r) => setTimeout(r, 3500));
const ready = await page.evaluate(() => (document.body.innerText || "").includes("AQUI"));
console.log("ready:", ready);
await page.screenshot({ path: "/tmp/anat-debug.png" });
const navText = await page.evaluate(() => {
  const nav = document.querySelector(".bottom-nav");
  return nav ? nav.innerText : "NO BOTTOM NAV; body snippet: " + (document.body.innerText || "").slice(0, 200);
});
console.log("nav:", JSON.stringify(navText));

// Fechar overlays
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

// Ir para a aba Estudar (nav inferior) e depois Anatomia
const studyTab = await page.evaluate(() => {
  const els = [...document.querySelectorAll(".bn-item .bn-l")].filter((e) => {
    const t = (e.textContent || "").trim();
    return (t === "Estudar" || t === "Study" || t === "Lernen") && e.offsetParent !== null;
  });
  if (!els.length) return null;
  const r = els[0].getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
console.log("studyTab:", studyTab);
if (!studyTab) throw new Error("aba Estudar não achada");
await page.mouse.click(studyTab.x, studyTab.y);
await new Promise((r) => setTimeout(r, 1500));

const anatBtn = await page.evaluate(() => {
  const els = [...document.querySelectorAll(".hub-chip,button")].filter((e) => {
    const t = (e.textContent || "").trim();
    return (t === "Anatomia" || t === "Anatomy" || t.startsWith("Anatomia")) && e.offsetParent !== null;
  });
  if (!els.length) return null;
  const r = els[0].getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
console.log("anatBtn:", anatBtn);
if (!anatBtn) throw new Error("botão Anatomia não achado");
await page.mouse.click(anatBtn.x, anatBtn.y);
await new Promise((r) => setTimeout(r, 2000));

// 1) Anatomia com faixa MICRO (default)
await page.screenshot({ path: `/tmp/${prefix}-anat-micro.png` });
console.log("micro ok");

// Trocar para ELITE e capturar — os chips de tier podem estar fora da viewport
const tierInfo = await page.evaluate(() => {
  const els = [...document.querySelectorAll(".raiox-tier")];
  return els.map((e) => ({ t: (e.textContent || "").trim(), y: e.getBoundingClientRect().y, on: e.className.includes(" on") }));
});
console.log("tiers:", JSON.stringify(tierInfo));
if (tierInfo.some((x) => /Elite/i.test(x.t))) {
  // rolar até o tier Elite
  await page.evaluate(() => {
    const el = [...document.querySelectorAll(".raiox-tier")].find((e) => /Elite/i.test(e.textContent || ""));
    if (el) el.scrollIntoView({ block: "center" });
  });
  await new Promise((r) => setTimeout(r, 800));
  const eliteBtn = await page.evaluate(() => {
    const els = [...document.querySelectorAll(".raiox-tier")].filter((e) => /Elite/i.test(e.textContent || "") && e.offsetParent !== null);
    if (!els.length) return null;
    const r = els[0].getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  console.log("eliteBtn:", eliteBtn);
  if (eliteBtn) {
    await page.mouse.click(eliteBtn.x, eliteBtn.y);
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: `/tmp/${prefix}-anat-elite.png` });
    console.log("elite ok");
  }
} else {
  console.log("AVISO: sem chips de tier visíveis nesta página");
}

// Scrollar para baixo e capturar a parte do raio-x (opcional)
await page.evaluate(() => window.scrollBy(0, 400));
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: `/tmp/${prefix}-anat-raiox.png` });
console.log("raiox ok");
await browser.disconnect();

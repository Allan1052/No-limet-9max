import puppeteer from "puppeteer-core";
const browser = await puppeteer.connect({ browserURL: "http://localhost:9222" });
const pages = await browser.pages();
const page = pages.find((p) => p.url().includes("5175"));
if (!page) { await browser.disconnect(); process.exit(1); }
await page.setViewport({ width: 420, height: 920 });
// Expandir toggle se fechado
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => (b.textContent || "").includes("pontuação funciona"));
  if (btn && btn.textContent.trim().startsWith("▸")) btn.click();
});
await new Promise((r) => setTimeout(r, 900));
// Capturar o elemento da seção GTO
const res = await page.evaluate(() => {
  const el = [...document.querySelectorAll("*")].find((e) => (e.textContent || "").includes("As recomendações não são chute") && e.children.length < 25);
  if (!el) return "not-found";
  el.scrollIntoView({ block: "center" });
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height, top: document.documentElement.scrollTop };
});
console.log("rect:", JSON.stringify(res));
if (res !== "not-found") {
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({
    path: "/tmp/gto-seal.png",
    clip: { x: 0, y: Math.max(0, res.y + res.top), width: 420, height: Math.min(920, res.h + 120) }
  });
}
await browser.disconnect();
process.exit(0);

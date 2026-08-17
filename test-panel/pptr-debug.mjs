import puppeteer from "puppeteer-core";
const browser = await puppeteer.connect({ browserURL: "http://localhost:9222" });
const pages = await browser.pages();
for (const p of pages) console.log("PAGE:", p.url().slice(0, 60));
const page = pages.find((p) => p.url().includes("5175"));
console.log("using:", !!page);
if (!page) { await browser.disconnect(); process.exit(1); }
const before = await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => (b.textContent || "").includes("pontuação funciona"));
  if (!btn) return "no-btn";
  btn.click();
  return btn.textContent.trim().slice(0, 2);
});
await new Promise((r) => setTimeout(r, 1200));
const after = await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => (b.textContent || "").includes("pontuação funciona"));
  return btn ? btn.textContent.trim().slice(0, 2) : "none";
});
console.log("before/after:", before, "/", after);
await browser.disconnect();
process.exit(0);

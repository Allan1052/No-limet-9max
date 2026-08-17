import puppeteer from "puppeteer-core";
const browser = await puppeteer.connect({ browserURL: "http://localhost:9222" });
const pages = await browser.pages();
const page = pages.find((p) => p.url().includes("5175"));
if (!page) { await browser.disconnect(); process.exit(1); }
await page.setViewport({ width: 420, height: 920 });
// Rolar para baixo dentro do toggle expandido (o texto começa depois dos bullets)
const res = await page.evaluate(() => {
  const el = [...document.querySelectorAll("*")].find((e) => (e.textContent || "").includes("As recomendações não são chute") && e.children.length < 25);
  if (!el) return "not-found";
  const r = el.getBoundingClientRect();
  let c = el.parentElement;
  while (c && c !== document.body) {
    if (c.scrollHeight > c.clientHeight) { c.scrollTop += 600; break; }
    c = c.parentElement;
  }
  return { y: r.y, h: r.height };
});
console.log("rect:", JSON.stringify(res));
if (res !== "not-found") {
  await new Promise((r) => setTimeout(r, 600));
  const yNow = await page.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => (e.textContent || "").includes("As recomendações não são chute") && e.children.length < 25);
    return el ? el.getBoundingClientRect().y : null;
  });
  console.log("yNow:", yNow);
  await page.screenshot({
    path: "/tmp/gto-seal2.png",
    clip: { x: 0, y: Math.max(0, (yNow ?? 0) - 20), width: 420, height: 560 }
  });
}
await browser.disconnect();
process.exit(0);

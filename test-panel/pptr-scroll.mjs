import puppeteer from "puppeteer-core";
const browser = await puppeteer.connect({ browserURL: "http://localhost:9222" });
const pages = await browser.pages();
const page = pages.find((p) => p.url().includes("5175")) || pages[0];
// Clicar até abrir (verificar símbolo atual)
for (let i = 0; i < 2; i++) {
  const sym = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) => (b.textContent || "").includes("pontuação funciona"));
    return btn ? btn.textContent.trim().slice(0, 2) : "none";
  });
  if (sym === "▾") break;
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) => (b.textContent || "").includes("pontuação funciona"));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 900));
}
await new Promise((r) => setTimeout(r, 800));
const sym2 = await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => (b.textContent || "").includes("pontuação funciona"));
  return btn ? btn.textContent.trim().slice(0, 2) : "none";
});
console.log("sym:", sym2);
await page.evaluate(() => {
  const els = [...document.querySelectorAll("*")].filter((e) => (e.textContent || "").includes("Motor validado") && e.children.length < 12);
  if (els[0]) els[0].scrollIntoView({ block: "center" });
});
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: "/tmp/gto-section.png" });
await browser.disconnect();
process.exit(0);

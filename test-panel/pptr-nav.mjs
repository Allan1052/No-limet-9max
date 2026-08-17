import puppeteer from "puppeteer-core";

const browser = await puppeteer.connect({
  browserURL: "http://localhost:9222",
  defaultViewport: { width: 400, height: 900 },
});
const pages = await browser.pages();
const page = pages[0] || (await browser.newPage());
await page.setViewport({ width: 400, height: 900 });
await page.goto("http://localhost:5175/", { waitUntil: "networkidle2", timeout: 30000 });
await new Promise((r) => setTimeout(r, 4500));

// Fechar onboarding + guided hand (clique em todos os botões visíveis com texto)
for (const selector of ["button.btn.primary", ".onboard button", ".guided button", "button"]) {
  const btns = await page.$$("button");
  for (const b of btns) {
    const txt = await b.evaluate((el) => el.textContent || "");
    if (txt.length > 0 && txt.length < 60) {
      await b.click({ force: true }).catch(() => {});
      await new Promise((r) => setTimeout(r, 800));
    }
  }
}
await new Promise((r) => setTimeout(r, 1000));

await page.evaluate(() =>
  window.dispatchEvent(new CustomEvent("nav-to", { detail: "ranking" })),
);
await new Promise((r) => setTimeout(r, 4500));

// Expandir "Como a pontuação funciona"
const toggles = await page.$$("button, [role=button]");
for (const t of toggles) {
  const txt = await t.evaluate((el) => el.textContent || "");
  if (txt.includes("pontua") && txt.includes("funciona")) {
    await t.click();
    break;
  }
}
await new Promise((r) => setTimeout(r, 2000));

await page.screenshot({ path: "/tmp/ranking-gto.png" });
console.log("ok /tmp/ranking-gto.png");
await browser.disconnect();
process.exit(0);

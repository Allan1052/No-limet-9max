import puppeteer from "puppeteer-core";

const browser = await puppeteer.connect({ browserURL: "http://localhost:9222" });
const pages = await browser.pages();
let page = pages.find((p) => p.url().includes("5175"));
if (!page) {
  page = await browser.newPage();
  await page.goto("http://localhost:5175/", { waitUntil: "networkidle0", timeout: 30000 });
}
await page.setViewport({ width: 420, height: 920, deviceScaleFactor: 1 });

const snap = async (name, ms = 1200) => {
  await new Promise((r) => setTimeout(r, ms));
  await page.screenshot({ path: `/tmp/antes-${name}.png` });
  console.log(name, "ok");
};

// Garantir que estamos na página
if (!page.url().includes("5175")) {
  await page.goto("http://localhost:5175/", { waitUntil: "networkidle0", timeout: 30000 });
}
await new Promise((r) => setTimeout(r, 3000));

// Fechar overlays repetidamente (onboarding, guided, welcome)
for (let i = 0; i < 6; i++) {
  const r = await page.evaluate(() => {
    const cands = ["START PLAYING", "Começar", "Entendi", "Jogar"].map((t) => t);
    const els = [...document.querySelectorAll("div,button,a")].filter((e) => {
      const rect = e.getBoundingClientRect();
      const txt = (e.textContent || "").trim();
      return rect.width > 60 && rect.height > 30 && cands.includes(txt);
    });
    if (els.length) { els[0].click(); return "clicked"; }
    // também tentar elementos com onclick de fechar (X)
    const closeBtn = [...document.querySelectorAll("[class*=close], .x-btn, [aria-label=Fechar]")];
    if (closeBtn.length) { closeBtn[0].click(); return "closed"; }
    return "none";
  });
  if (r === "none") break;
  await new Promise((res) => setTimeout(res, 400));
}
await snap("1-mesa");

// Nova mão — botão com texto NEW HAND (pode estar com texto traduzido? screenshot mostra "NEW HAND")
const nh = await page.evaluate(() => {
  const els = [...document.querySelectorAll("button,div,span,a")];
  const el = els.find((e) => {
    const rect = e.getBoundingClientRect();
    return rect.width > 80 && rect.height > 30 && (e.textContent || "").trim().startsWith("NEW HAND");
  });
  if (el) { el.click(); return "ok"; }
  return "notfound:" + document.body.innerText.slice(0, 40);
});
console.log("newhand:", nh);
await snap("1b-mesa-mao", 4000);

// Ranking (último item antes do Profile; pela screenshot: Ranking x≈289? Não: na screenshot 420px, BottomNav: Play 25, Train 118, Study 199, Ranking 289, Profile 360, y≈900)
await page.mouse.click(289, 902);
await snap("2-ranking", 1500);

// Perfil
await page.mouse.click(360, 902);
await snap("3-perfil", 1500);

await browser.disconnect();
process.exit(0);

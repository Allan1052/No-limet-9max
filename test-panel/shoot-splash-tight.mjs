import puppeteer from "puppeteer-core";
const browser = await puppeteer.connect({ browserURL: "http://localhost:9222", defaultViewport: { width: 400, height: 900 } });
const p = await browser.newPage();
await p.setViewport({ width: 400, height: 900 });
// goto SEM waitUntil: mede o que o browser mostra IMEDIATAMENTE (estado natural de abertura)
p.goto("http://localhost:4173/?cb=splashTight").catch(() => {});
const shots = [[100, "100ms"], [250, "250ms"], [600, "600ms"], [1200, "1200ms"]];
for (const [ms, label] of shots) {
  await new Promise((r) => setTimeout(r, ms));
  const info = await p.evaluate(() => {
    const splash = document.querySelector(".splash-screen");
    const root = document.getElementById("root");
    return {
      splashVisible: splash ? splash.offsetParent !== null : false,
      splashClass: splash ? splash.className : null,
      rootChildren: root ? root.children.length : -1,
      hasTopbar: !!document.querySelector(".topbar"),
    };
  });
  console.log(`t=${label}`, JSON.stringify(info));
  if (label === "100ms" || label === "600ms") await p.screenshot({ path: `/tmp/splash-tight-${label}.png` });
}
await browser.disconnect();

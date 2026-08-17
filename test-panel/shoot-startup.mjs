import puppeteer from "puppeteer-core";

const browser = await puppeteer.connect({
  browserURL: "http://localhost:9222",
  defaultViewport: { width: 400, height: 900 },
});

// Cada medição usa aba nova para simular abertura fria
const times = [300, 1000, 2000, 4000];
for (let i = 0; i < times.length; i++) {
  const p = await browser.newPage();
  await p.setViewport({ width: 400, height: 900 });
  await p.goto("http://localhost:4173/?cb=" + Date.now() + i, { waitUntil: "load", timeout: 30000 });
  await new Promise((r) => setTimeout(r, times[i]));
  const info = await p.evaluate(() => {
    const splash = document.querySelector(".splash-screen");
    const root = document.getElementById("root");
    const lh = document.getElementById("landing-hero");
    return {
      splashVisible: splash ? splash.offsetParent !== null : false,
      splashClass: splash ? splash.className : null,
      rootChildren: root ? root.children.length : -1,
      hasApp: !!document.querySelector(".app"),
      hasTopbar: !!document.querySelector(".topbar"),
      lhVisible: lh ? lh.offsetParent !== null : false,
    };
  });
  console.log(`t=${times[i]}ms`, JSON.stringify(info));
  if (i === 0 || i === 3) await p.screenshot({ path: `/tmp/startup-${times[i]}ms.png` });
  await p.close();
}
await browser.disconnect();

import puppeteer from "puppeteer-core";
const browser = await puppeteer.connect({ browserURL: "http://localhost:9222", defaultViewport: { width: 400, height: 900 } });
for (const t of [1000, 3000]) {
  const p = await browser.newPage();
  await p.setViewport({ width: 400, height: 900 });
  await p.goto("https://calloufold.com.br/?cb=live" + Date.now() + t, { waitUntil: "load", timeout: 30000 });
  await new Promise((r) => setTimeout(r, t));
  const info = await p.evaluate(() => {
    const splash = document.querySelector(".splash-screen");
    const lh = document.getElementById("landing-hero");
    return {
      splashVisible: splash ? splash.offsetParent !== null : false,
      hasApp: !!document.querySelector(".app"),
      hasTopbar: !!document.querySelector(".topbar"),
      lhVisible: lh ? lh.offsetParent !== null : false,
    };
  });
  console.log(`LIVE t=${t}ms`, JSON.stringify(info));
  await p.screenshot({ path: `/tmp/live-${t}ms.png` });
  await p.close();
}
await browser.disconnect();

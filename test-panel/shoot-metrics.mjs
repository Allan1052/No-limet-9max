import puppeteer from "puppeteer-core";
const browser = await puppeteer.connect({ browserURL: "http://localhost:9222", defaultViewport: { width: 400, height: 900 } });
const p = await browser.newPage();
await p.setViewport({ width: 400, height: 900 });
await p.goto("http://localhost:4173/?cb=met" + Date.now(), { waitUntil: "networkidle2", timeout: 30000 });
const nav = await p.evaluate(() => {
  const e = performance.getEntriesByType("navigation")[0];
  const fcp = performance.getEntriesByType("paint").find(x => x.name === "first-contentful-paint");
  return { domContentLoaded: Math.round(e.domContentLoadedEventEnd), loadEvent: Math.round(e.loadEventEnd), fcp: fcp ? Math.round(fcp.startTime) : null, transferSize: Math.round(e.transferSize) };
});
console.log("NAV", JSON.stringify(nav));
await browser.disconnect();

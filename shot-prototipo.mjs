import { execSync } from "node:child_process";
import puppeteer from "puppeteer-core";
const b = await puppeteer.connect({ browserURL: "http://localhost:9222", defaultViewport: { width: 1080, height: 1080 } });
const p = await b.newPage();
await p.goto("file:///tmp/card-premium.html", { waitUntil: "networkidle0", timeout: 30000 });
await p.screenshot({ path: "/tmp/prototipo-card-A.png" });
await b.disconnect();
console.log("OK");

import puppeteer from "puppeteer-core";
const browser = await puppeteer.connect({ browserURL: "http://localhost:9222" });
const pages = await browser.pages();
let page = pages.find((p) => p.url().includes("5175"));
if (!page) { page = await browser.newPage(); await page.setViewport({width:420,height:920}); await page.goto("http://localhost:5175/", {waitUntil:"networkidle0"}); }
await page.evaluate(() => localStorage.setItem("poker-sim-lang","pt"));
await page.goto("http://localhost:5175/", {waitUntil:"networkidle0"});
await new Promise(r=>setTimeout(r,3000));
// overlays
for (let i=0;i<6;i++){
  const r = await page.evaluate(()=>{
    const els=[...document.querySelectorAll("div,button,a")].filter(e=>{const rc=e.getBoundingClientRect();const t=(e.textContent||"").trim();return rc.width>60&&rc.height>30&&(t==="START PLAYING"||t.includes("Começar")||t==="Entendi"||t.startsWith("Jogar"));});
    if(els.length){els[0].click();return"clicked";}return"none";
  }); if(r==="none")break; await new Promise(r=>setTimeout(r,400));
}
// Estudar
const st = await page.evaluate(()=>{const els=[...document.querySelectorAll(".bn-item .bn-l")].filter(e=>["Estudar","Study"].includes((e.textContent||"").trim())&&e.offsetParent!==null);if(!els.length)return null;const r=els[0].getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});
await page.mouse.click(st.x,st.y); await new Promise(r=>setTimeout(r,1500));
// Anatomia
const ab = await page.evaluate(()=>{const els=[...document.querySelectorAll(".hub-chip,button")].filter(e=>(e.textContent||"").trim().startsWith("Anatomia")&&e.offsetParent!==null);if(!els.length)return null;const r=els[0].getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});
await page.mouse.click(ab.x,ab.y); await new Promise(r=>setTimeout(r,2000));
const probe = await page.evaluate(()=>{
  const out={};
  const body=document.body.innerText;
  out.hasAnatomiaTitle = body.includes("Anatomia do torneio");
  out.modes=[...document.querySelectorAll(".raiox-mode")].map(e=>({t:(e.textContent||"").trim(),on:e.className.includes("on"),vis:e.offsetParent!==null}));
  out.tiers=[...document.querySelectorAll(".raiox-tier")].map(e=>({t:(e.textContent||"").trim(),vis:e.offsetParent!==null}));
  out.raioxTitle = body.includes("Seu Raio-X");
  const raioxEl = document.querySelector(".raiox");
  out.raioxRect = raioxEl ? raioxEl.getBoundingClientRect() : null;
  return out;
});
console.log(JSON.stringify(probe,null,1));
await browser.disconnect();

import puppeteer from "puppeteer-core";
const browser = await puppeteer.connect({ browserURL: "http://localhost:9222" });
const pages = await browser.pages();
let page = pages.find((p) => p.url().includes("5175")) || await browser.newPage();
await page.setViewport({width:420,height:920});
await page.evaluate(() => localStorage.setItem("poker-sim-lang","pt"));
await page.goto("http://localhost:5175/", {waitUntil:"networkidle0"});
await new Promise(r=>setTimeout(r,3000));
for (let i=0;i<6;i++){
  const r = await page.evaluate(()=>{
    const els=[...document.querySelectorAll("div,button,a")].filter(e=>{const rc=e.getBoundingClientRect();const t=(e.textContent||"").trim();return rc.width>60&&rc.height>30&&(t==="START PLAYING"||t.includes("Começar")||t==="Entendi"||t.startsWith("Jogar"));});
    if(els.length){els[0].click();return"clicked";}return"none";
  }); if(r==="none")break; await new Promise(r=>setTimeout(r,400));
}
const st = await page.evaluate(()=>{const els=[...document.querySelectorAll(".bn-item .bn-l")].filter(e=>["Estudar","Study"].includes((e.textContent||"").trim())&&e.offsetParent!==null);if(!els.length)return null;const r=els[0].getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});
await page.mouse.click(st.x,st.y); await new Promise(r=>setTimeout(r,1500));
const ab = await page.evaluate(()=>{const els=[...document.querySelectorAll(".hub-chip,button")].filter(e=>(e.textContent||"").trim().startsWith("Anatomia")&&e.offsetParent!==null);if(!els.length)return null;const r=els[0].getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});
await page.mouse.click(ab.x,ab.y); await new Promise(r=>setTimeout(r,2000));
// clicar no botao Torneio (index do evaluate)
await page.evaluate(()=>{
  const els=[...document.querySelectorAll(".raiox-mode")];
  const el=[...els].find(e=>(e.textContent||"").trim()==="Torneio");
  if(el) el.click();
});
await new Promise(r=>setTimeout(r,1500));
const probe = await page.evaluate(()=>{
  const out={};
  const all=[...document.querySelectorAll("[class*='raiox']")];
  out.raioxClasses=[...new Set(all.map(e=>e.className.split(" ").filter(c=>c.startsWith("raiox"))).flat())];
  out.tiers=[...document.querySelectorAll("[class*='tier']")].map(e=>({cls:e.className,t:(e.textContent||"").trim().slice(0,12)}));
  const modes=[...document.querySelectorAll(".raiox-mode")].map(e=>({t:(e.textContent||"").trim(),on:e.className.includes("on")}));
  out.modes=modes;
  return out;
});
console.log(JSON.stringify(probe,null,1));
await browser.disconnect();

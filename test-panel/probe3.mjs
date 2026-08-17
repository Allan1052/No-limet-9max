import puppeteer from "puppeteer-core";
const browser = await puppeteer.connect({ browserURL: "http://localhost:9222" });
const pages = await browser.pages();
let page = pages.find((p) => p.url().includes("5175")) || await browser.newPage();
await page.setViewport({width:420,height:920});
await page.evaluate(() => localStorage.setItem("poker-sim-lang","pt"));
await page.goto("https://calloufold.com.br/", {waitUntil:"networkidle0"});
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
// clicar Torneio via evaluate
await page.evaluate(()=>{const els=[...document.querySelectorAll(".raiox-mode")];const el=[...els].find(e=>(e.textContent||"").trim()==="Torneio");if(el)el.click();});
await new Promise(r=>setTimeout(r,1200));
// screenshot micro fullPage
await page.evaluate(()=>window.scrollTo(0,0)); await new Promise(r=>setTimeout(r,500));
await page.screenshot({path:"/tmp/antes-anat-torneio-micro-ar.png",fullPage:true});
console.log("micro fullpage ok");
// clicar Elite via evaluate e screenshot
await page.evaluate(()=>{const els=[...document.querySelectorAll(".raiox-tier")];const el=[...els].find(e=>/Elite/i.test(e.textContent||""));if(el){el.scrollIntoView({block:"center"});el.click();}});
await new Promise(r=>setTimeout(r,1500));
await page.evaluate(()=>window.scrollTo(0,0)); await new Promise(r=>setTimeout(r,500));
await page.screenshot({path:"/tmp/antes-anat-torneio-elite-ar.png",fullPage:true});
console.log("elite fullpage ok");
await browser.disconnect();

import puppeteer from "puppeteer-core";

const browser = await puppeteer.connect({ browserURL: "http://localhost:9222" });
const pages = await browser.pages();
let page = pages.find((p) => p.url().includes("5175"));
if (!page) {
  page = await browser.newPage();
  await page.goto("http://localhost:5175/", { waitUntil: "networkidle0", timeout: 30000 });
}
await page.setViewport({ width: 420, height: 920, deviceScaleFactor: 1 });
await page.goto("http://localhost:5175/", { waitUntil: "networkidle0", timeout: 30000 });
await new Promise((r) => setTimeout(r, 3500));
const ready = await page.evaluate(() => (document.body.innerText || "").includes("AQUI"));
console.log("url:", page.target().url(), "ready:", ready);
if (!ready) { throw new Error("app não carregou"); }

const snap = async (name, ms = 1200) => {
  await new Promise((r) => setTimeout(r, ms));
  await page.screenshot({ path: `/tmp/depois-${name}.png` });
  console.log(name, "ok");
};

// Fechar overlays
for (let i = 0; i < 6; i++) {
  const r = await page.evaluate(() => {
    const els = [...document.querySelectorAll("div,button,a")].filter((e) => {
      const rect = e.getBoundingClientRect();
      const txt = (e.textContent || "").trim();
      return rect.width > 60 && rect.height > 30 &&
        (txt === "START PLAYING" || txt.includes("Começar") || txt === "Entendi" || txt.startsWith("Jogar"));
    });
    if (els.length) { els[0].click(); return "clicked"; }
    return "none";
  });
  if (r === "none") break;
  await new Promise((res) => setTimeout(res, 400));
}

// 1) Mesa antes de jogar
await snap("1-mesa");

// Mudar para aba Play (mão normal, inicia direto): clicar no item 'Play' da topbar
const tab = await page.evaluate(() => {
  const t = [...document.querySelectorAll("[class*='tab'], button, div")].find((e) => e.textContent.trim() === "Play" && e.offsetParent !== null);
  if (!t) return null;
  const r = t.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
if (tab) {
  await page.mouse.click(tab.x, tab.y);
  console.log("aba Play clicada");
  await new Promise((r) => setTimeout(r, 1500));
}
await snap("1b-mesa-pos-newhand", 1500);

// Iniciar uma mão: clicar NEW HAND
const nh = await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((e) => /NEW HAND/i.test(e.textContent));
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
if (nh) {
  await page.mouse.click(nh.x, nh.y);
  console.log("NEW HAND clicado");
  await new Promise((r) => setTimeout(r, 2500));
} else {
  console.log("NEW HAND não encontrado");
}
await snap("1b-mesa-pos-newhand", 1500);

// Jogar várias ações: clicar sempre no primeiro botão habilitado (Call/Check/Fold etc.) via coordenadas
let acted = 0;
while (acted < 20) {
  const r = await page.evaluate(() => {
    const btns = [...document.querySelectorAll(".controls .action-row button")]
      .filter((e) => !e.disabled && e.offsetParent !== null)
      .filter((e) => !e.classList.contains("unit-toggle"));
    const order = [/^Call/i, /^Check/i, /^Fold/i, /raise|bet/i, /all[- ]?in/i];
    let chosen = null;
    for (const re of order) {
      chosen = btns.find((b) => re.test(b.textContent));
      if (chosen) break;
    }
    if (!chosen && btns.length) chosen = btns[0];
    if (!chosen) return "no-btn";
    const rect = chosen.getBoundingClientRect();
    window.__lastBtn = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, t: chosen.textContent.trim().slice(0, 25) };
    return "ok";
  });
  if (r === "no-btn") {
    const dbg = await page.evaluate(() => {
      const all = [...document.querySelectorAll(".controls .action-row button")].map((b) => b.textContent.trim() + "[" + (b.disabled ? "x" : "o") + "]").join(" ");
      return { all, ctrl: !!document.querySelector(".controls"), body: document.body.textContent.slice(0, 120) };
    });
    console.log("no-btn dbg:", JSON.stringify(dbg));
    // Se não há controles na tela, a mão acabou — sai do loop
    if (!dbg.ctrl) break;
    await new Promise((res) => setTimeout(res, 1500));
    acted++; // conta tentativas para não travar
    if (acted >= 40) break;
    continue;
  }
  const { x, y, t } = await page.evaluate(() => window.__lastBtn);
  await page.mouse.click(x, y);
  acted++;
  console.log(acted, "clique:", t);
  await new Promise((res) => setTimeout(res, 900));
}
console.log("ações:", acted);
await snap("2-mesa-jogando");

// Se apareceu resumo/modal de fim de mão, capturar
const modal = await page.evaluate(() => {
  const els = [...document.querySelectorAll("div,section")].filter((e) => {
    const r = e.getBoundingClientRect();
    return r.width > 200 && r.height > 200 && /resumo|Resultado|Result|pontos|points|ITM|plac/i.test(e.textContent);
  });
  return els.length ? "modal" : "none";
});
console.log("modal:", modal);
await snap("3-resumo", 2000);

// Ranking (BottomNav: Play=42, Train=126, Study=210, Ranking=294, Profile=378 — y dentro da barra ~878)
await page.mouse.click(294, 880);
await new Promise((r) => setTimeout(r, 1200));
const urlRank = await page.evaluate(() => location.hash || document.title);
console.log("após clique ranking:", urlRank);
await snap("4-ranking", 1500);

// Perfil
await page.mouse.click(378, 880);
await new Promise((r) => setTimeout(r, 1200));
console.log("após clique perfil:", await page.evaluate(() => location.hash || document.title));
await snap("5-perfil", 1500);

await browser.disconnect();
process.exit(0);

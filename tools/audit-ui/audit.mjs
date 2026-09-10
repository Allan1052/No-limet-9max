/**
 * Régua de auditoria de interface — mede, não olha.
 *
 * Percorre as telas do app num Chromium de verdade, em tamanho de celular, e
 * grava para CADA tela:
 *   - alvos de toque abaixo de 44px (critério 3 da auditoria);
 *   - texto abaixo de 11px (critério 4);
 *   - contraste abaixo de 4,5:1 (critério 5);
 *   - se a página rola para os lados (nunca deveria).
 *
 * Uso: node tools/audit-ui/audit.mjs [saida.json]
 */
import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";

const URL = process.env.CF_URL || "http://127.0.0.1:4173/";
const CHROME = process.env.CF_CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT = process.argv[2] || "/tmp/claude-0/audit.json";
const SHOTS = process.env.CF_SHOTS || "/tmp/claude-0/shots";

const MEDIR = () => {
  const srgb = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
  const parse = (s) => {
    const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const p = m[1].split(",").map((x) => parseFloat(x));
    return { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 };
  };
  // Fundo efetivo. Se qualquer ancestral pintar com IMAGEM/DEGRADÊ, o contraste
  // não é medível por cor computada — devolvemos null em vez de chutar o fundo
  // da página (chutar gera acusação falsa em botão dourado com degradê).
  const fundoDe = (el) => {
    let n = el;
    const camadas = [];
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return null;
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0.01) {
        if (c.a >= 0.99) {
          let base = c.rgb;
          for (let i = camadas.length - 1; i >= 0; i--) {
            const t = camadas[i];
            base = [0, 1, 2].map((k) => t.rgb[k] * t.a + base[k] * (1 - t.a));
          }
          return base;
        }
        camadas.push(c);
      }
      n = n.parentElement;
    }
    let base = [13, 15, 13];
    for (let i = camadas.length - 1; i >= 0; i--) {
      const t = camadas[i];
      base = [0, 1, 2].map((k) => t.rgb[k] * t.a + base[k] * (1 - t.a));
    }
    return base;
  };
  // Emoji e símbolos são desenhos, não texto: contraste de cor não se aplica.
  const soSimbolo = (t) => !/[a-zA-Z0-9À-ÿ]/.test(t);
  const ratio = (fg, bg) => {
    const a = lum(fg) + 0.05, b = lum(bg) + 0.05;
    return a > b ? a / b : b / a;
  };
  const visivel = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) < 0.05) return false;
    return r.bottom > 0 && r.top < innerHeight * 3;
  };
  const rotulo = (el) => {
    const t = (el.innerText || el.getAttribute("aria-label") || el.className || el.tagName).toString();
    return t.replace(/\s+/g, " ").trim().slice(0, 48);
  };

  const toques = [], fontes = [], contrastes = [];
  const vistos = new Set();

  for (const el of document.querySelectorAll('button, a[href], [role="button"], input, select, textarea, [onclick]')) {
    if (!visivel(el)) continue;
    const r = el.getBoundingClientRect();
    const h = Math.round(r.height * 10) / 10, w = Math.round(r.width * 10) / 10;
    if (h < 44 || w < 44) toques.push({ alvo: rotulo(el), classe: el.className?.toString?.().slice(0, 60) || "", w, h });
  }

  for (const el of document.querySelectorAll("*")) {
    if (!el.childNodes.length) continue;
    const texto = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
    if (!texto || texto.length < 2) continue;
    if (!visivel(el)) continue;
    const cs = getComputedStyle(el);
    const fs = Math.round(parseFloat(cs.fontSize) * 10) / 10;
    const chave = `${fs}|${texto.slice(0, 24)}`;
    if (fs < 11 && !vistos.has(chave)) { vistos.add(chave); fontes.push({ texto: texto.slice(0, 44), px: fs, classe: el.className?.toString?.().slice(0, 50) || "" }); }
    const fg = parse(cs.color);
    const bg = fg && fg.a > 0.5 && !soSimbolo(texto) ? fundoDe(el) : null;
    if (bg) {
      const cr = Math.round(ratio(fg.rgb, bg) * 100) / 100;
      const grande = fs >= 18.66 || (fs >= 14 && parseInt(cs.fontWeight, 10) >= 700);
      const min = grande ? 3 : 4.5;
      const ck = `c|${texto.slice(0, 24)}`;
      if (cr < min && !vistos.has(ck)) { vistos.add(ck); contrastes.push({ texto: texto.slice(0, 44), contraste: cr, minimo: min, px: fs }); }
    }
  }

  return {
    toques, fontes, contrastes,
    rolaLateral: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    larguraDoc: document.documentElement.scrollWidth,
    larguraTela: document.documentElement.clientWidth,
  };
};

const b = await chromium.launch({ executablePath: CHROME });
const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("poker-sim-onboarded", "1");
    localStorage.setItem("cof-guided-hand-done", "true");
  } catch { /* ignora */ }
});
const p = await ctx.newPage();
const erros = [];
p.on("pageerror", (e) => erros.push(String(e).slice(0, 200)));
p.on("console", (m) => { if (m.type() === "error") erros.push("console: " + m.text().slice(0, 200)); });

const resultado = { url: URL, telas: {}, errosJs: erros };

async function tela(nome, navegar) {
  try {
    await navegar();
    await p.waitForTimeout(1600);
    const m = await p.evaluate(MEDIR);
    resultado.telas[nome] = m;
    await p.screenshot({ path: `${SHOTS}/aud-${nome}.png`, fullPage: false });
    console.log(`[${nome}] toques<44: ${m.toques.length} | fonte<11: ${m.fontes.length} | contraste<min: ${m.contrastes.length} | rolaLateral: ${m.rolaLateral}`);
  } catch (e) {
    resultado.telas[nome] = { erro: String(e).slice(0, 160) };
    console.log(`[${nome}] FALHOU: ${String(e).slice(0, 120)}`);
  }
}

const irPara = async (rotulo) => {
  const el = await p.$(`nav.bottom-nav >> text=${rotulo}`);
  if (!el) throw new Error(`aba ${rotulo} não encontrada`);
  await el.click();
  await p.waitForTimeout(900);
};
const chip = async (texto) => {
  const el = await p.$(`text="${texto}"`);
  if (!el) throw new Error(`chip ${texto} não encontrado`);
  await el.click();
  await p.waitForTimeout(900);
};

await tela("hoje", async () => { await p.goto(URL, { waitUntil: "networkidle" }); await p.waitForTimeout(1500); });
await tela("treinar", () => irPara("Treinar"));
await tela("estudar", () => irPara("Estudar"));
await tela("perfil", () => irPara("Perfil"));
await tela("ranking", () => chip("Ranking"));
await tela("importar", () => chip("Importar"));

writeFileSync(OUT, JSON.stringify(resultado, null, 2));
console.log("\nERROS JS:", erros.length ? erros.slice(0, 5) : "nenhum");
console.log("saida:", OUT);
await b.close();

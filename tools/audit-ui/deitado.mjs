/**
 * RÉGUA DO CELULAR DEITADO — mede sobreposição, não olha.
 *
 * Nasceu em 14/09/2026, do relato do Allan: "foi mexido bastante, mas até hoje
 * não funcionou de jogar com o celular virado". Lendo o CSS não dava para ver o
 * problema; medindo, apareceram três de uma vez:
 *
 *   1. acima de 860px de largura a folha de TELA CHEIA parava de valer inteira
 *      (os controles ficavam 108px ABAIXO do fim da tela);
 *   2. o anel de assentos, desenhado para uma mesa ALTA, empilhava os pods
 *      deitado — 8 sobreposições e 2 assentos fora da tela;
 *   3. a coluna de atalhos de raise caía em cima do assento da direita.
 *
 * A ferramenta abre a mesa em vários tamanhos deitados e imprime, para cada um:
 * quantos elementos se sobrepõem, quais saem da tela e o quanto os controles
 * passam do fim. O alvo é ZERO em todos.
 *
 * ⚠️ Um teste de vitest NÃO serve para isto: o vitest não carrega arquivos .css,
 * então qualquer asserção sobre o CSS passaria lendo string vazia. Layout se
 * confere no navegador.
 *
 * Uso:
 *   npm run build && npx vite preview --port 4173 --host 127.0.0.1 &
 *   node tools/audit-ui/deitado.mjs
 */
import { chromium } from "playwright-core";

const URL = process.env.CF_URL || "http://127.0.0.1:4173/";
const CHROME = process.env.CF_CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const SHOTS = process.env.CF_SHOTS || "/tmp/claude-0/shots";

/** Tamanhos reais de celular deitado + um retrato de controle. */
const TELAS = [
  ["retrato", 390, 844],
  ["deitado-667", 667, 375],
  ["deitado-740", 740, 340],
  ["deitado-800", 800, 360],
  ["deitado-915", 915, 412],
  ["tablet", 1024, 500],
];

const MEDIR = () => {
  const alvos = [];
  const add = (sel, rot) => {
    const todos = document.querySelectorAll(sel);
    todos.forEach((e, i) => {
      const b = e.getBoundingClientRect();
      if (b.width < 4 || b.height < 4) return;
      const cs = getComputedStyle(e);
      if (cs.visibility === "hidden" || cs.opacity === "0") return;
      alvos.push({ el: e, rot: `${rot}${todos.length > 1 ? `#${i}` : ""}`, x: b.x, y: b.y, r: b.right, bo: b.bottom });
    });
  };
  add(".table-modern .seat", "assento");
  add(".table-modern .seat .name", "nome");
  add(".tbl-solo-btn", "botaoSozinho");
  add(".tbl-tips-btn", "verDicas");
  add(".raise-size-stack", "atalhosRaise");
  add(".play-tstatus", "statusTorneio");
  add(".board, .board-inline", "board");
  add(".play-coach-bar", "dicaBarra");
  add(".play-exit-btn", "sair");
  add(".action-row-primary .action-choice", "botaoAcao");

  const over = [];
  for (let i = 0; i < alvos.length; i++) {
    for (let j = i + 1; j < alvos.length; j++) {
      const A = alvos[i], B = alvos[j];
      // Elemento dentro do outro não é sobreposição (o nome mora no assento).
      if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
      const ix = Math.min(A.r, B.r) - Math.max(A.x, B.x);
      const iy = Math.min(A.bo, B.bo) - Math.max(A.y, B.y);
      if (ix > 6 && iy > 6) over.push(`${A.rot} × ${B.rot} (${Math.round(ix)}x${Math.round(iy)}px)`);
    }
  }
  const fora = alvos
    .filter((a) => a.bo > innerHeight + 2 || a.r > innerWidth + 2 || a.x < -2 || a.y < -2)
    .map((a) => a.rot);
  const ctl = document.querySelector(".controls, .controls-v2");
  return {
    over,
    fora,
    passaDoFim: ctl ? Math.round(ctl.getBoundingClientRect().bottom - innerHeight) : null,
    rolaLado: document.documentElement.scrollWidth > innerWidth + 1,
  };
};

const b = await chromium.launch({ executablePath: CHROME });
let falhas = 0;

for (const [nome, w, h] of TELAS) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const erros = [];
  p.on("pageerror", (e) => erros.push(String(e)));
  const clica = (re) =>
    p.evaluate((r) => {
      const el = [...document.querySelectorAll("button")].filter((e) => e.offsetParent)
        .find((e) => new RegExp(r).test((e.textContent || "").trim()));
      if (el) { el.click(); return true; }
      return false;
    }, re);
  const tap = async (t, ms = 1100) => {
    await p.evaluate((x) => {
      const el = [...document.querySelectorAll("button,a")].find((e) => e.offsetParent && (e.textContent || "").trim() === x);
      if (el) el.click();
    }, t);
    await p.waitForTimeout(ms);
  };

  await p.goto(URL, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1800);
  await tap("Quero melhorar tudo");
  await tap("Começar por aqui");
  await tap("Pular ▸");
  await tap("🎯Treinar", 1400);
  await tap("Jogar", 2400);
  await clica("^Nova mão");
  await p.waitForTimeout(1200);

  const m = await p.evaluate(MEDIR);
  const ok = m.over.length === 0 && m.fora.length === 0 && (m.passaDoFim ?? 0) <= 0 && !m.rolaLado;
  if (!ok) falhas++;
  console.log(`\n${ok ? "✓" : "✗"} ${nome} (${w}x${h})`);
  console.log(`   sobreposições: ${m.over.length} · fora da tela: ${m.fora.length} · controles passam do fim: ${m.passaDoFim}px · rola de lado: ${m.rolaLado}`);
  for (const o of m.over.slice(0, 10)) console.log("     ·", o);
  for (const f of m.fora.slice(0, 10)) console.log("     · FORA:", f);
  if (erros.length) console.log("   ERROS JS:", erros.slice(0, 2));
  await p.screenshot({ path: `${SHOTS}/deitado-${nome}.png` });
  await p.close();
}

console.log(falhas === 0 ? "\nTUDO LIMPO." : `\n${falhas} tela(s) com problema.`);
await b.close();

/**
 * RÉGUA DA MESA — torneio E replay em tela cheia.
 *
 * 14/09/2026. O Allan pediu o replay "igualzinho ao torneio" (tela cheia). Uma
 * mesa que já cabe no torneio não cabe automaticamente no replay: o replay não
 * tem a classe `.app.nav-hidden` nem o container `.play`, então metade das
 * regras de encaixe não valia lá. Esta régua mede as duas no mesmo tamanho de
 * tela e imprime sobreposições, elementos fora da tela e rolagem lateral.
 *
 * Também confere as três correções de 14/09:
 *   - o status do torneio (.tbl-tinfo) ficando ATRÁS de carta e ficha;
 *   - o 🕘 longe dos atalhos de aposta;
 *   - os botões de aposta escondidos fora da vez do herói.
 *
 * Uso: npm run build && npx vite preview --port 4173 & node tools/audit-ui/replay-cheia.mjs
 */
import { chromium } from "playwright-core";

const URL = process.env.CF_URL || "http://127.0.0.1:4173/";
const CHROME = process.env.CF_CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const SHOTS = process.env.CF_SHOTS || "/tmp/claude-0/shots";

const TELAS = [
  ["retrato-390", 390, 844],
  ["retrato-360", 360, 760],
  ["deitado-740", 740, 340],
  ["deitado-915", 915, 412],
];

const MEDIR = (raiz) => {
  const root = document.querySelector(raiz);
  if (!root) return { erro: `sem ${raiz}` };
  const alvos = [];
  const add = (sel, rot) => {
    root.querySelectorAll(sel).forEach((e, i, todos) => {
      const b = e.getBoundingClientRect();
      if (b.width < 4 || b.height < 4) return;
      const cs = getComputedStyle(e);
      if (cs.visibility === "hidden" || cs.opacity === "0") return;
      alvos.push({ el: e, rot: `${rot}${todos.length > 1 ? `#${i}` : ""}`, x: b.x, y: b.y, r: b.right, bo: b.bottom });
    });
  };
  add(".table-modern .seat", "assento");
  add(".tbl-center-col", "board");
  add(".replay-step", "passo");
  add(".replay-nav", "navegacao");
  add(".replay-head", "cabecalho");
  add(".tbl-solo-btn", "botaoSozinho");
  add(".tbl-tips-btn", "verDicas");
  add(".tbl-hist-btn", "botaoHistorico");
  add(".raise-size-stack", "atalhosRaise");
  add(".action-row-primary", "barraAcao");
  add(".play-exit-btn", "sair");

  const over = [];
  for (let i = 0; i < alvos.length; i++) {
    for (let j = i + 1; j < alvos.length; j++) {
      const A = alvos[i], B = alvos[j];
      if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
      const ix = Math.min(A.r, B.r) - Math.max(A.x, B.x);
      const iy = Math.min(A.bo, B.bo) - Math.max(A.y, B.y);
      if (ix > 6 && iy > 6) over.push(`${A.rot} × ${B.rot} (${Math.round(ix)}x${Math.round(iy)}px)`);
    }
  }
  // Dois assentos no MESMO ponto: sinal de anel quebrado (o CSS posiciona por
  // nth-of-type e qualquer div novo na mesa desloca tudo).
  const empilhados = [];
  const vistos = new Map();
  for (const a of alvos) {
    if (!a.rot.startsWith("assento")) continue;
    const chave = `${Math.round(a.x)},${Math.round(a.y)}`;
    if (vistos.has(chave)) empilhados.push(`${vistos.get(chave)} e ${a.rot} no mesmo ponto (${chave})`);
    vistos.set(chave, a.rot);
  }
  const fora = alvos
    .filter((a) => a.bo > innerHeight + 2 || a.r > innerWidth + 2 || a.x < -2 || a.y < -2)
    .map((a) => a.rot);
  return { over, fora, empilhados, rolaLado: document.documentElement.scrollWidth > innerWidth + 1, n: alvos.length };
};

const b = await chromium.launch({ executablePath: CHROME });
let falhas = 0;

for (const [nome, w, h] of TELAS) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const erros = [];
  p.on("pageerror", (e) => erros.push(String(e)));
  // ⚠️ Só clica em botão que o DEDO alcançaria: visível, habilitado e na tela.
  // Sem isso a régua batia em botão escondido (os atalhos de aposta fora da vez
  // do herói ficam com visibility:hidden) e achava que a mesa estava travada.
  const clica = (re) => p.evaluate((r) => {
    const el = [...document.querySelectorAll("button")]
      .filter((e) => e.offsetParent && !e.disabled && getComputedStyle(e).visibility !== "hidden")
      .find((e) => new RegExp(r).test((e.textContent || "").trim()));
    if (el) { el.click(); return true; } return false;
  }, re);
  const tap = async (t, ms = 1100) => {
    await p.evaluate((x) => {
      const el = [...document.querySelectorAll("button,a")].find((e) => e.offsetParent && (e.textContent || "").trim() === x);
      if (el) el.click();
    }, t);
    await p.waitForTimeout(ms);
  };

  await p.goto(URL, { waitUntil: "domcontentloaded" });
  await p.evaluate(() => {
    localStorage.setItem("poker-sim-onboarded", "1");
    localStorage.setItem("cof-guided-hand-done", "true");
  });
  await p.goto(URL, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2000);
  await tap("🎯Treinar", 1200);
  await tap("Torneio", 900);
  await tap("Iniciar torneio", 2200);
  // Joga até a primeira mão fechar (o 🕘 só existe a partir da segunda).
  // ⚠️ Esperar a VEZ do herói é obrigatório desde 14/09: fora da vez os botões
  // de aposta ficam escondidos (visibility), e "clicar" neles não faz nada —
  // a régua gastava as tentativas batendo em botão invisível.
  for (let i = 0; i < 60; i++) {
    if (await p.$(".tbl-hist-btn")) break;
    await clica("^(Fold|Check|Nova mão|Próxima mão)");
    await p.waitForTimeout(600);
  }
  await p.waitForTimeout(500);

  const mesa = await p.evaluate(MEDIR, ".table-wrap");
  // Camada: a info do torneio tem de ficar ATRÁS de carta e ficha.
  const camadas = await p.evaluate(() => {
    const z = (s) => { const e = document.querySelector(s); return e ? getComputedStyle(e).zIndex : null; };
    const ti = document.querySelector(".tbl-tinfo");
    const cc = document.querySelector(".tbl-center-col");
    let cobreBoard = false;
    if (ti && cc) {
      const a = ti.getBoundingClientRect(), c = cc.getBoundingClientRect();
      const ix = Math.min(a.right, c.right) - Math.max(a.x, c.x);
      const iy = Math.min(a.bottom, c.bottom) - Math.max(a.y, c.y);
      // Se eles se cruzam, quem tem de estar por cima é o board.
      if (ix > 6 && iy > 6) cobreBoard = Number(z(".tbl-tinfo")) >= Number(z(".tbl-center-col"));
    }
    return { existe: !!ti, zInfo: z(".tbl-tinfo"), zBoard: z(".tbl-center-col"), zAssento: z(".table-modern .seat"), cobreBoard };
  });
  // Botões de aposta só na vez do herói.
  const controles = await p.evaluate(() => {
    const c = document.querySelector(".controls");
    const vis = (s) => { const e = document.querySelector(s); return e ? getComputedStyle(e).visibility : "ausente"; };
    return { idle: !!c?.classList.contains("controls-idle"), atalhos: vis(".raise-size-stack"), barra: vis(".action-row-primary") };
  });

  // Abre o replay pelo 🕘
  let replay = { over: [], fora: [], rolaLado: false, n: 0 };
  const hb = await p.$(".tbl-hist-btn");
  if (hb) {
    await hb.click();
    await p.waitForTimeout(800);
    await p.evaluate(() => {
      const ov = document.querySelector(".overlay");
      const linha = ov && [...ov.querySelectorAll("div")].find((d) => d.style.cursor === "pointer");
      if (linha) linha.click();
    });
    await p.waitForTimeout(1200);
    if (await p.$(".replay-full")) {
      // PIOR CASO, e determinístico: avança até o fim, onde o board tem as 5
      // cartas e a caixa central fica no tamanho máximo. Medir num passo
      // qualquer dava resultado diferente a cada execução.
      for (let i = 0; i < 40; i++) { if (!(await clica("Próximo"))) break; await p.waitForTimeout(200); }
      replay = await p.evaluate(MEDIR, ".replay-full");
      await p.screenshot({ path: `${SHOTS}/replay-${nome}.png` });
    } else {
      replay = { erro: "replay não abriu" };
    }
  }

  const okMesa = mesa.over?.length === 0 && mesa.fora?.length === 0 && mesa.empilhados?.length === 0 && !mesa.rolaLado;
  const okReplay = !replay.erro && replay.n > 0 && replay.over.length === 0 && replay.fora.length === 0 && (replay.empilhados?.length ?? 0) === 0 && !replay.rolaLado;
  const okCamada = camadas.existe && !camadas.cobreBoard;
  const okControles = controles.idle ? controles.atalhos === "hidden" && controles.barra === "hidden" : true;
  const ok = okMesa && okReplay && okCamada && okControles;
  if (!ok) falhas++;

  console.log(`\n${ok ? "✓" : "✗"} ${nome} (${w}x${h})`);
  console.log(`   MESA    · sobrepõe ${mesa.over?.length} · fora ${mesa.fora?.length} · rola de lado ${mesa.rolaLado} (${mesa.n} elementos)`);
  for (const o of (mesa.over || []).slice(0, 8)) console.log("      ·", o);
  for (const f of (mesa.fora || []).slice(0, 8)) console.log("      · FORA:", f);
  for (const e2 of (mesa.empilhados || [])) console.log("      · EMPILHADO:", e2);
  console.log(`   REPLAY  · ${replay.erro ?? `sobrepõe ${replay.over.length} · fora ${replay.fora.length} · rola de lado ${replay.rolaLado} (${replay.n} elementos)`}`);
  for (const o of (replay.over || []).slice(0, 8)) console.log("      ·", o);
  for (const f of (replay.fora || []).slice(0, 8)) console.log("      · FORA:", f);
  for (const e2 of (replay.empilhados || [])) console.log("      · EMPILHADO:", e2);
  console.log(`   CAMADA  · info do torneio z=${camadas.zInfo} · board z=${camadas.zBoard} · assento z=${camadas.zAssento} · cobre o board: ${camadas.cobreBoard}`);
  console.log(`   BOTÕES  · fora da vez: ${controles.idle} · atalhos ${controles.atalhos} · barra ${controles.barra}`);
  if (erros.length) console.log("   ERROS JS:", erros.slice(0, 2));
  await p.close();
}

console.log(falhas === 0 ? "\nTUDO LIMPO." : `\n${falhas} tela(s) com problema.`);
await b.close();

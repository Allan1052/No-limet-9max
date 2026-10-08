// Gera os PNGs de ícone a partir de public/icon.svg (rodar 1× quando o ícone mudar).
// Uso: node scripts/gerar-icones.mjs   (precisa do Playwright instalado)
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const ler = (nome) => readFileSync(new URL(`../public/${nome}`, import.meta.url), "utf8");
const saidas = [
  { arquivo: "icon-192.png", tamanho: 192, svg: "icon.svg" },
  { arquivo: "icon-512.png", tamanho: 512, svg: "icon.svg" },
  // maskable: o Android recorta em círculo/gota → fundo inteiro e desenho menor
  { arquivo: "icon-maskable-512.png", tamanho: 512, svg: "icon-maskable.svg" },
  // iPhone arredonda sozinho e não aceita transparência
  { arquivo: "apple-touch-icon.png", tamanho: 180, svg: "icon-maskable.svg" },
];

const navegador = await chromium.launch();
const pagina = await navegador.newPage();
for (const s of saidas) {
  await pagina.setViewportSize({ width: s.tamanho, height: s.tamanho });
  await pagina.setContent(
    `<html><body style="margin:0;width:${s.tamanho}px;height:${s.tamanho}px;background:transparent">` +
      `${ler(s.svg).replace("<svg ", '<svg width="100%" height="100%" style="display:block" ')}</body></html>`,
  );
  await pagina.screenshot({ path: new URL(`../public/${s.arquivo}`, import.meta.url).pathname, omitBackground: true });
  console.log("gerado", s.arquivo);
}
await navegador.close();

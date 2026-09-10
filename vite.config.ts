/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { execFileSync } from "node:child_process";

// Caminho base: "/" para domínio customizado calloufold.com.br
// Se voltar para GitHub Pages padrão (allan1052.github.io/No-limet-9max/), mudar para "/No-limet-9max/"
const base = "/";

// CARIMBO DE VERSÃO — precisa ser ESTÁVEL para o mesmo código.
//
// Antes era `new Date().toISOString()`: mudava a cada build, entrava dentro do
// bundle e fazia TODOS os arquivos trocarem de hash mesmo sem mudança de código.
// Efeito no celular do Allan: cada publicação rebaixava o app inteiro (é a
// explicação mais provável do "fechar e reabrir 2x" ser sempre pesado).
//
// Agora vem da DATA DO ÚLTIMO COMMIT: continua sendo uma data de verdade (o
// rótulo do Perfil segue igual), mas dois builds do mesmo commit geram bytes
// idênticos — então o navegador só rebaixa o que realmente mudou.
function resolveBuildId(): string {
  try {
    const iso = execFileSync("git", ["log", "-1", "--format=%cI"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (iso) return iso;
  } catch {
    // sem git (tarball, sandbox): cai no fallback abaixo
  }
  return process.env.SOURCE_DATE_EPOCH
    ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString()
    : "dev";
}

// FAKE_BUILD_ID existe só para reproduzir o teste de determinismo: com ele dá
// para trocar o carimbo e conferir que NENHUM arquivo com hash muda de nome.
const buildId = process.env.FAKE_BUILD_ID || resolveBuildId();

export default defineConfig({
  base,
  build: {
    target: "es2022",
    rollupOptions: {
      input: {
        main: 'index.html',
        'test-ir': 'site/test-ir.html',
      },
      output: {
        format: "es",
        // Performance: TODAS as bibliotecas 3ª-partes num único chunk `vendor`,
        // separado do código do app — as libs só mudam em `npm install` (raro),
        // então o navegador reusa o cache delas entre deploys do app.
        //
        // Antes eram DOIS chunks (vendor + vendor-core), mas a divisão de
        // node_modules era arbitrária e as libs se referenciavam entre os dois
        // chunks → dependência circular (warning "Circular chunk: vendor-core
        // -> vendor -> vendor-core"). Um chunk só elimina o ciclo sem perder o
        // ganho de cache (o código do app já fica em chunks próprios).
        manualChunks: (id) => {
          if (id.includes("node_modules")) return "vendor";
        },
      },
    },
  },
  esbuild: {
    target: "es2022",
  },
  plugins: [
    react(),
    // O carimbo de versão NÃO entra no bundle: vai como <meta> no index.html,
    // que não tem hash no nome. Quando ele morava dentro do JS, trocar só a
    // data fazia 15 dos 24 arquivos mudarem de nome — e o celular rebaixava o
    // app inteiro a cada publicação. Agora muda só o index.html (2 KB).
    {
      name: "cf-build-stamp",
      transformIndexHtml() {
        return [
          { tag: "meta", attrs: { name: "cf-build", content: buildId }, injectTo: "head" as const },
        ];
      },
    },
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      devOptions: {
        enabled: true,
        type: "module",
        // Sem fallback de app-shell no SW de DEV: páginas de teste (ex.:
        // /test-ir.html) são servidas direto pelo Vite em vez de serem
        // substituídas pelo index.html pelo service worker.
        navigateFallback: undefined,
      },
      includeAssets: [
        "brand-apple-touch.png",
        "brand-icon-192.png",
        "brand-icon-512.png",
        "brand-logo-splash.png",
      ],
      workbox: {
        navigateFallbackDenylist: [/\/site(\/|$)/, /test-ir\.html$/],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        // Sem runtimeCaching: o precache já armazena TODOS os assets essenciais
        // (index.html, JS, CSS, imagens, manifest). Runtime caching redundante
        // causava conflito com o precache e comportamento imprevisível em updates.
        // O precache já é "cache-first" por natureza (assets com hash são imutáveis).
        // cleanupOutdatedCaches limpa automaticamente caches de versões antigas.
      },
      manifestFilename: "manifest.webmanifest",
      manifest: {
        name: "Call ou Fold",
        short_name: "Call ou Fold",
        description:
          "Poker para recreativos. Texas Hold'em e Omaha com ranges profissionais.",
        lang: "pt-BR",
        id: base,
        start_url: base,
        scope: base,
        theme_color: "#14170f",
        background_color: "#0d0f0d",
        display: "standalone",
        orientation: "portrait",
        prefer_related_applications: false,
        icons: [
          {
            src: `${base}brand-icon-192.png`,
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: `${base}brand-icon-512.png`,
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: `${base}brand-icon-512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  worker: {
    format: "es",
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});

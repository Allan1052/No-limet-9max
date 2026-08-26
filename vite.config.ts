/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Caminho base: "/" para domínio customizado calloufold.com.br
// Se voltar para GitHub Pages padrão (allan1052.github.io/No-limet-9max/), mudar para "/No-limet-9max/"
const base = "/";

const buildId = new Date().toISOString();

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
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [
    react(),
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

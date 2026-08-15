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
      output: {
        format: "es",
        // Performance: separa bibliotecas 3ª-partes (react, i18n, workbox) do
        // chunk de aplicação — menos JS reanalisado em cada deploy do app.
        manualChunks: (id) => {
          // vendor: bibliotecas 3ª-partes separadas do chunk de aplicação
          if (id.includes("node_modules") && /(react-dom|react-router-dom|i18next|react-i18next)/.test(id)) {
            return "vendor";
          }
          // workbox (runtime do PWA) e idb ficam junto do vendor — não mudam
          // a cada deploy do app, então o navegador reusa o cache dessas libs
          if (id.includes("node_modules") && /(@remix|workbox|idb|tslib|scheduler|react\/(jsx-)?runtime)/.test(id)) {
            return "vendor";
          }
          if (id.includes("node_modules")) return "vendor-core";
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
      includeAssets: [
        "brand-apple-touch.png",
        "brand-icon-192.png",
        "brand-icon-512.png",
        "brand-logo-splash.png",
      ],
      workbox: {
        navigateFallbackDenylist: [/\/site(\/|$)/],
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

/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Caminho base no GitHub Pages (site de projeto): https://allan1052.github.io/No-limet-9max/
const base = "/No-limet-9max/";

const buildId = new Date().toISOString();

export default defineConfig({
  base,
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        format: "es",
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
        // Estratégia de cache otimizada para GitHub Pages:
        // - HTML: cache-first com cleanup agressivo (evita tela branca quando bundle antigo some)
        // - JS/CSS: cache-first (sempre têm hash, então são seguros)
        // - Imagens: stale-while-revalidate (carrega do cache, atualiza em background)
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/allan1052\.github\.io\/No-limet-9max\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "pwa-runtime-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 dias
              },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/No-limet-9max/assets/"),
            handler: "CacheFirst",
            options: {
              cacheName: "pwa-asset-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias (assets têm hash)
              },
            },
          },
        ],
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

/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Caminho base no GitHub Pages (site de projeto): https://allan1052.github.io/No-limet-9max/
// Precisa bater EXATAMENTE com o nome do repositório (o Pages diferencia
// maiúsculas). Em desenvolvimento (npm run dev) o Vite usa "/".
const base = "/";

const buildId = new Date().toISOString();

export default defineConfig({
  base,
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        // Forçar formato ESM no output
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
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["brand-apple-touch.png", "brand-icon-192.png", "brand-icon-512.png", "brand-logo-splash.png"],
      workbox: {
        navigateFallbackDenylist: [/\/site(\/|$)/],
      },
      manifest: {
        name: "Call ou Fold — Poker para Recreativos",
        short_name: "Call ou Fold",
        description:
          "Poker para recreativos. Comece grátis, sem arriscar dinheiro — aprenda a tomar as decisões certas. O sonho do recreativo.",
        lang: "pt-BR",
        id: base,
        start_url: base,
        scope: base,
        theme_color: "#14170f",
        background_color: "#0d0f0d",
        display: "standalone",
        orientation: "any",
        prefer_related_applications: false,
      },
      icons: [
        { src: "brand-icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "brand-icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "brand-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
      ],
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

/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Caminho base no GitHub Pages (site de projeto): https://<user>.github.io/no-limet-9max/
// Em desenvolvimento (npm run dev) o Vite usa "/".
const base = process.env.NODE_ENV === "production" ? "/no-limet-9max/" : "/";

// Configuração do Vite: React + Web Worker (Monte Carlo fora da UI) + PWA
// (torna o app instalável no celular, com ícone e funcionamento offline).
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "Poker Sim — Estudo NLHE 9-max",
        short_name: "Poker Sim",
        description: "Simulador de estudo de poker NLHE 9-max com bots, feedback e ICM.",
        lang: "pt-BR",
        theme_color: "#14170f",
        background_color: "#0d0f0d",
        display: "standalone",
        orientation: "any",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
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
